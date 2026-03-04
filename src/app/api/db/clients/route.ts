import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
  try {
    // Get all clients - simplified query that works with current schema
    const result = await pool.query(`
      SELECT 
        c.id,
        c.name,
        c.slug,
        c.status,
        c.contact_email,
        c.created_at,
        c.updated_at
      FROM clients c
      ORDER BY c.name ASC
    `);

    const clients = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      status: row.status || 'active',
      contactEmail: row.contact_email,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      stats: {
        totalDocuments: 0,
        documentsToday: 0,
        documentsThisWeek: 0,
        documentsThisMonth: 0,
        totalApplications: 0,
        totalClaims: 0,
        activeWorkflows: 5
      }
    }));

    return NextResponse.json({ clients });
  } catch (error: any) {
    console.error('Error fetching clients:', error?.message || error);
    console.error('DATABASE_URL set:', !!process.env.DATABASE_URL);
    return NextResponse.json({ 
      error: 'Failed to fetch clients', 
      details: error?.message || 'Unknown error',
      dbConfigured: !!process.env.DATABASE_URL 
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, slug, contactEmail, notes, webhookUrl, s3InputPrefix, s3OutputPrefix } = await request.json();

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
    }

    // Generate a random API key for webhook authentication
    const crypto = await import('crypto');
    const webhookApiKey = crypto.randomBytes(32).toString('base64url');

    const result = await pool.query(`
      INSERT INTO clients (name, slug, status, contact_email, notes, webhook_url, webhook_api_key, s3_input_prefix, s3_output_prefix)
      VALUES ($1, $2, 'active', $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [name, slug, contactEmail || null, notes || null, webhookUrl || null, webhookApiKey, s3InputPrefix || `${slug}/incoming/`, s3OutputPrefix || `${slug}/processed/`]);

    return NextResponse.json({ client: result.rows[0], webhookApiKey });
  } catch (error: any) {
    console.error('Error creating client:', error);
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A client with this slug already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}
