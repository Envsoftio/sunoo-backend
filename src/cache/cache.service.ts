import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class CacheService {
  private client: RedisClientType;
  private readonly logger = new Logger(CacheService.name);
  private readonly defaultTTL: number;

  constructor(private readonly configService: ConfigService) {
    this.defaultTTL = this.configService.get<number>('redis.ttl') || 3600;
  }

  async connect(): Promise<void> {
    const host = this.configService.get<string>('redis.host') || 'localhost';
    const port = this.configService.get<number>('redis.port') || 6379;
    const password = this.configService.get<string>('redis.password');
    const db = this.configService.get<number>('redis.db') || 0;

    this.client = createClient({
      socket: {
        host,
        port,
      },
      password: password || undefined,
      database: db,
    });

    this.client.on('error', err => {
      this.logger.error('Redis Client Error', err);
    });

    this.client.on('connect', () => {
      this.logger.log('Redis Client Connected');
    });

    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Redis Client Disconnected');
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | undefined> {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : undefined;
    } catch (error) {
      this.logger.error(`Error getting cache key ${key}:`, error);
      return undefined;
    }
  }

  /**
   * Set value in cache
   * @param ttl - Time to live in seconds (optional)
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      const expiry = ttl || this.defaultTTL;
      await this.client.setEx(key, expiry, serialized);
    } catch (error) {
      this.logger.error(`Error setting cache key ${key}:`, error);
    }
  }

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.error(`Error deleting cache key ${key}:`, error);
    }
  }

  /**
   * Clear all cache
   */
  async reset(): Promise<void> {
    try {
      await this.client.flushDb();
      this.logger.warn('All cache cleared');
    } catch (error) {
      this.logger.error('Error clearing cache:', error);
    }
  }

  /**
   * Get or set pattern - fetch from cache or compute and cache
   * @param key - Cache key
   * @param factory - Function to compute value if not in cache
   * @param ttl - Time to live in seconds (optional)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined && cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * Delete multiple keys matching a pattern
   * Note: Use carefully in production
   * @returns Number of keys deleted
   */
  async delPattern(pattern: string): Promise<number> {
    try {
      const keys = await this.client.keys(pattern);
      if (keys && keys.length > 0) {
        await this.client.del(keys);
        return keys.length;
      }
      return 0;
    } catch (error) {
      this.logger.error(`Error deleting pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Check if key exists in cache
   */
  async has(key: string): Promise<boolean> {
    try {
      const exists = await this.client.exists(key);
      return exists === 1;
    } catch (error) {
      this.logger.error(`Error checking cache key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set multiple values at once
   */
  async setMany<T>(
    entries: Array<{ key: string; value: T; ttl?: number }>
  ): Promise<void> {
    await Promise.all(
      entries.map(({ key, value, ttl }) => this.set(key, value, ttl))
    );
  }

  /**
   * Get multiple values at once
   */
  async getMany<T>(keys: string[]): Promise<Array<T | undefined>> {
    try {
      if (keys.length === 0) return [];
      const values = await this.client.mGet(keys);
      return values.map(v => (v ? JSON.parse(v) : undefined));
    } catch (error) {
      this.logger.error('Error getting multiple cache keys:', error);
      return keys.map(() => undefined);
    }
  }

  /**
   * Wrap a function with caching
   */
  async wrap<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T> {
    return this.getOrSet(key, fn, ttl);
  }

  /**
   * Get all keys matching a pattern (for admin panel)
   */
  async getKeys(pattern: string): Promise<string[]> {
    try {
      const keys = await this.client.keys(pattern);
      return keys;
    } catch (error) {
      this.logger.error('Error getting cache keys:', error);
      return [];
    }
  }

  /**
   * Get TTL for a key (for admin panel)
   */
  async getTTL(key: string): Promise<number> {
    try {
      const ttl = await this.client.ttl(key);
      return ttl;
    } catch (error) {
      this.logger.error('Error getting TTL:', error);
      return -1;
    }
  }

  /**
   * Get Redis info (for admin panel)
   */
  async getInfo(): Promise<any> {
    try {
      const info = await this.client.info();

      // Parse info string into object
      const lines = info.split('\r\n');
      const parsed: any = {
        memory: {},
        stats: {},
        server: {},
      };

      lines.forEach(line => {
        if (line.includes(':')) {
          const [key, value] = line.split(':');

          if (key.startsWith('used_memory')) {
            parsed.memory[key] = value;
          } else if (key.includes('keyspace')) {
            parsed.stats[key] = value;
          } else if (['redis_version', 'uptime_in_seconds'].includes(key)) {
            parsed.server[key] = value;
          }
        }
      });

      return parsed;
    } catch (error) {
      this.logger.error('Error getting Redis info:', error);
      return null;
    }
  }
}
