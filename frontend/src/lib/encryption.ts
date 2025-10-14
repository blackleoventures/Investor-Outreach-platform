// src/lib/encryption.ts

import crypto from "crypto";

/**
 * Encryption algorithm
 */
const ALGORITHM = "aes-256-gcm";

/**
 * Get encryption key from environment variable
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable is not set");
  }
  
  // Key must be 32 bytes for AES-256
  // If key is shorter, pad it; if longer, truncate it
  const keyBuffer = Buffer.from(key, "utf-8");
  
  if (keyBuffer.length < 32) {
    // Pad with zeros
    return Buffer.concat([keyBuffer, Buffer.alloc(32 - keyBuffer.length)]);
  } else if (keyBuffer.length > 32) {
    // Truncate
    return keyBuffer.slice(0, 32);
  }
  
  return keyBuffer;
}

/**
 * Encrypt a string using AES-256-GCM
 * 
 * @param text - Plain text to encrypt
 * @returns Encrypted string in format: iv:authTag:encryptedData
 */
export function encryptAES256(text: string): string {
  try {
    const key = getEncryptionKey();
    
    // Generate random IV (Initialization Vector)
    const iv = crypto.randomBytes(16);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Encrypt
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    
    // Get auth tag
    const authTag = cipher.getAuthTag();
    
    // Return format: iv:authTag:encryptedData
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
  } catch (error) {
    console.error("[Encryption] Error encrypting text:", error);
    throw new Error("Failed to encrypt data");
  }
}

/**
 * Decrypt a string encrypted with encryptAES256
 * 
 * @param encryptedText - Encrypted string in format: iv:authTag:encryptedData
 * @returns Decrypted plain text
 */
export function decryptAES256(encryptedText: string): string {
  try {
    const key = getEncryptionKey();
    
    // Split the encrypted text
    const parts = encryptedText.split(":");
    
    if (parts.length !== 3) {
      throw new Error("Invalid encrypted text format");
    }
    
    const [ivHex, authTagHex, encryptedData] = parts;
    
    // Convert from hex
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt
    let decrypted = decipher.update(encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
  } catch (error) {
    console.error("[Decryption] Error decrypting text:", error);
    throw new Error("Failed to decrypt data");
  }
}

/**
 * Hash a string using SHA-256 (one-way hash, cannot be decrypted)
 * Useful for comparing passwords without storing them
 * 
 * @param text - Text to hash
 * @returns SHA-256 hash
 */
export function hashSHA256(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

/**
 * Generate a random encryption key (32 bytes)
 * Use this to generate ENCRYPTION_KEY for environment variables
 * 
 * @returns Random 32-byte key in hex format
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Example usage (commented out):
// console.log("New encryption key:", generateEncryptionKey());
// Add this to your .env.local as ENCRYPTION_KEY
