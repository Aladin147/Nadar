import { z } from 'zod';

// Shared validation schemas for both Express and Vercel

export const imageBase64Schema = z.string().min(1, 'imageBase64 required');
export const mimeTypeSchema = z.string().optional();
export const sessionIdSchema = z.string().optional();
export const imageRefSchema = z.enum(['last']).optional();

export const optionsSchema = z.object({
  verbosity: z.enum(['brief','normal','detailed']).optional(),
  language: z.enum(['darija','ar','en']).optional(),
}).optional();

// Base image input - either imageBase64 OR imageRef with sessionId
export const imageInputSchema = z.union([
  z.object({ 
    imageBase64: imageBase64Schema, 
    mimeType: mimeTypeSchema, 
    sessionId: sessionIdSchema 
  }),
  z.object({ 
    imageRef: imageRefSchema, 
    sessionId: z.string().min(1, 'sessionId required for imageRef'), 
    mimeType: mimeTypeSchema.optional() 
  })
]);

// Request schemas
export const assistBodySchema = z.union([
  z.object({
    imageBase64: z.string().min(1, 'imageBase64 required'),
    mimeType: z.string().optional(),
    sessionId: z.string().optional(),
    question: z.string().optional(),
    options: optionsSchema
  }),
  z.object({
    imageRef: z.enum(['last']),
    sessionId: z.string().min(1, 'sessionId required for imageRef'),
    mimeType: z.string().optional(),
    question: z.string().optional(),
    options: optionsSchema
  })
]);

export const describeBodySchema = z.object({
  imageBase64: imageBase64Schema,
  mimeType: mimeTypeSchema,
  options: optionsSchema,
  sessionId: sessionIdSchema
});

export const ocrBodySchema = z.object({
  imageBase64: imageBase64Schema,
  mimeType: mimeTypeSchema,
  options: optionsSchema,
  full: z.boolean().optional()
});

export const qaBodySchema = z.object({
  imageBase64: imageBase64Schema,
  question: z.string().min(1, 'question required'),
  mimeType: mimeTypeSchema,
  options: optionsSchema
});

export const ttsBodySchema = z.object({
  text: z.string().min(1, 'text required'),
  voice: z.string().optional(),
  provider: z.enum(['gemini', 'elevenlabs']).optional(),
  rate: z.number().min(0.1).max(3.0).optional()
});

// Validation helper functions
export function validateRequest<T>(schema: z.ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const firstError = result.error.issues[0];
    throw new Error(`Validation error: ${firstError?.message || 'Invalid request body'}`);
  }
  return result.data;
}

export function createValidationError(message: string): Error {
  const error = new Error(message);
  (error as any).err_code = 'VALIDATION_ERROR';
  return error;
}
