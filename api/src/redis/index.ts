import Redis from 'ioredis';
import { config } from '../config';

// In-process memory cache — used transparently when Redis is unavailable
const memoryCache = new Map<string, { value: string; expiresAt: number }>();

function memGet(key: string): string | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { memoryCache.delete(key); return null; }
  return entry.value;
}
function memSet(key: string, value: string, ttlSeconds: number): void {
  memoryCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}
function memDel(key: string): void { memoryCache.delete(key); }

// Thin proxy that falls back to memory cache when Redis connection fails
class ResilientRedis {
  private client: Redis;
  private _ready = false;

  constructor(url: string) {
    this.client = new Redis(url, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      connectTimeout: 2000,
    });

    this.client.on('ready', () => {
      this._ready = true;
      console.log('[Redis] Connected to Redis server');
    });

    this.client.on('error', (err) => {
      if (this._ready) console.warn('[Redis] Connection lost, falling back to in-memory cache:', err.message);
      this._ready = false;
    });

    // Attempt connection but don't crash if Redis isn't available
    this.client.connect().catch(() => {
      console.warn('[Redis] Not available — using in-process memory cache (not suitable for multi-instance production)');
    });
  }

  async get(key: string): Promise<string | null> {
    if (this._ready) {
      try { return await this.client.get(key); } catch { this._ready = false; }
    }
    return memGet(key);
  }

  async set(key: string, value: string, mode?: string, ttl?: number): Promise<'OK'> {
    if (this._ready) {
      try {
        if (mode === 'EX' && ttl) await this.client.set(key, value, 'EX', ttl);
        else await this.client.set(key, value);
        return 'OK';
      } catch { this._ready = false; }
    }
    if (mode === 'EX' && ttl) memSet(key, value, ttl);
    else memSet(key, value, 300);
    return 'OK';
  }

  async setex(key: string, ttl: number, value: string): Promise<'OK'> {
    return this.set(key, value, 'EX', ttl);
  }

  async del(key: string): Promise<number> {
    if (this._ready) {
      try { return await this.client.del(key); } catch { this._ready = false; }
    }
    memDel(key);
    return 1;
  }

  async incr(key: string): Promise<number> {
    if (this._ready) {
      try { return await this.client.incr(key); } catch { this._ready = false; }
    }
    const val = parseInt(memGet(key) || '0') + 1;
    memSet(key, String(val), 900);
    return val;
  }

  async expire(key: string, ttl: number): Promise<number> {
    if (this._ready) {
      try { return await this.client.expire(key, ttl); } catch { this._ready = false; }
    }
    const existing = memGet(key);
    if (existing !== null) memSet(key, existing, ttl);
    return 1;
  }

  async exists(key: string): Promise<number> {
    if (this._ready) {
      try { return await this.client.exists(key); } catch { this._ready = false; }
    }
    return memGet(key) !== null ? 1 : 0;
  }

  /** Raw ioredis client for BullMQ (requires real Redis) */
  get raw(): Redis { return this.client; }

  get isReady(): boolean { return this._ready; }
}

export const redis = new ResilientRedis(config.REDIS_URL);
