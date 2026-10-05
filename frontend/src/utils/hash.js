/**
 * Utility functions for cryptographic hashing using Web Crypto API.
 */

/**
 * Compute SHA-256 hash string from ArrayBuffer or String.
 * @param {ArrayBuffer|string} input 
 * @returns {Promise<string>} 64-char hex string
 */
export async function computeSHA256(input) {
  let buffer;
  if (typeof input === 'string') {
    const encoder = new TextEncoder();
    buffer = encoder.encode(input);
  } else if (input instanceof ArrayBuffer) {
    buffer = input;
  } else if (ArrayBuffer.isView(input)) {
    buffer = input.buffer;
  } else {
    throw new Error('Unsupported input type for SHA-256 hash computation');
  }

  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Compute SHA-256 hash of a File object.
 * @param {File} file 
 * @returns {Promise<string>}
 */
export async function hashFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  return computeSHA256(arrayBuffer);
}

/**
 * Truncate SHA-256 hash for UI display (e.g. e3b0c442...b855)
 * @param {string} hash 
 * @returns {string}
 */
export function formatHash(hash) {
  if (!hash || hash.length < 16) return hash || '';
  return `${hash.substring(0, 12)}...${hash.substring(hash.length - 4)}`;
}
