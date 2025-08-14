import { ImageStore } from '../types/api.js';

declare class MemoryImageStore implements ImageStore {
    private cache;
    private cleanupInterval;
    constructor();
    save(buffer: Uint8Array, ttlMinutes?: number): Promise<string>;
    get(token: string): Promise<Uint8Array | null>;
    destroy(): void;
}
declare class GlobalImageStore implements ImageStore {
    private static cache;
    save(buffer: Uint8Array, ttlMinutes?: number): Promise<string>;
    get(token: string): Promise<Uint8Array | null>;
}
declare class VercelBlobImageStore implements ImageStore {
    private blobToken;
    constructor(blobToken: string);
    save(buffer: Uint8Array, ttlMinutes?: number): Promise<string>;
    get(token: string): Promise<Uint8Array | null>;
}

export { GlobalImageStore, MemoryImageStore, VercelBlobImageStore };
