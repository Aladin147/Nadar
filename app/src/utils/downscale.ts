import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

export async function downscale(uri: string, maxDim = 1024, compress = 0.8) {
  if (Platform.OS !== 'web') {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      return { base64, mimeType: 'image/jpeg', uri };
    } catch (e: any) {
      throw new Error(`Failed to read file: ${e?.message || 'unknown error'}`);
    }
  }
  return new Promise<{ base64: string; mimeType: string; uri: string }>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const { width, height } = img;
      const scale = Math.min(1, maxDim / Math.max(width, height));
      const w = Math.round(width * scale);
      const h = Math.round(height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas 2D context not available'));
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', compress);
      const base64 = dataUrl.split(',')[1] || '';
      resolve({ base64, mimeType: 'image/jpeg', uri: dataUrl });
    };
    img.onerror = (e) => {
      console.error('Downscale image load error:', e);
      reject(new Error('Failed to load image for downscale'));
    };
    // If already a data URL, load directly; else add origin hint
    img.src = uri.startsWith('data:') ? uri : uri + (uri.includes('?') ? '&' : '?') + 'origin=*';
  });
}

