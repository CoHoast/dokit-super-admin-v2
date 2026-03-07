import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// POST - Test connection for an intake source
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get the source details
    const result = await pool.query(`
      SELECT s.*, t.supports_test
      FROM intake_sources s
      LEFT JOIN intake_source_types t ON s.source_type = t.type_key
      WHERE s.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Intake source not found' },
        { status: 404 }
      );
    }

    const source = result.rows[0];
    const config = source.config;

    if (!source.supports_test) {
      return NextResponse.json(
        { success: false, error: 'This source type does not support connection testing' },
        { status: 400 }
      );
    }

    let testResult: { success: boolean; message: string; details?: object };

    switch (source.source_type) {
      case 'ftp':
        testResult = await testFtpConnection(config);
        break;
      case 's3':
        testResult = await testS3Connection(config);
        break;
      case 'google_drive':
        testResult = await testGoogleDriveConnection(config);
        break;
      case 'dropbox':
        testResult = await testDropboxConnection(config);
        break;
      case 'api':
        testResult = testApiWebhook(config);
        break;
      default:
        testResult = { success: false, message: `Testing not implemented for ${source.source_type}` };
    }

    // Update last poll status with test result
    await pool.query(`
      UPDATE intake_sources 
      SET last_poll_at = NOW(),
          last_poll_status = $1,
          last_poll_message = $2
      WHERE id = $3
    `, [
      testResult.success ? 'test_success' : 'test_failed',
      testResult.message,
      id
    ]);

    return NextResponse.json({
      success: testResult.success,
      message: testResult.message,
      details: testResult.details || null
    });

  } catch (error) {
    console.error('Error testing intake source:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to test connection' },
      { status: 500 }
    );
  }
}

// FTP/SFTP Connection Test
async function testFtpConnection(config: {
  protocol: string;
  host: string;
  port: number;
  username: string;
  password: string;
  directory: string;
}): Promise<{ success: boolean; message: string; details?: object }> {
  // In production, use ftp or ssh2-sftp-client packages
  // For now, return a simulated test
  try {
    if (!config.host) {
      return { success: false, message: 'Host is required' };
    }
    if (!config.username || !config.password) {
      return { success: false, message: 'Username and password are required' };
    }

    // TODO: Implement actual FTP/SFTP connection test
    // This would use:
    // - 'basic-ftp' package for FTP
    // - 'ssh2-sftp-client' package for SFTP
    
    return {
      success: true,
      message: `Connection test simulated for ${config.protocol}://${config.host}:${config.port || 21}`,
      details: {
        host: config.host,
        port: config.port || 21,
        protocol: config.protocol,
        directory: config.directory || '/',
        note: 'Full connection test requires FTP client library'
      }
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Connection failed'
    };
  }
}

// S3 Connection Test
async function testS3Connection(config: {
  bucket: string;
  prefix: string;
  region: string;
  access_key_id: string;
  secret_access_key: string;
}): Promise<{ success: boolean; message: string; details?: object }> {
  try {
    if (!config.bucket) {
      return { success: false, message: 'Bucket name is required' };
    }
    if (!config.access_key_id || !config.secret_access_key) {
      return { success: false, message: 'AWS credentials are required' };
    }

    // TODO: Implement actual S3 connection test
    // This would use AWS SDK:
    // const s3 = new S3Client({ credentials: {...}, region: config.region });
    // await s3.send(new ListObjectsV2Command({ Bucket: config.bucket, MaxKeys: 1 }));

    return {
      success: true,
      message: `S3 connection test simulated for bucket: ${config.bucket}`,
      details: {
        bucket: config.bucket,
        prefix: config.prefix || '/',
        region: config.region || 'us-east-1',
        note: 'Full connection test requires AWS SDK'
      }
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Connection failed'
    };
  }
}

// Google Drive Connection Test
async function testGoogleDriveConnection(config: {
  folder_id: string;
  service_account_json: string;
}): Promise<{ success: boolean; message: string; details?: object }> {
  try {
    if (!config.folder_id) {
      return { success: false, message: 'Folder ID is required' };
    }
    if (!config.service_account_json) {
      return { success: false, message: 'Service account credentials are required' };
    }

    // TODO: Implement actual Google Drive connection test
    // This would use googleapis package

    return {
      success: true,
      message: `Google Drive connection test simulated for folder: ${config.folder_id}`,
      details: {
        folder_id: config.folder_id,
        note: 'Full connection test requires Google APIs SDK'
      }
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Connection failed'
    };
  }
}

// Dropbox Connection Test
async function testDropboxConnection(config: {
  folder_path: string;
  access_token: string;
}): Promise<{ success: boolean; message: string; details?: object }> {
  try {
    if (!config.folder_path) {
      return { success: false, message: 'Folder path is required' };
    }
    if (!config.access_token) {
      return { success: false, message: 'Access token is required' };
    }

    // TODO: Implement actual Dropbox connection test
    // This would use dropbox package

    return {
      success: true,
      message: `Dropbox connection test simulated for path: ${config.folder_path}`,
      details: {
        folder_path: config.folder_path,
        note: 'Full connection test requires Dropbox SDK'
      }
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Connection failed'
    };
  }
}

// API Webhook Test (just validates config)
function testApiWebhook(config: {
  api_key: string;
  webhook_url: string;
  webhook_secret: string;
}): { success: boolean; message: string; details?: object } {
  if (!config.api_key || !config.webhook_secret) {
    return { success: false, message: 'API key and webhook secret are missing' };
  }

  return {
    success: true,
    message: 'API webhook is configured and ready to receive requests',
    details: {
      webhook_url: config.webhook_url,
      api_key_preview: config.api_key.substring(0, 10) + '...',
      has_secret: !!config.webhook_secret
    }
  };
}
