// Utility functions for image processing

export function convertToBuffer(imageBase64: string): Buffer {
  // Remove data URL prefix if present
  const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

export function isValidImageFormat(buffer: Buffer): boolean {
  // Check for common image format signatures
  const signatures = [
    [0xFF, 0xD8, 0xFF], // JPEG
    [0x89, 0x50, 0x4E, 0x47], // PNG
    [0x47, 0x49, 0x46], // GIF
    [0x52, 0x49, 0x46, 0x46], // WebP (RIFF)
  ];
  
  return signatures.some(sig => 
    sig.every((byte, index) => buffer[index] === byte)
  );
}
