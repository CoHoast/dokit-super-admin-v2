import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import crypto from 'crypto';

// POST - Handle bulk file upload for intake
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const clientId = formData.get('clientId') as string;
    const workflowKey = formData.get('workflowKey') as string;
    const sourceId = formData.get('sourceId') as string;
    const files = formData.getAll('files') as File[];

    if (!clientId || !workflowKey) {
      return NextResponse.json(
        { success: false, error: 'Missing clientId or workflowKey' },
        { status: 400 }
      );
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No files provided' },
        { status: 400 }
      );
    }

    // Get or create a default manual upload source if no sourceId provided
    let intakeSourceId = sourceId ? parseInt(sourceId) : null;
    
    if (!intakeSourceId) {
      // Check for existing manual upload source
      const existingSource = await pool.query(`
        SELECT id FROM intake_sources 
        WHERE client_id = $1 AND workflow_key = $2 AND source_type = 'manual'
        LIMIT 1
      `, [parseInt(clientId), workflowKey]);

      if (existingSource.rows.length > 0) {
        intakeSourceId = existingSource.rows[0].id;
      } else {
        // Create a default manual source
        const newSource = await pool.query(`
          INSERT INTO intake_sources (client_id, workflow_key, source_type, name, config)
          VALUES ($1, $2, 'manual', 'Manual Upload', '{}')
          RETURNING id
        `, [parseInt(clientId), workflowKey]);
        intakeSourceId = newSource.rows[0].id;
      }
    }

    // Create an intake job for this batch
    const jobResult = await pool.query(`
      INSERT INTO intake_jobs (
        intake_source_id, client_id, workflow_key, 
        status, trigger_type, files_found, started_at
      )
      VALUES ($1, $2, $3, 'processing', 'manual', $4, NOW())
      RETURNING id
    `, [intakeSourceId, parseInt(clientId), workflowKey, files.length]);

    const jobId = jobResult.rows[0].id;

    // Process each file
    const results: {
      filename: string;
      status: 'success' | 'error';
      fileId?: number;
      recordId?: number;
      error?: string;
    }[] = [];

    let processedCount = 0;
    let failedCount = 0;

    for (const file of files) {
      try {
        // Read file content
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        // Generate checksum to detect duplicates
        const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

        // Check for duplicate (same file already processed)
        const duplicateCheck = await pool.query(`
          SELECT id FROM intake_files 
          WHERE client_id = $1 AND workflow_key = $2 AND checksum = $3 AND status != 'failed'
          LIMIT 1
        `, [parseInt(clientId), workflowKey, checksum]);

        if (duplicateCheck.rows.length > 0) {
          results.push({
            filename: file.name,
            status: 'error',
            error: 'Duplicate file already processed'
          });
          failedCount++;
          continue;
        }

        // Insert file record
        const fileResult = await pool.query(`
          INSERT INTO intake_files (
            intake_job_id, intake_source_id, client_id, workflow_key,
            original_filename, file_size_bytes, mime_type,
            status, processing_status, checksum, metadata
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, 'received', 'queued', $8, $9)
          RETURNING id
        `, [
          jobId,
          intakeSourceId,
          parseInt(clientId),
          workflowKey,
          file.name,
          buffer.length,
          file.type || 'application/octet-stream',
          checksum,
          JSON.stringify({ uploadedAt: new Date().toISOString() })
        ]);

        const fileId = fileResult.rows[0].id;

        // For bill-negotiator workflow, create a bill record
        let recordId = null;
        if (workflowKey === 'bill-negotiator') {
          const billResult = await pool.query(`
            INSERT INTO bills (
              client_id, status, source_file_id, source_filename,
              received_at, notes
            )
            VALUES ($1, 'received', $2, $3, NOW(), 'Uploaded via bulk intake')
            RETURNING id
          `, [parseInt(clientId), fileId, file.name]);
          
          recordId = billResult.rows[0].id;

          // Update file with target record
          await pool.query(`
            UPDATE intake_files 
            SET target_record_type = 'bill', target_record_id = $1, processing_status = 'pending_analysis'
            WHERE id = $2
          `, [recordId, fileId]);
        }

        results.push({
          filename: file.name,
          status: 'success',
          fileId,
          recordId
        });
        processedCount++;

      } catch (err) {
        console.error(`Error processing file ${file.name}:`, err);
        results.push({
          filename: file.name,
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error'
        });
        failedCount++;
      }
    }

    // Update job with final status
    await pool.query(`
      UPDATE intake_jobs 
      SET status = $1, files_processed = $2, files_failed = $3, completed_at = NOW(),
          duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000
      WHERE id = $4
    `, [
      failedCount === files.length ? 'failed' : (failedCount > 0 ? 'partial' : 'completed'),
      processedCount,
      failedCount,
      jobId
    ]);

    // Update intake source last poll info
    await pool.query(`
      UPDATE intake_sources 
      SET last_poll_at = NOW(), 
          last_poll_status = $1,
          last_poll_message = $2,
          last_poll_files_count = $3
      WHERE id = $4
    `, [
      failedCount === files.length ? 'failed' : 'success',
      `Processed ${processedCount} files, ${failedCount} failed`,
      processedCount,
      intakeSourceId
    ]);

    return NextResponse.json({
      success: true,
      jobId,
      summary: {
        total: files.length,
        processed: processedCount,
        failed: failedCount
      },
      results
    });

  } catch (error) {
    console.error('Bulk upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process upload' },
      { status: 500 }
    );
  }
}

// GET - Get upload status/job details
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const clientId = searchParams.get('clientId');
    const workflowKey = searchParams.get('workflowKey');

    if (jobId) {
      // Get specific job with files
      const result = await pool.query(`
        SELECT 
          j.*,
          s.name as source_name,
          s.source_type,
          (
            SELECT json_agg(f ORDER BY f.created_at)
            FROM intake_files f
            WHERE f.intake_job_id = j.id
          ) as files
        FROM intake_jobs j
        LEFT JOIN intake_sources s ON j.intake_source_id = s.id
        WHERE j.id = $1
      `, [jobId]);

      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Job not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        job: result.rows[0]
      });
    }

    // List recent jobs
    let query = `
      SELECT 
        j.*,
        s.name as source_name,
        s.source_type
      FROM intake_jobs j
      LEFT JOIN intake_sources s ON j.intake_source_id = s.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (clientId) {
      query += ` AND j.client_id = $${paramIndex++}`;
      params.push(parseInt(clientId));
    }
    if (workflowKey) {
      query += ` AND j.workflow_key = $${paramIndex++}`;
      params.push(workflowKey);
    }

    query += ` ORDER BY j.created_at DESC LIMIT 50`;

    const result = await pool.query(query, params);

    return NextResponse.json({
      success: true,
      jobs: result.rows
    });

  } catch (error) {
    console.error('Error fetching upload status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch upload status' },
      { status: 500 }
    );
  }
}
