import { VercelRequest, VercelResponse } from '@vercel/node';
import { AssistDeps } from '../types/api.cjs';

declare function createVercelAssistHandler(deps: AssistDeps): (req: VercelRequest, res: VercelResponse) => Promise<VercelResponse | undefined>;
declare function createVercelOCRHandler(deps: AssistDeps): (req: VercelRequest, res: VercelResponse) => Promise<VercelResponse | undefined>;

export { createVercelAssistHandler, createVercelOCRHandler };
