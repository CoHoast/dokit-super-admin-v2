import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import crypto from 'crypto';

// POST - Receive files via webhook from external systems
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string; workflowKey: string }> }
) {
  try {
    const { clientId, workflowKey } = await params;

    // Get API key from header
    const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
    const signature = request.headers.get('x-webhook-signature');

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Missing API key' },
        { status: 401 }
      );
    }

    // Find the API intake source for this client/workflow
    const sourceResult = await pool.query(`
      SELECT id, config, enabled
      FROM intake_sources
      WHERE client_id = $1 AND workflow_key = $2 AND source_type = 'api' AND enabled = true
      LIMIT 1
    `, [parseInt(clientId), workflowKey]);

    if (sourceResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No API intake source configured for this client/workflow' },
        { status: 404 }
      );
    }

    const source = sourceResult.rows[0];
    const config = source.config;

    // Validate API key
    if (config.api_key !== apiKey) {
      return NextResponse.json(
        { success: false, error: 'Invalid API key' },
        { status: 401 }
      );
    }

    // Validate IP if configured
    if (config.allowed_ips && config.allowed_ips.length > 0) {
      const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                       request.headers.get('x-real-ip') || 
                       'unknown';
      
      const isAllowed = config.allowed_ips.some((allowedIp: string) => {
        if (allowedIp.includes('/')) {
          // CIDR notation - simplified check
          return clientIp.startsWith(allowedIp.split('/')[0].split('.').slice(0, 3).join('.'));
        }
        return allowedIp === clientIp;
      });

      if (!isAllowed) {
        return NextResponse.json(
          { success: false, error: 'IP not allowed' },
          { status: 403 }
        );
      }
    }

    // Validate webhook signature if required
    if (config.require_signature && config.webhook_secret) {
      const body = await request.clone().text();
      const expectedSignature = crypto
        .createHmac('sha256', config.webhook_secret)
        .update(body)
        .digest('hex');

      if (!signature || signature !== `sha256=${expectedSignature}`) {
        return NextResponse.json(
          { success: false, error: 'Invalid webhook signature' },
          { status: 401 }
        );
      }
    }

    // Parse the request body
    const contentType = request.headers.get('content-type') || '';
    let files: { name: string; content: string; mimeType: string }[] = [];
    let metadata: Record<string, unknown> = {};

    if (contentType.includes('multipart/form-data')) {
      // Handle multipart file upload
      const formData = await request.formData();
      const uploadedFiles = formData.getAll('files') as File[];
      
      for (const file of uploadedFiles) {
        const bytes = await file.arrayBuffer();
        files.push({
          name: file.name,
          content: Buffer.from(bytes).toString('base64'),
          mimeType: file.type || 'application/octet-stream'
        });
      }
      
      const metadataStr = formData.get('metadata') as string;
      if (metadataStr) {
        try {
          metadata = JSON.parse(metadataStr);
        } catch {}
      }
    } else {
      // Handle JSON payload with base64 files
      const body = await request.json();
      files = body.files || [];
      metadata = body.metadata || {};
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No files provided' },
        { status: 400 }
      );
    }

    // Create intake job
    const jobResult = await pool.query(`
      INSERT INTO intake_jobs (
        intake_source_id, client_id, workflow_key,
        status, trigger_type, files_found, started_at, metadata
      )
      VALUES ($1, $2, $3, 'processing', 'webhook', $4, NOW(), $5)
      RETURNING id
    `, [source.id, parseInt(clientId), workflowKey, files.length, JSON.stringify(metadata)]);

    const jobId = jobResult.rows[0].id;

    // Process files
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
        const buffer = Buffer.from(file.content, 'base64');
        const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

        // Check for duplicate
        const duplicateCheck = await pool.query(`
          SELECT id FROM intake_files 
          WHERE client_id = $1 AND workflow_key = $2 AND checksum = $3 AND status != 'failed'
          LIMIT 1
        `, [parseInt(clientId), workflowKey, checksum]);

        if (duplicateCheck.rows.length > 0) {
          results.push({
            filename: file.name,
            status: 'error',
            error: 'Duplicate file'
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
          source.id,
          parseInt(clientId),
          workflowKey,
          file.name,
          buffer.length,
          file.mimeType,
          checksum,
          JSON.stringify({ ...metadata, webhookReceived: new Date().toISOString() })
        ]);

        const fileId = fileResult.rows[0].id;

        // Create workflow-specific record
        let recordId = null;
        if (workflowKey === 'bill-negotiator') {
          const billResult = await pool.query(`
            INSERT INTO bills (
              client_id, status, source_file_id, source_filename,
              received_at, notes
            )
            VALUES ($1, 'received', $2, $3, NOW(), 'Received via API webhook')
            RETURNING id
          `, [parseInt(clientId), fileId, file.name]);
          
          recordId = billResult.rows[0].id;

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
        console.error(`Error processing webhook file ${file.name}:`, err);
        results.push({
          filename: file.name,
          status: 'error',
          error: err instanceof Error ? err.message : 'Processing failed'
        });
        failedCount++;
      }
    }

    // Update job status
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

    // Update source status
    await pool.query(`
      UPDATE intake_sources 
      SET last_poll_at = NOW(), 
          last_poll_status = $1,
          last_poll_message = $2,
          last_poll_files_count = $3
      WHERE id = $4
    `, [
      failedCount === files.length ? 'failed' : 'success',
      `Webhook: ${processedCount} files processed, ${failedCount} failed`,
      processedCount,
      source.id
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
    console.error('Webhook error:', error);
    return NextResponse.json(
      { success: false, error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// GET - Webhook health check / info
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string; workflowKey: string }> }
) {
  const { clientId, workflowKey } = await params;

  return NextResponse.json({
    success: true,
    message: 'DOKit Intake Webhook',
    client_id: clientId,
    workflow_key: workflowKey,
    methods: ['POST'],
    headers: {
      required: ['x-api-key OR Authorization: Bearer <key>'],
      optional: ['x-webhook-signature (sha256=<hmac>)']
    },
    payload: {
      multipart: 'files[] + metadata (optional JSON string)',
      json: '{ files: [{ name, content (base64), mimeType }], metadata: {} }'
    }
  });
}
