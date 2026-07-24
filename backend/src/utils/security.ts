import crypto from 'crypto';

/**
 * AES-256-GCM Encryption / Decryption Utility
 * Used to encrypt sensitive data (like chat history) before storing it in Redis or DB.
 */

const ALGORITHM = 'aes-256-gcm';

/**
 * Şifreleme anahtarını döndürür.
 * ENCRYPTION_KEY env değişkeninden alınır (JWT_SECRET'tan BAĞIMSIZ).
 * JWT rotation şifreli verileri bozmaz.
 * Minimum 32 karakter olmalı; SHA-256 ile 32 byte'a normalize edilir.
 */
const getEncryptionKey = (): Buffer => {
  const secret = process.env.ENCRYPTION_KEY || process.env.JWT_ACCESS_SECRET || 'fallback_secret_key_that_should_not_be_used_in_prod';
  if (process.env.NODE_ENV === 'production' && !process.env.ENCRYPTION_KEY) {
    console.error('[SECURITY] UYARI: ENCRYPTION_KEY tanımlı değil! JWT_ACCESS_SECRET kullanılıyor — bu güvenli değil.');
  }
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
