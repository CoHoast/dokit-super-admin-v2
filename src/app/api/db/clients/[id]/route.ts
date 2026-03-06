import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// GET single client with workflows
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get client details
    const clientResult = await pool.query(`
      SELECT * FROM clients WHERE id = $1
    `, [id]);

    if (clientResult.rows.length === 0) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const client = clientResult.rows[0];

    // Get client workflows
    const workflowsResult = await pool.query(`
      SELECT workflow_type, enabled, config 
      FROM client_workflows 
      WHERE client_id = $1
    `, [id]);

    // Get stats
    const statsResult = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM documents WHERE client_id = $1) as total_documents,
        (SELECT COUNT(*) FROM documents WHERE client_id = $1 AND created_at >= CURRENT_DATE) as documents_today,
        (SELECT COUNT(*) FROM applications WHERE client_id = $1) as total_applications,
        (SELECT COUNT(*) FROM claims WHERE client_id = $1) as total_claims
    `, [id]);

    const stats = statsResult.rows[0] || {};

    return NextResponse.json({
      client: {
        id: client.id,
        name: client.name,
        slug: client.slug,
        status: client.status,
        contactEmail: client.contact_email,
        contactName: client.contact_name,
        contactPhone: client.contact_phone,
        addressLine1: client.address_line1,
        addressLine2: client.address_line2,
        city: client.city,
        state: client.state,
        zipCode: client.zip_code,
        billingPlan: client.billing_plan,
        monthlyPrice: client.monthly_price,
        billingEmail: client.billing_email,
        billingStartDate: client.billing_start_date,
        webhookUrl: client.webhook_url,
        s3InputPrefix: client.s3_input_prefix,
        s3OutputPrefix: client.s3_output_prefix,
        notes: client.notes,
        createdAt: client.created_at,
        updatedAt: client.updated_at,
      },
      workflows: workflowsResult.rows.map(w => ({
        type: w.workflow_type,
        enabled: w.enabled,
        config: w.config
      })),
      stats: {
        totalDocuments: parseInt(stats.total_documents) || 0,
        documentsToday: parseInt(stats.documents_today) || 0,
        totalApplications: parseInt(stats.total_applications) || 0,
        totalClaims: parseInt(stats.total_claims) || 0,
      }
    });
  } catch (error: any) {
    console.error('Error fetching client:', error);
    return NextResponse.json({ error: 'Failed to fetch client' }, { status: 500 });
  }
}

// PUT update client
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      name,
      contactEmail,
      contactName,
      contactPhone,
      addressLine1,
      addressLine2,
      city,
      state,
      zipCode,
      billingPlan,
      monthlyPrice,
      billingEmail,
      billingStartDate,
      webhookUrl,
      s3InputPrefix,
      s3OutputPrefix,
      notes,
      status
    } = body;

    const result = await pool.query(`
      UPDATE clients SET
        name = COALESCE($1, name),
        contact_email = $2,
        contact_name = $3,
        contact_phone = $4,
        address_line1 = $5,
        address_line2 = $6,
        city = $7,
        state = $8,
        zip_code = $9,
        billing_plan = $10,
        monthly_price = $11,
        billing_email = $12,
        billing_start_date = $13,
        webhook_url = $14,
        s3_input_prefix = $15,
        s3_output_prefix = $16,
        notes = $17,
        status = COALESCE($18, status),
        updated_at = NOW()
      WHERE id = $19
      RETURNING *
    `, [
      name,
      contactEmail,
      contactName,
      contactPhone,
      addressLine1,
      addressLine2,
      city,
      state,
      zipCode,
      billingPlan,
      monthlyPrice,
      billingEmail,
      billingStartDate,
      webhookUrl,
      s3InputPrefix,
      s3OutputPrefix,
      notes,
      status,
      id
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, client: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating client:', error);
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });
  }
}
