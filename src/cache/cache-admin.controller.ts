import {
  Controller,
  Get,
  Delete,
  Query,
  Param,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CacheService } from './cache.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

/**
 * Admin Controller for Cache Management
 * Protected by JWT Authentication + Admin Role
 */
@ApiTags('Admin - Cache Management')
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/cache')
export class CacheAdminController {
  constructor(private readonly cacheService: CacheService) {}

  /**
   * Get all cache keys with optional pattern filtering
   */
  @Get('keys')
  @ApiOperation({ summary: 'Get all cache keys' })
  @ApiQuery({ name: 'pattern', required: false, example: 'cache:*/show/*' })
  @ApiResponse({
    status: 200,
    description: 'List of cache keys',
    schema: {
      example: {
        success: true,
        count: 150,
        keys: [
          'cache:/api/genre',
          'cache:/api/show/story-123',
          'cache:/api/progress/story-456:user:789',
        ],
      },
    },
  })
  async getAllKeys(@Query('pattern') pattern?: string) {
    try {
      const searchPattern = pattern || 'cache:*';
      const keys = await this.cacheService.getKeys(searchPattern);

      return {
        success: true,
        count: keys.length,
        pattern: searchPattern,
        keys,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to fetch cache keys',
        error: error.message,
      };
    }
  }

  /**
   * Get cache statistics
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get cache statistics' })
  @ApiResponse({
    status: 200,
    description: 'Cache statistics',
    schema: {
      example: {
        success: true,
        stats: {
          totalKeys: 150,
          keysByType: {
            show: 45,
            genre: 12,
            story: 38,
            progress: 55,
          },
          memory: '2.5 MB',
          hitRate: '95%',
        },
      },
    },
  })
  async getStats() {
    try {
      const allKeys = await this.cacheService.getKeys('cache:*');

      // Group keys by type
      const keysByType: Record<string, number> = {};
      allKeys.forEach(key => {
        // Extract type from cache key pattern: cache:/api/{type}/...
        let type = 'other';

        if (
          key.includes('/show/') ||
          key.includes('getStoryBySlugForShow') ||
          key.includes('getStoryByIdForShow')
        ) {
          type = 'show';
        } else if (key.includes('/genre')) {
          type = 'genre';
        } else if (key.includes('/story')) {
          type = 'story';
        } else if (key.includes('/progress')) {
          type = 'progress';
        } else if (key.includes('/rating')) {
          type = 'rating';
        } else if (key.includes('/review')) {
          type = 'review';
        } else if (key.includes('/bookmark')) {
          type = 'bookmark';
        }

        keysByType[type] = (keysByType[type] || 0) + 1;
      });

      const info = await this.cacheService.getInfo();

      return {
        success: true,
        stats: {
          totalKeys: allKeys.length,
          keysByType,
          info,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to fetch cache stats',
        error: error.message,
      };
    }
  }

  /**
   * Get cache value by key
   */
  @Get('get')
  @ApiOperation({ summary: 'Get cache value by key' })
  @ApiQuery({ name: 'key', required: true, example: 'cache:/api/genre' })
  @ApiResponse({
    status: 200,
    description: 'Cache value',
    schema: {
      example: {
        success: true,
        key: 'cache:/api/genre',
        ttl: 2592000,
        value: { id: 1, name: 'Romance' },
      },
    },
  })
  async getCacheValue(@Query('key') key: string) {
    try {
      const value = await this.cacheService.get(key);
      const ttl = await this.cacheService.getTTL(key);

      if (value === undefined) {
        return {
          success: false,
          message: 'Key not found',
          key,
        };
      }

      return {
        success: true,
        key,
        ttl,
        ttlFormatted: this.formatTTL(ttl),
        value,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to get cache value',
        error: error.message,
      };
    }
  }

  /**
   * Get multiple cache values by pattern
   */
  @Get('search')
  @ApiOperation({ summary: 'Search cache by pattern and get values' })
  @ApiQuery({ name: 'pattern', required: true, example: 'cache:*/show/*' })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Cache values matching pattern',
  })
  async searchCache(
    @Query('pattern') pattern: string,
    @Query('limit') limit?: number
  ) {
    try {
      const keys = await this.cacheService.getKeys(pattern);
      const limitedKeys = limit
        ? keys.slice(0, Number(limit))
        : keys.slice(0, 50);

      const results = await Promise.all(
        limitedKeys.map(async key => {
          const value = await this.cacheService.get(key);
          const ttl = await this.cacheService.getTTL(key);
          const now = Date.now();

          // Calculate expiry time
          const expiresAt = ttl > 0 ? new Date(now + ttl * 1000) : null;

          // Estimate creation time based on common TTL patterns
          const estimatedTTL = this.estimateOriginalTTL(key);
          const createdAt =
            estimatedTTL > 0 && ttl > 0
              ? new Date(now - (estimatedTTL - ttl) * 1000)
              : null;

          return {
            key,
            ttl,
            ttlFormatted: this.formatTTL(ttl),
            expiresAt: expiresAt?.toISOString(),
            createdAt: createdAt?.toISOString(),
            ageSeconds: estimatedTTL > 0 && ttl > 0 ? estimatedTTL - ttl : null,
            value,
          };
        })
      );

      return {
        success: true,
        pattern,
        totalMatches: keys.length,
        showing: results.length,
        results,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to search cache',
        error: error.message,
      };
    }
  }

  /**
   * Delete cache by key
   */
  @Delete('key/:key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete cache by key' })
  @ApiResponse({
    status: 200,
    description: 'Cache deleted successfully',
  })
  async deleteKey(@Param('key') key: string) {
    try {
      // URL decode the key
      const decodedKey = decodeURIComponent(key);
      await this.cacheService.del(decodedKey);

      return {
        success: true,
        message: 'Cache deleted successfully',
        key: decodedKey,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to delete cache',
        error: error.message,
      };
    }
  }

  /**
   * Delete cache by pattern
   */
  @Delete('pattern')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete cache by pattern' })
  @ApiQuery({ name: 'pattern', required: true, example: 'cache:*/show/*' })
  @ApiResponse({
    status: 200,
    description: 'Caches deleted successfully',
    schema: {
      example: {
        success: true,
        message: 'Deleted 45 cache keys',
        pattern: 'cache:*/show/*',
        deletedCount: 45,
      },
    },
  })
  async deletePattern(@Query('pattern') pattern: string) {
    try {
      const keys = await this.cacheService.getKeys(pattern);
      const count = keys.length;

      await this.cacheService.delPattern(pattern);

      return {
        success: true,
        message: `Deleted ${count} cache keys`,
        pattern,
        deletedCount: count,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to delete cache pattern',
        error: error.message,
      };
    }
  }

  /**
   * Clear all cache
   */
  @Delete('all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear all cache (DANGEROUS!)' })
  @ApiResponse({
    status: 200,
    description: 'All caches cleared',
  })
  async clearAll() {
    try {
      const keysBefore = await this.cacheService.getKeys('cache:*');
      const count = keysBefore.length;

      await this.cacheService.reset();

      return {
        success: true,
        message: `Cleared all cache (${count} keys deleted)`,
        deletedCount: count,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to clear cache',
        error: error.message,
      };
    }
  }

  /**
   * Get cache keys grouped by type
   */
  @Get('grouped')
  @ApiOperation({ summary: 'Get cache keys grouped by endpoint type' })
  @ApiResponse({
    status: 200,
    description: 'Cache keys grouped by type',
  })
  async getGroupedKeys() {
    try {
      const allKeys = await this.cacheService.getKeys('cache:*');

      const grouped: Record<string, string[]> = {
        show: [],
        genre: [],
        story: [],
        progress: [],
        rating: [],
        review: [],
        bookmark: [],
        other: [],
      };

      allKeys.forEach(key => {
        if (
          key.includes('/show/') ||
          key.includes('getStoryBySlugForShow') ||
          key.includes('getStoryByIdForShow')
        ) {
          grouped.show.push(key);
        } else if (key.includes('/genre')) {
          grouped.genre.push(key);
        } else if (key.includes('/story')) {
          grouped.story.push(key);
        } else if (key.includes('/progress')) {
          grouped.progress.push(key);
        } else if (key.includes('/rating')) {
          grouped.rating.push(key);
        } else if (key.includes('/review')) {
          grouped.review.push(key);
        } else if (key.includes('/bookmark')) {
          grouped.bookmark.push(key);
        } else {
          grouped.other.push(key);
        }
      });

      const now = Date.now();
      const summary = await Promise.all(
        Object.entries(grouped).map(async ([type, keys]) => {
          // Get detailed info for first 10 keys
          const limitedKeys = keys.slice(0, 10);
          const keyDetails = await Promise.all(
            limitedKeys.map(async key => {
              const ttl = await this.cacheService.getTTL(key);
              const expiresAt = ttl > 0 ? new Date(now + ttl * 1000) : null;
              const estimatedTTL = this.estimateOriginalTTL(key);
              const createdAt =
                estimatedTTL > 0 && ttl > 0
                  ? new Date(now - (estimatedTTL - ttl) * 1000)
                  : null;

              return {
                key,
                ttl,
                ttlFormatted: this.formatTTL(ttl),
                expiresAt: expiresAt?.toISOString(),
                createdAt: createdAt?.toISOString(),
                ageSeconds:
                  estimatedTTL > 0 && ttl > 0 ? estimatedTTL - ttl : null,
              };
            })
          );

          return {
            type,
            count: keys.length,
            keys: keyDetails,
          };
        })
      );

      return {
        success: true,
        total: allKeys.length,
        groups: summary,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to get grouped keys',
        error: error.message,
      };
    }
  }

  /**
   * Helper method to format TTL
   */
  private formatTTL(seconds: number): string {
    if (seconds < 0) return 'Expired';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  }

  /**
   * Estimate original TTL based on cache key pattern
   * This helps calculate creation time
   */
  private estimateOriginalTTL(key: string): number {
    // Based on cache.constants.ts and cache.interceptor.ts patterns
    const MONTH = 30 * 24 * 60 * 60; // 30 days
    const WEEK = 7 * 24 * 60 * 60; // 7 days
    const HOUR = 60 * 60; // 1 hour
    const MINUTE = 60; // 1 minute
    const SHORT = 10; // 10 seconds

    // Show pages and listen pages - 30 days
    if (
      key.includes('/show/') ||
      key.includes('getStoryBySlugForShow') ||
      key.includes('getStoryByIdForShow') ||
      key.includes('/listen/')
    ) {
      return MONTH;
    }

    // Genres - 30 days
    if (key.includes('/genre')) {
      return MONTH;
    }

    // Stories - 7 days
    if (key.includes('/story')) {
      return WEEK;
    }

    // Progress - 10 seconds
    if (key.includes('/progress')) {
      return SHORT;
    }

    // Ratings/Reviews - 1 minute
    if (key.includes('/rating') || key.includes('/review')) {
      return MINUTE;
    }

    // Bookmarks - 1 minute
    if (key.includes('/bookmark')) {
      return MINUTE;
    }

    // Default - 1 hour
    return HOUR;
  }
}
