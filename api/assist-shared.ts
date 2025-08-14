import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleAssistRequest } from '../shared/handlers/assistHandler';
import { createVercelHandler } from '../shared/adapters/vercelAdapter';

// New Vercel assist endpoint using shared handler
export default createVercelHandler(
  handleAssistRequest,
  { 
    allowedMethods: ['POST'],
    requiresImageResolver: true 
  }
);
