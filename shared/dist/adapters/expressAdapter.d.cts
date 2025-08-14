import { Request, Response } from 'express';
import { AssistDeps } from '../types/api.cjs';

declare function createExpressAssistHandler(deps: AssistDeps): (req: Request, res: Response) => Promise<void>;

export { createExpressAssistHandler };
