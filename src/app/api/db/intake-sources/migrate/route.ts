import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Create intake_sources table - configures how documents come into a workflow
    await pool.query(`
      CREATE TABLE IF NOT EXISTS intake_sources (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        workflow_key VARCHAR(50) NOT NULL,
        source_type VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        config JSONB NOT NULL DEFAULT '{}',
        schedule VARCHAR(50),
        schedule_cron VARCHAR(100),
        enabled BOOLEAN DEFAULT true,
        last_poll_at TIMESTAMP WITH TIME ZONE,
        last_poll_status VARCHAR(50),
        last_poll_message TEXT,
        last_poll_files_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_by VARCHAR(255),
        UNIQUE(client_id, workflow_key, name)
      )
    `);

    // Create intake_jobs table - tracks each poll/sync run
    await pool.query(`
      CREATE TABLE IF NOT EXISTS intake_jobs (
        id SERIAL PRIMARY KEY,
        intake_source_id INTEGER NOT NULL REFERENCES intake_sources(id) ON DELETE CASCADE,
        client_id INTEGER NOT NULL,
        workflow_key VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        trigger_type VARCHAR(50) DEFAULT 'scheduled',
        files_found INTEGER DEFAULT 0,
        files_processed INTEGER DEFAULT 0,
        files_failed INTEGER DEFAULT 0,
        files_skipped INTEGER DEFAULT 0,
        error_message TEXT,
        started_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        duration_ms INTEGER,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create intake_files table - tracks individual files processed
    await pool.query(`
      CREATE TABLE IF NOT EXISTS intake_files (
        id SERIAL PRIMARY KEY,
        intake_job_id INTEGER REFERENCES intake_jobs(id) ON DELETE SET NULL,
        intake_source_id INTEGER NOT NULL REFERENCES intake_sources(id) ON DELETE CASCADE,
        client_id INTEGER NOT NULL,
        workflow_key VARCHAR(50) NOT NULL,
        original_filename VARCHAR(500) NOT NULL,
        stored_filename VARCHAR(500),
        file_path TEXT,
        file_size_bytes BIGINT,
        mime_type VARCHAR(100),
        status VARCHAR(50) DEFAULT 'pending',
        processing_status VARCHAR(50) DEFAULT 'queued',
        target_record_type VARCHAR(50),
        target_record_id INTEGER,
        error_message TEXT,
        metadata JSONB DEFAULT '{}',
        checksum VARCHAR(64),
        processed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create indexes for performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_intake_sources_client_workflow 
      ON intake_sources(client_id, workflow_key)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_intake_jobs_source 
      ON intake_jobs(intake_source_id)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_intake_jobs_status 
      ON intake_jobs(status)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_intake_files_job 
      ON intake_files(intake_job_id)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_intake_files_status 
      ON intake_files(status, processing_status)
    `);

    // Create source_types reference table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS intake_source_types (
        id SERIAL PRIMARY KEY,
        type_key VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        icon VARCHAR(50),
        config_schema JSONB NOT NULL DEFAULT '{}',
        supports_schedule BOOLEAN DEFAULT true,
        supports_test BOOLEAN DEFAULT true,
        enabled BOOLEAN DEFAULT true,
        display_order INTEGER DEFAULT 0
      )
    `);

    // Insert default source types
    await pool.query(`
      INSERT INTO intake_source_types (type_key, name, description, icon, config_schema, supports_schedule, supports_test, display_order)
      VALUES 
        ('manual', 'Manual Upload', 'Single file upload through the dashboard', 'upload', 
         '{"fields": []}', false, false, 1),
        ('bulk_upload', 'Bulk Upload', 'Upload multiple files or ZIP archives at once', 'folder-up',
         '{"fields": [{"key": "max_files", "label": "Max Files Per Upload", "type": "number", "default": 100}, {"key": "allowed_types", "label": "Allowed File Types", "type": "array", "default": ["pdf", "tiff", "png", "jpg"]}]}', false, false, 2),
        ('ftp', 'FTP/SFTP', 'Pull files from an FTP or SFTP server on a schedule', 'server',
         '{"fields": [{"key": "protocol", "label": "Protocol", "type": "select", "options": ["ftp", "sftp"], "required": true}, {"key": "host", "label": "Host", "type": "text", "required": true}, {"key": "port", "label": "Port", "type": "number", "default": 21}, {"key": "username", "label": "Username", "type": "text", "required": true}, {"key": "password", "label": "Password", "type": "password", "required": true}, {"key": "directory", "label": "Remote Directory", "type": "text", "default": "/"}, {"key": "file_pattern", "label": "File Pattern", "type": "text", "default": "*.pdf"}, {"key": "move_after_process", "label": "Move to After Processing", "type": "text"}, {"key": "delete_after_process", "label": "Delete After Processing", "type": "boolean", "default": false}]}', true, true, 3),
        ('s3', 'Amazon S3', 'Watch an S3 bucket for new files', 'cloud',
         '{"fields": [{"key": "bucket", "label": "Bucket Name", "type": "text", "required": true}, {"key": "prefix", "label": "Prefix/Folder", "type": "text", "default": ""}, {"key": "region", "label": "AWS Region", "type": "text", "default": "us-east-1"}, {"key": "access_key_id", "label": "Access Key ID", "type": "text", "required": true}, {"key": "secret_access_key", "label": "Secret Access Key", "type": "password", "required": true}, {"key": "move_after_process", "label": "Move to Prefix After Processing", "type": "text"}, {"key": "delete_after_process", "label": "Delete After Processing", "type": "boolean", "default": false}]}', true, true, 4),
        ('google_drive', 'Google Drive', 'Watch a Google Drive folder for new files', 'hard-drive',
         '{"fields": [{"key": "folder_id", "label": "Folder ID", "type": "text", "required": true}, {"key": "service_account_json", "label": "Service Account JSON", "type": "textarea", "required": true}, {"key": "move_after_process", "label": "Move to Folder ID After Processing", "type": "text"}]}', true, true, 5),
        ('email', 'Email Intake', 'Receive files via a dedicated email address', 'mail',
         '{"fields": [{"key": "email_address", "label": "Intake Email Address", "type": "text", "readonly": true}, {"key": "allowed_senders", "label": "Allowed Sender Domains/Emails", "type": "array", "default": []}, {"key": "subject_pattern", "label": "Subject Pattern (optional)", "type": "text"}, {"key": "attachment_types", "label": "Allowed Attachment Types", "type": "array", "default": ["pdf", "tiff", "png", "jpg"]}]}', false, false, 6),
        ('api', 'API Webhook', 'Receive files via API from external systems', 'webhook',
         '{"fields": [{"key": "webhook_url", "label": "Webhook URL", "type": "text", "readonly": true}, {"key": "api_key", "label": "API Key", "type": "text", "readonly": true}, {"key": "allowed_ips", "label": "Allowed IP Addresses (optional)", "type": "array", "default": []}, {"key": "require_signature", "label": "Require Webhook Signature", "type": "boolean", "default": true}, {"key": "webhook_secret", "label": "Webhook Secret", "type": "text", "readonly": true}]}', false, true, 7),
        ('dropbox', 'Dropbox', 'Watch a Dropbox folder for new files', 'box',
         '{"fields": [{"key": "folder_path", "label": "Folder Path", "type": "text", "required": true}, {"key": "access_token", "label": "Access Token", "type": "password", "required": true}, {"key": "move_after_process", "label": "Move to Path After Processing", "type": "text"}]}', true, true, 8)
      ON CONFLICT (type_key) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        config_schema = EXCLUDED.config_schema,
        supports_schedule = EXCLUDED.supports_schedule,
        supports_test = EXCLUDED.supports_test,
        display_order = EXCLUDED.display_order
    `);

    return NextResponse.json({
      success: true,
      message: 'Intake sources tables created successfully',
      tables: ['intake_sources', 'intake_jobs', 'intake_files', 'intake_source_types']
    });

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Migration failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
