// Helper functions for AWS SDK data conversion
const { TextEncoder } = require('util');

/**
 * Convert string to Uint8Array for AWS SDK
 */
function stringToUint8Array(str) {
  return new TextEncoder().encode(str);
}

/**
 * Convert object to Uint8Array for AWS SDK
 */
function objectToUint8Array(obj) {
  const jsonString = JSON.stringify(obj);
  return stringToUint8Array(jsonString);
}

/**
 * Ensure data is in correct format for AWS SDK base64 encoding
 */
function ensureCorrectFormat(data) {
  if (typeof data === 'string') {
    return data;
  }
  if (data instanceof Uint8Array) {
    return data;
  }
  if (Buffer.isBuffer(data)) {
    return new Uint8Array(data);
  }
  if (typeof data === 'object') {
    return objectToUint8Array(data);
  }
  // Convert other types to string first
  return String(data);
}

module.exports = {
  stringToUint8Array,
  objectToUint8Array,
  ensureCorrectFormat
};