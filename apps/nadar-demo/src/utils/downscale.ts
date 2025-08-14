import * as ImageManipulator from 'expo-image-manipulator';

export async function downscale(
  uri: string,
  maxSize: number = 1024,
  quality: number = 0.7
): Promise<{ uri: string; base64: string; mimeType: string }> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxSize } }],
      {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );

    if (!result.base64) {
      throw new Error('Failed to generate base64');
    }

    return {
      uri: result.uri,
      base64: result.base64,
      mimeType: 'image/jpeg',
    };
  } catch (error) {
    console.error('Image downscale failed:', error);
    throw new Error('Failed to process image');
  }
}