/**
 * Calculate estimated request size in bytes for telemetry and debugging
 */
export function calculateRequestSize(body: any): number {
  if (!body || typeof body !== 'object') {
    return 0;
  }

  // Base64 image data (most common case)
  if (body.imageBase64 && typeof body.imageBase64 === 'string') {
    // Base64 adds ~33% overhead, so actual image size is ~75% of base64 length
    return Math.floor(body.imageBase64.length * 0.75);
  }

  // Text content
  if (body.text && typeof body.text === 'string') {
    // Rough estimate: 1 char ≈ 1 byte for text (UTF-8 can be more)
    return body.text.length;
  }

  // Fallback: JSON stringify the entire body
  try {
    return JSON.stringify(body).length;
  } catch {
    return 0;
  }
}

/**
 * Format bytes into human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Validate if a string is valid base64
 */
export function isValidBase64(str: string): boolean {
  if (!str || typeof str !== 'string') return false;

  // Basic base64 pattern check
  const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;

  // Must be valid length (multiple of 4)
  if (str.length % 4 !== 0) return false;

  return base64Pattern.test(str);
}
