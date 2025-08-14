import { VercelRequest, VercelResponse } from '@vercel/node';
import { AssistDeps } from '../types/api.cjs';
import { TTSDeps } from '../core/ttsCore.cjs';

declare function createVercelAssistHandler(deps: AssistDeps): (req: VercelRequest, res: VercelResponse) => Promise<VercelResponse | undefined>;
declare function createVercelOCRHandler(deps: AssistDeps): (req: VercelRequest, res: VercelResponse) => Promise<VercelResponse | undefined>;
declare function createVercelTTSHandler(deps: TTSDeps): (req: VercelRequest, res: VercelResponse) => Promise<VercelResponse | undefined>;

export { createVercelAssistHandler, createVercelOCRHandler, createVercelTTSHandler };
