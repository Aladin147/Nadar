"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// stores/imageStore.ts
var imageStore_exports = {};
__export(imageStore_exports, {
  GlobalImageStore: () => GlobalImageStore,
  MemoryImageStore: () => MemoryImageStore,
  VercelBlobImageStore: () => VercelBlobImageStore
});
module.exports = __toCommonJS(imageStore_exports);
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  GlobalImageStore,
  MemoryImageStore,
  VercelBlobImageStore
});
//# sourceMappingURL=imageStore.cjs.map