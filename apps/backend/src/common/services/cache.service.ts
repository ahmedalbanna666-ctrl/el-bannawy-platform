import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import IORedis from "ioredis";

const DEFAULT_TTL = 60;

@Injectable()
export class CacheService {
  private readonly redis: IORedis | null = null;
  private readonly logger = new Logger(CacheService.name);

  constructor(configService: ConfigService) {
    const host = configService.get<string>("REDIS_HOST", "localhost");
    const port = configService.get<number>("REDIS_PORT", 6379);
    const user = configService.get<string>("REDIS_USER", "");
    const password = configService.get<string>("REDIS_PASSWORD", "");
    try {
      this.redis = new IORedis(port, host, {
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
        lazyConnect: true,
        ...(user ? { username: user } : {}),
        ...(password ? { password } : {}),
      });
      this.redis.on("error", () => {});
    } catch {
      this.logger.warn("Redis unavailable — cache disabled");
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.redis) return null;
    try {
      const raw = await this.redis.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds = DEFAULT_TTL): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch {
      // ignore
    }
  }

  async del(key: string): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.del(key);
    } catch {
      // ignore
    }
  }

  async delByPattern(pattern: string): Promise<void> {
    if (!this.redis) return;
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) await this.redis.del(...keys);
    } catch {
      // ignore
    }
  }

  generateKey(prefix: string, ...parts: (string | undefined)[]): string {
    return `${prefix}:${parts.filter(Boolean).join(":")}`;
  }
}
