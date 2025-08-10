import { z } from 'zod';

export const imageBase64 = z.string().min(1, 'imageBase64 required');
export const mimeType = z.string().optional();
export const options = z.object({
  verbosity: z.enum(['brief','normal','detailed']).optional(),
  language: z.enum(['darija','ar','en']).optional(),
}).optional();

export const DescribeBody = z.object({ imageBase64, mimeType, options });
export const OCRBody = z.object({ imageBase64, mimeType, options });
export const QABody = z.object({ imageBase64, question: z.string().min(1, 'question required'), mimeType, options });
export const TTSBody = z.object({
  text: z.string().min(1,'text required'),
  voice: z.string().optional(),
  provider: z.enum(['gemini', 'elevenlabs']).optional()
});

