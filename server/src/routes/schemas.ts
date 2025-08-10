import { z } from 'zod';

export const imageBase64 = z.string().min(1, 'imageBase64 required');
export const mimeType = z.string().optional();
export const sessionId = z.string().optional();
export const imageRef = z.enum(['last']).optional();
export const options = z.object({
  verbosity: z.enum(['brief','normal','detailed']).optional(),
  language: z.enum(['darija','ar','en']).optional(),
}).optional();

// Base image input - either imageBase64 OR imageRef with sessionId
const imageInput = z.union([
  z.object({ imageBase64, mimeType, sessionId }),
  z.object({ imageRef, sessionId: z.string().min(1, 'sessionId required for imageRef'), mimeType: mimeType.optional() })
]);

export const DescribeBody = z.intersection(imageInput, z.object({ options }));
export const OCRBody = z.intersection(imageInput, z.object({ options }));
export const QABody = z.intersection(imageInput, z.object({
  question: z.string().min(1, 'question required'),
  options
}));
export const TTSBody = z.object({
  text: z.string().min(1,'text required'),
  voice: z.string().optional(),
  provider: z.enum(['gemini', 'elevenlabs']).optional()
});

