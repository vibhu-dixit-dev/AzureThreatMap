const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = process.env.ENCRYPTION_KEY || 'azurethreatmap_encrypt_key_32byt'; // Must be 32 chars
const IV_LENGTH = 16;

/**
 * Encrypts a plaintext value using AES-256-CBC
 * @param {string} text - Plaintext to encrypt
 * @returns {string} - "iv:encrypted" format
 */
const encrypt = (text) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
};

/**
 * Decrypts an AES-256-CBC encrypted value
 * @param {string} hash - "iv:encrypted" format
 * @returns {string} - Decrypted plaintext
 */
const decrypt = (hash) => {
  const [ivHex, encryptedHex] = hash.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encryptedText = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);
  const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
  return decrypted.toString();
};

/**
 * Returns last 4 chars of a decrypted secret, rest masked
 * @param {string} encryptedSecret
 * @returns {string} e.g. "••••••••••••abcd"
 */
const maskSecret = (encryptedSecret) => {
  try {
    const plain = decrypt(encryptedSecret);
    const last4 = plain.slice(-4);
    return `••••••••••••${last4}`;
  } catch {
    return '••••••••••••••••';
  }
};

module.exports = { encrypt, decrypt, maskSecret };
