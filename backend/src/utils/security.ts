import crypto from 'crypto';
import { env } from '../config/env';

/**
 * AES-256-GCM Encryption / Decryption Utility
 * Used to encrypt sensitive data (like chat history) before storing it in Redis or DB.
 */

const ALGORITHM = 'aes-256-gcm';

// We need a 32-byte key for aes-256. 
// Ideally loaded from env (e.g. JWT_SECRET or a dedicated ENCRYPTION_KEY).
// We'll derive a 32-byte key from JWT_SECRET to ensure consistency.
const getEncryptionKey = (): Buffer => {
  const secret = env.JWT_ACCESS_SECRET || 'fallback_secret_key_that_should_not_be_used_in_prod';
  return crypto.createHash('sha256').update(secret).digest();
};

export const encryptText = (text: string): string => {
  if (!text) return text;
  
  const iv = crypto.randomBytes(12); // GCM standard IV size is 12 bytes
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  // Format: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
};

export const decryptText = (encryptedData: string): string => {
  if (!encryptedData || typeof encryptedData !== 'string') return encryptedData;
  if (!encryptedData.includes(':')) return encryptedData; // Not encrypted or wrong format

  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) return encryptedData;
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedText = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (err) {
    // If decryption fails, it could be legacy unencrypted data or corrupted.
    // Return original string or handle gracefully.
    return encryptedData;
  }
};
