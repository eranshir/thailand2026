export function generateSecureId() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function generateUUIDv4() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  
  array[6] = (array[6] & 0x0f) | 0x40;
  array[8] = (array[8] & 0x3f) | 0x80;
  
  const hex = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function validateEntropy() {
  if (!crypto || !crypto.getRandomValues) {
    throw new Error('Cryptographically secure randomness not available');
  }
  
  const test = new Uint8Array(32);
  crypto.getRandomValues(test);
  
  const uniqueBytes = new Set(test).size;
  if (uniqueBytes < 8) {
    throw new Error('Insufficient entropy detected');
  }
  
  return true;
}
