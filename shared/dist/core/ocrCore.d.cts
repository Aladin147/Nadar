import { AssistDeps, Result } from '../types/api.cjs';

interface OCRRequest {
    sessionId: string;
    image?: Uint8Array;
    imageRef?: string;
    full?: boolean;
    language?: 'darija' | 'ar' | 'en';
}
interface OCRResponse {
    text: string;
    timing: {
        processing_ms: number;
        total_ms: number;
    };
}
declare function handleOCR(request: OCRRequest, deps: AssistDeps): Promise<Result<OCRResponse>>;

export { type OCRRequest, type OCRResponse, handleOCR };
