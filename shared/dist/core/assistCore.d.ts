import { AssistRequest, AssistDeps, Result, AssistResponse } from '../types/api.js';

declare function handleAssist(request: AssistRequest, deps: AssistDeps): Promise<Result<AssistResponse>>;

export { handleAssist };
