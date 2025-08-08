import * as ImageManipulator from 'expo-image-manipulator';

export async function downscale(uri: string, maxDim = 1024, compress = 0.8) {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: maxDim, height: maxDim } }],
    { compress, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );
  return { base64: result.base64!, mimeType: 'image/jpeg', uri: result.uri };
}

