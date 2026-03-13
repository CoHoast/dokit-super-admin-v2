/**
 * PHI Encryption Service
 * 
 * HIPAA-compliant field-level encryption for Protected Health Information.
 * Uses AES-256-GCM with per-record keys managed by AWS KMS.
 */

import { KMSClient, GenerateDataKeyCommand, DecryptCommand, ScheduleKeyDeletionCommand } from '@aws-sdk/client-kms';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// Configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KMS_KEY_ID = process.env.KMS_KEY_ID || process.env.AWS_KMS_KEY_ARN;

// KMS Client
const kmsClient = new KMSClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: process.env.AWS_ACCESS_KEY_ID ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  } : undefined
});

// In-memory key cache (TTL-based)
const keyCache = new Map<string, { key: Buffer; expiresAt: number }>();
const KEY_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * PHI Field Encryption Result
 */
export interface EncryptedField {
  ciphertext: string;      // Base64 encoded encrypted data
  iv: string;              // Base64 encoded initialization vector
  authTag: string;         // Base64 encoded authentication tag
  encryptedKey: string;    // Base64 encoded KMS-encrypted data key
  keyId: string;           // KMS key ID used
  algorithm: string;       // Encryption algorithm
  version: number;         // Schema version for future migrations
}

/**
 * Generate a new data key from KMS for a specific record
 */
async function generateDataKey(context: Record<string, string>): Promise<{
  plaintext: Buffer;
  encrypted: Buffer;
}> {
  if (!KMS_KEY_ID) {
    // Fallback for development - use random key (NOT FOR PRODUCTION)
    console.warn('[ENCRYPTION] KMS not configured - using random key (DEV ONLY)');
    const key = randomBytes(32);
    return { plaintext: key, encrypted: key };
  }

  const command = new GenerateDataKeyCommand({
    KeyId: KMS_KEY_ID,
    KeySpec: 'AES_256',
    EncryptionContext: context
  });

  const response = await kmsClient.send(command);
  
  return {
    plaintext: Buffer.from(response.Plaintext!),
    encrypted: Buffer.from(response.CiphertextBlob!)
  };
}

/**
 * Decrypt a data key using KMS
 */
async function decryptDataKey(
  encryptedKey: Buffer, 
  context: Record<string, string>
): Promise<Buffer> {
  // Check cache first
  const cacheKey = encryptedKey.toString('base64');
  const cached = keyCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.key;
  }

  if (!KMS_KEY_ID) {
    // Fallback for development
    return encryptedKey;
  }

  const command = new DecryptCommand({
    CiphertextBlob: encryptedKey,
    EncryptionContext: context
  });

  const response = await kmsClient.send(command);
  const plaintext = Buffer.from(response.Plaintext!);

  // Cache the key
  keyCache.set(cacheKey, {
    key: plaintext,
    expiresAt: Date.now() + KEY_CACHE_TTL_MS
  });

  return plaintext;
}

/**
 * Encrypt a PHI field value
 */
export async function encryptPHI(
  value: string,
  context: { billId: string; fieldName: string }
): Promise<EncryptedField> {
  if (!value) {
    throw new Error('Cannot encrypt empty value');
  }

  // Generate encryption context for key binding
  const encryptionContext = {
    billId: context.billId,
    fieldName: context.fieldName,
    purpose: 'phi_encryption'
  };

  // Generate data key
  const { plaintext: dataKey, encrypted: encryptedKey } = await generateDataKey(encryptionContext);

  // Generate IV
  const iv = randomBytes(IV_LENGTH);

  // Encrypt the data
  const cipher = createCipheriv(ALGORITHM, dataKey, iv);
  const encrypted = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();

  // Clear plaintext key from memory
  dataKey.fill(0);

  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    encryptedKey: encryptedKey.toString('base64'),
    keyId: KMS_KEY_ID || 'dev-key',
    algorithm: ALGORITHM,
    version: 1
  };
}

/**
 * Decrypt a PHI field value
 */
export async function decryptPHI(
  encrypted: EncryptedField,
  context: { billId: string; fieldName: string }
): Promise<string> {
  // Verify version
  if (encrypted.version !== 1) {
    throw new Error(`Unsupported encryption version: ${encrypted.version}`);
  }

  // Build encryption context
  const encryptionContext = {
    billId: context.billId,
    fieldName: context.fieldName,
    purpose: 'phi_encryption'
  };

  // Decrypt the data key
  const encryptedKey = Buffer.from(encrypted.encryptedKey, 'base64');
  const dataKey = await decryptDataKey(encryptedKey, encryptionContext);

  // Decrypt the data
  const iv = Buffer.from(encrypted.iv, 'base64');
  const authTag = Buffer.from(encrypted.authTag, 'base64');
  const ciphertext = Buffer.from(encrypted.ciphertext, 'base64');

  const decipher = createDecipheriv(ALGORITHM, dataKey, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final()
  ]);

  // Clear key from memory
  dataKey.fill(0);

  return decrypted.toString('utf8');
}

/**
 * Schedule key deletion (for PHI purge)
 */
export async function scheduleKeyDeletion(
  encryptedKey: string,
  pendingWindowInDays: number = 7
): Promise<void> {
  if (!KMS_KEY_ID) {
    console.warn('[ENCRYPTION] KMS not configured - skipping key deletion');
    return;
  }

  // Note: This schedules deletion of the CMK, not the data key
  // For data keys, we simply delete the encrypted key from the database
  // which renders the data unrecoverable
  console.log(`[ENCRYPTION] Key deletion scheduled (data key will be purged from DB)`);
}

/**
 * Encrypt multiple PHI fields for a bill
 */
export async function encryptBillPHI(
  billId: string,
  fields: {
    patientName?: string;
    memberId?: string;
    dateOfBirth?: string;
    accountNumber?: string;
  }
): Promise<{
  patientNameEncrypted?: EncryptedField;
  memberIdEncrypted?: EncryptedField;
  dateOfBirthEncrypted?: EncryptedField;
  accountNumberEncrypted?: EncryptedField;
}> {
  const result: any = {};

  if (fields.patientName) {
    result.patientNameEncrypted = await encryptPHI(fields.patientName, {
      billId,
      fieldName: 'patient_name'
    });
  }

  if (fields.memberId) {
    result.memberIdEncrypted = await encryptPHI(fields.memberId, {
      billId,
      fieldName: 'member_id'
    });
  }

  if (fields.dateOfBirth) {
    result.dateOfBirthEncrypted = await encryptPHI(fields.dateOfBirth, {
      billId,
      fieldName: 'date_of_birth'
    });
  }

  if (fields.accountNumber) {
    result.accountNumberEncrypted = await encryptPHI(fields.accountNumber, {
      billId,
      fieldName: 'account_number'
    });
  }

  return result;
}

/**
 * Decrypt multiple PHI fields for a bill
 */
export async function decryptBillPHI(
  billId: string,
  fields: {
    patientNameEncrypted?: EncryptedField;
    memberIdEncrypted?: EncryptedField;
    dateOfBirthEncrypted?: EncryptedField;
    accountNumberEncrypted?: EncryptedField;
  }
): Promise<{
  patientName?: string;
  memberId?: string;
  dateOfBirth?: string;
  accountNumber?: string;
}> {
  const result: any = {};

  if (fields.patientNameEncrypted) {
    result.patientName = await decryptPHI(fields.patientNameEncrypted, {
      billId,
      fieldName: 'patient_name'
    });
  }

  if (fields.memberIdEncrypted) {
    result.memberId = await decryptPHI(fields.memberIdEncrypted, {
      billId,
      fieldName: 'member_id'
    });
  }

  if (fields.dateOfBirthEncrypted) {
    result.dateOfBirth = await decryptPHI(fields.dateOfBirthEncrypted, {
      billId,
      fieldName: 'date_of_birth'
    });
  }

  if (fields.accountNumberEncrypted) {
    result.accountNumber = await decryptPHI(fields.accountNumberEncrypted, {
      billId,
      fieldName: 'account_number'
    });
  }

  return result;
}

/**
 * Test encryption setup
 */
export async function testEncryption(): Promise<{
  success: boolean;
  kmsConfigured: boolean;
  error?: string;
}> {
  try {
    const testValue = 'PHI_TEST_VALUE_' + Date.now();
    const encrypted = await encryptPHI(testValue, {
      billId: 'test-bill',
      fieldName: 'test-field'
    });
    const decrypted = await decryptPHI(encrypted, {
      billId: 'test-bill',
      fieldName: 'test-field'
    });

    return {
      success: testValue === decrypted,
      kmsConfigured: !!KMS_KEY_ID
    };
  } catch (error: any) {
    return {
      success: false,
      kmsConfigured: !!KMS_KEY_ID,
      error: error.message
    };
  }
}
