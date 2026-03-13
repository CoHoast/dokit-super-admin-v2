/**
 * SFTP Pickup Service
 * 
 * Handles secure file transfer from MCO's SFTP server.
 * Picks up flagged bills daily and processes through the Bill Negotiator pipeline.
 */

import SftpClient from 'ssh2-sftp-client';
import { Pool } from 'pg';
import { createReadStream, promises as fs } from 'fs';
import { join } from 'path';
import { RetryQueueService } from '../lib/retry-queue';
import { encryptBillPHI } from '../lib/encryption';

// Configuration interface
export interface SftpConfig {
  host: string;
  port: number;
  username: string;
  privateKey?: string;
  password?: string;
  incomingPath: string;
  processedPath: string;
  errorsPath: string;
}

// Pickup result
export interface PickupResult {
  success: boolean;
  startTime: string;
  endTime: string;
  duration: number;
  filesFound: number;
  filesProcessed: number;
  filesErrored: number;
  errors: string[];
}

// Bill metadata from JSON sidecar
export interface BillMetadata {
  claim_id?: string;
  member_id?: string;
  member_name?: string;
  provider_npi?: string;
  provider_name?: string;
  provider_tin?: string;
  date_of_service?: string;
  total_billed?: number;
  place_of_service?: string;
  claim_type?: string;
  priority?: string;
  notes?: string;
}

/**
 * SFTP Pickup Service
 */
export class SftpPickupService {
  private pool: Pool;
  private retryQueue: RetryQueueService;
  private config: SftpConfig;
  private clientId: number;
  private tempDir: string;

  constructor(pool: Pool, clientId: number, config: SftpConfig) {
    this.pool = pool;
    this.clientId = clientId;
    this.config = config;
    this.retryQueue = new RetryQueueService(pool);
    this.tempDir = process.env.TEMP_DIR || '/tmp/sirkl-sftp';
  }

  /**
   * Load config from environment for a client
   */
  static getConfigFromEnv(clientSlug: string): SftpConfig {
    const prefix = `SFTP_${clientSlug.toUpperCase()}_`;
    
    return {
      host: process.env[`${prefix}HOST`] || '',
      port: parseInt(process.env[`${prefix}PORT`] || '22'),
      username: process.env[`${prefix}USERNAME`] || '',
      privateKey: process.env[`${prefix}PRIVATE_KEY`],
      password: process.env[`${prefix}PASSWORD`],
      incomingPath: process.env[`${prefix}INCOMING_PATH`] || '/incoming/bills/',
      processedPath: process.env[`${prefix}PROCESSED_PATH`] || '/processed/bills/',
      errorsPath: process.env[`${prefix}ERRORS_PATH`] || '/errors/bills/'
    };
  }

  /**
   * Run the pickup process
   */
  async pickup(): Promise<PickupResult> {
    const startTime = new Date();
    const result: PickupResult = {
      success: true,
      startTime: startTime.toISOString(),
      endTime: '',
      duration: 0,
      filesFound: 0,
      filesProcessed: 0,
      filesErrored: 0,
      errors: []
    };

    const sftp = new SftpClient();

    try {
      // Ensure temp directory exists
      await fs.mkdir(this.tempDir, { recursive: true });

      // Connect to SFTP
      console.log(`[SFTP] Connecting to ${this.config.host}:${this.config.port}...`);
      
      await sftp.connect({
        host: this.config.host,
        port: this.config.port,
        username: this.config.username,
        privateKey: this.config.privateKey,
        password: this.config.password,
        readyTimeout: 30000,
        retries: 3,
        retry_minTimeout: 2000
      });

      console.log(`[SFTP] Connected successfully`);

      // List files in incoming directory
      const files = await sftp.list(this.config.incomingPath);
      const billFiles = files.filter(f => 
        f.type === '-' && this.isSupportedFile(f.name)
      );

      result.filesFound = billFiles.length;
      console.log(`[SFTP] Found ${billFiles.length} bill files`);

      // Process each file
      for (const file of billFiles) {
        const filePath = join(this.config.incomingPath, file.name);
        
        try {
          // Download file
          const localPath = join(this.tempDir, file.name);
          await sftp.fastGet(filePath, localPath);
          console.log(`[SFTP] Downloaded: ${file.name}`);

          // Try to get metadata JSON
          let metadata: BillMetadata | null = null;
          const metaFileName = file.name.replace(/\.[^.]+$/, '.json');
          const metaFilePath = join(this.config.incomingPath, metaFileName);
          
          try {
            if (await this.fileExists(sftp, metaFilePath)) {
              const metaBuffer = await sftp.get(metaFilePath) as Buffer;
              metadata = JSON.parse(metaBuffer.toString('utf8'));
              console.log(`[SFTP] Found metadata for ${file.name}`);
            }
          } catch (metaError) {
            // Metadata is optional
            console.log(`[SFTP] No metadata for ${file.name}, will extract from document`);
          }

          // Create bill record and queue for processing
          const billId = await this.createBillRecord(file.name, localPath, metadata);
          
          // Queue for extraction
          await this.retryQueue.addJob({
            jobType: 'bill_extraction',
            payload: { 
              billId, 
              filePath: localPath,
              hasMetadata: !!metadata 
            },
            clientId: this.clientId,
            billId
          });

          // Move to processed
          const processedPath = join(this.config.processedPath, file.name);
          await sftp.rename(filePath, processedPath);
          
          if (metadata) {
            const processedMetaPath = join(this.config.processedPath, metaFileName);
            try {
              await sftp.rename(metaFilePath, processedMetaPath);
            } catch {}
          }

          // Clean up local temp file
          await fs.unlink(localPath);

          result.filesProcessed++;
          console.log(`[SFTP] Processed: ${file.name} -> Bill #${billId}`);

        } catch (fileError: any) {
          result.filesErrored++;
          result.errors.push(`${file.name}: ${fileError.message}`);
          console.error(`[SFTP] Error processing ${file.name}:`, fileError.message);

          // Move to errors directory
          try {
            const errorPath = join(this.config.errorsPath, file.name);
            await sftp.rename(filePath, errorPath);
          } catch (moveError) {
            console.error(`[SFTP] Could not move ${file.name} to errors:`, moveError);
          }
        }
      }

    } catch (error: any) {
      result.success = false;
      result.errors.push(`Connection error: ${error.message}`);
      console.error('[SFTP] Fatal error:', error);
    } finally {
      // Always close connection
      try {
        await sftp.end();
      } catch {}
    }

    const endTime = new Date();
    result.endTime = endTime.toISOString();
    result.duration = endTime.getTime() - startTime.getTime();

    // Log summary
    console.log(`[SFTP] Pickup complete: ${result.filesProcessed}/${result.filesFound} processed, ${result.filesErrored} errors, ${result.duration}ms`);

    return result;
  }

  /**
   * Test SFTP connection
   */
  async testConnection(): Promise<{
    success: boolean;
    error?: string;
    directories?: {
      incoming: { exists: boolean; fileCount: number };
      processed: { exists: boolean };
      errors: { exists: boolean };
    };
  }> {
    const sftp = new SftpClient();

    try {
      await sftp.connect({
        host: this.config.host,
        port: this.config.port,
        username: this.config.username,
        privateKey: this.config.privateKey,
        password: this.config.password,
        readyTimeout: 10000
      });

      const directories = {
        incoming: { exists: false, fileCount: 0 },
        processed: { exists: false },
        errors: { exists: false }
      };

      // Check incoming
      try {
        const files = await sftp.list(this.config.incomingPath);
        directories.incoming.exists = true;
        directories.incoming.fileCount = files.filter(f => this.isSupportedFile(f.name)).length;
      } catch {}

      // Check processed
      try {
        await sftp.list(this.config.processedPath);
        directories.processed.exists = true;
      } catch {}

      // Check errors
      try {
        await sftp.list(this.config.errorsPath);
        directories.errors.exists = true;
      } catch {}

      await sftp.end();

      return { success: true, directories };

    } catch (error: any) {
      try { await sftp.end(); } catch {}
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if file exists on SFTP
   */
  private async fileExists(sftp: SftpClient, path: string): Promise<boolean> {
    try {
      await sftp.stat(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if file is a supported bill format
   */
  private isSupportedFile(filename: string): boolean {
    const ext = filename.toLowerCase().split('.').pop();
    return ['pdf', 'jpg', 'jpeg', 'png', 'tiff', 'tif'].includes(ext || '');
  }

  /**
   * Create a bill record in the database
   */
  private async createBillRecord(
    filename: string,
    localPath: string,
    metadata: BillMetadata | null
  ): Promise<number> {
    // Read file for S3 upload (TODO: implement S3 upload)
    const fileBuffer = await fs.readFile(localPath);
    const fileSize = fileBuffer.length;

    // Encrypt PHI fields if metadata provided
    let encryptedFields = {};
    if (metadata?.member_name || metadata?.member_id) {
      // Generate a temporary bill ID for encryption context
      const tempBillId = `temp-${Date.now()}`;
      encryptedFields = await encryptBillPHI(tempBillId, {
        patientName: metadata?.member_name,
        memberId: metadata?.member_id
      });
    }

    // Insert bill record
    const result = await this.pool.query(`
      INSERT INTO bills (
        client_id,
        external_claim_id,
        member_id,
        member_name,
        provider_npi,
        provider_name,
        provider_tin,
        date_of_service,
        total_billed,
        place_of_service,
        source,
        source_file,
        source_file_size,
        status,
        phi_encrypted,
        encrypted_fields,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        'sftp', $11, $12, 'received', $13, $14,
        NOW(), NOW()
      )
      RETURNING id
    `, [
      this.clientId,
      metadata?.claim_id,
      metadata?.member_id,
      metadata?.member_name,
      metadata?.provider_npi,
      metadata?.provider_name,
      metadata?.provider_tin,
      metadata?.date_of_service,
      metadata?.total_billed,
      metadata?.place_of_service,
      filename,
      fileSize,
      Object.keys(encryptedFields).length > 0,
      JSON.stringify(encryptedFields)
    ]);

    const billId = result.rows[0].id;

    // Update encryption context with real bill ID
    if (Object.keys(encryptedFields).length > 0) {
      const realEncrypted = await encryptBillPHI(billId.toString(), {
        patientName: metadata?.member_name,
        memberId: metadata?.member_id
      });
      await this.pool.query(`
        UPDATE bills SET encrypted_fields = $1 WHERE id = $2
      `, [JSON.stringify(realEncrypted), billId]);
    }

    // Log audit entry
    await this.pool.query(`
      INSERT INTO audit_log (
        action, resource_type, resource_id, client_id,
        details, ip_address, created_at
      ) VALUES (
        'bill_received', 'bill', $1, $2,
        $3, 'sftp-pickup', NOW()
      )
    `, [
      billId,
      this.clientId,
      JSON.stringify({ filename, source: 'sftp', hasMetadata: !!metadata })
    ]);

    return billId;
  }
}

/**
 * Schedule daily SFTP pickup
 */
export function scheduleSftpPickup(
  pool: Pool,
  clientId: number,
  clientSlug: string,
  schedule: string = '0 6 * * *' // 6 AM daily
): void {
  // This would integrate with the cron processor
  // For now, just log that it would be scheduled
  console.log(`[SFTP] Would schedule pickup for ${clientSlug} at ${schedule}`);
}
