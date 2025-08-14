// stores/imageStore.ts
var MemoryImageStore = class {
  cache = /* @__PURE__ */ new Map();
  cleanupInterval;
  constructor() {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [token, entry] of this.cache.entries()) {
        if (entry.expires < now) {
          this.cache.delete(token);
        }
      }
    }, 6e4);
  }
  async save(buffer, ttlMinutes = 5) {
    const token = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const expires = Date.now() + ttlMinutes * 60 * 1e3;
    this.cache.set(token, { buffer, expires });
    return token;
  }
  async get(token) {
    const entry = this.cache.get(token);
    if (!entry) return null;
    if (entry.expires < Date.now()) {
      this.cache.delete(token);
      return null;
    }
    return entry.buffer;
  }
  destroy() {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
};
var GlobalImageStore = class _GlobalImageStore {
  static cache = /* @__PURE__ */ new Map();
  async save(buffer, ttlMinutes = 5) {
    const token = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const expires = Date.now() + ttlMinutes * 60 * 1e3;
    _GlobalImageStore.cache.set(token, { buffer, expires });
    return token;
  }
  async get(token) {
    const entry = _GlobalImageStore.cache.get(token);
    if (!entry) return null;
    if (entry.expires < Date.now()) {
      _GlobalImageStore.cache.delete(token);
      return null;
    }
    return entry.buffer;
  }
};
var VercelBlobImageStore = class {
  constructor(blobToken) {
    this.blobToken = blobToken;
  }
  async save(buffer, ttlMinutes = 5) {
    const fallback = new GlobalImageStore();
    return fallback.save(buffer, ttlMinutes);
  }
  async get(token) {
    const fallback = new GlobalImageStore();
    return fallback.get(token);
  }
};
export {
  GlobalImageStore,
  MemoryImageStore,
  VercelBlobImageStore
};
//# sourceMappingURL=imageStore.js.map