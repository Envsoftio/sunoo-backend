import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from '../cache.service';
import { CACHE_TTL } from '../cache.constants';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  constructor(private readonly cacheService: CacheService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;

    // Skip caching for non-HTTP contexts, health checks, auth, payment, and subscription endpoints
    if (
      context.getType() !== 'http' ||
      url.includes('/health') ||
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/refresh') ||
      url.includes('/subscription') ||
      url.includes('/payment') ||
      url.includes('/razorpay') ||
      url.includes('/webhook')
    ) {
      return next.handle();
    }

    // Handle GET requests - cache them
    if (method === 'GET') {
      return this.handleGetRequest(request, next);
    }

    // Handle POST/PUT/PATCH/DELETE - invalidate cache
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return this.handleMutationRequest(request, next);
    }

    return next.handle();
  }

  private async handleGetRequest(
    request: any,
    next: CallHandler
  ): Promise<Observable<any>> {
    const cacheKey = this.buildCacheKey(request);
    const startTime = Date.now();

    try {
      // Try to get from cache
      const cachedValue = await this.cacheService.get(cacheKey);
      if (cachedValue !== undefined && cachedValue !== null) {
        const responseTime = Date.now() - startTime;
        this.logger.log(
          `✅ [REDIS CACHE HIT] ${request.url} | Time: ${responseTime}ms | Key: ${cacheKey}`
        );
        return of(cachedValue);
      }

      this.logger.log(
        `❌ [CACHE MISS - DB QUERY] ${request.url} | Key: ${cacheKey}`
      );

      // Cache the response
      return next.handle().pipe(
        tap(data => {
          // Only cache successful responses
          if (data && this.isSuccessResponse(data)) {
            const ttl = this.getTTLForRoute(request.url);
            const responseTime = Date.now() - startTime;
            void this.cacheService.set(cacheKey, data, ttl).then(() => {
              this.logger.log(
                `💾 [CACHED] ${request.url} | Time: ${responseTime}ms | TTL: ${ttl}s | Key: ${cacheKey}`
              );
            });
          } else if (data) {
            const responseTime = Date.now() - startTime;
            this.logger.warn(
              `⚠️  [SKIP CACHE - ERROR RESPONSE] ${request.url} | Time: ${responseTime}ms | Key: ${cacheKey}`
            );
          }
        })
      );
    } catch (error) {
      this.logger.error(`Cache error for ${cacheKey}:`, error);
      return next.handle();
    }
  }

  private handleMutationRequest(
    request: any,
    next: CallHandler
  ): Observable<any> {
    const startTime = Date.now();
    return next.handle().pipe(
      tap(() => {
        void (async () => {
          try {
            // Invalidate cache based on the route
            const patterns = this.getInvalidationPatterns(
              request.url,
              request.user?.id
            );

            if (patterns.length > 0) {
              const responseTime = Date.now() - startTime;
              this.logger.log(
                `🗑️  [CACHE INVALIDATION] ${request.method} ${request.url} | Time: ${responseTime}ms | Patterns: ${patterns.length}`
              );

              for (const pattern of patterns) {
                const deletedCount =
                  await this.cacheService.delPattern(pattern);
                this.logger.log(
                  `   ↳ Pattern: ${pattern} | Deleted: ${deletedCount || 0} keys`
                );
              }
            }
          } catch (error) {
            this.logger.error('Error invalidating cache:', error);
          }
        })();
      })
    );
  }

  private buildCacheKey(request: any): string {
    const { url, user, query } = request;

    // Build base key from URL
    let key = `cache:${url.split('?')[0]}`;

    // Add user ID if authenticated
    if (user?.id) {
      key += `:user:${user.id}`;
    }

    // Add query params (sorted for consistency)
    if (query && Object.keys(query).length > 0) {
      const sortedQuery = Object.keys(query)
        .sort()
        .map(k => `${k}=${query[k]}`)
        .join('&');
      key += `:query:${sortedQuery}`;
    }

    return key;
  }

  private getTTLForRoute(url: string): number {
    // Genres/Categories - rarely change (30 days)
    if (url.includes('/genre')) {
      return CACHE_TTL.INDEFINITE;
    }

    // Story show pages - rarely change (30 days)
    // /show/:id or /show/:slug - individual story pages
    if (url.includes('/show/') || url.includes('/listen/')) {
      return CACHE_TTL.INDEFINITE;
    }

    // /listen route API calls - rarely change (30 days)
    // Check BEFORE individual story routes
    if (
      url.includes('/popular') ||
      url.includes('/Popular') ||
      url.includes('/latest') ||
      url.includes('/Latest') ||
      url.includes('/optimized') ||
      url.includes('/Optimized') ||
      url.includes('/language') ||
      url.includes('/Language') ||
      url.includes('/unique') || // getUniqueLanguages
      url.includes('/Unique') ||
      url.includes('/newEpisodes') || // getStoriesWithNewEpisodes
      url.includes('/newEpisode') ||
      url.includes('/NewEpisode') ||
      url.includes('/editorsPicks') ||
      url.includes('/EditorsPicks') ||
      url.includes('/feed')
    ) {
      return CACHE_TTL.INDEFINITE;
    }

    // Individual stories/books - rarely change (7 days)
    if (url.includes('/story/') || url.includes('/book/')) {
      return CACHE_TTL.WEEK;
    }

    // Chapters - rarely change (7 days)
    if (url.includes('/chapter/')) {
      return CACHE_TTL.WEEK;
    }

    // Ratings and reviews - short TTL (1 minute)
    if (url.includes('/rating') || url.includes('/review')) {
      return CACHE_TTL.SHORT;
    }

    // Categories - rarely change (30 days)
    if (url.includes('/categories')) {
      return CACHE_TTL.INDEFINITE;
    }

    // Stories lists - moderate TTL (5 minutes)
    if (url.includes('/stories')) {
      return CACHE_TTL.MEDIUM;
    }

    // Progress - updates every 3 seconds, cache briefly (10 seconds)
    if (url.includes('/progress')) {
      return CACHE_TTL.VERY_SHORT;
    }

    // User-specific data - changes often (1 minute)
    if (
      url.includes('/bookmarks') ||
      url.includes('/continueListening') ||
      url.includes('/continue')
    ) {
      return CACHE_TTL.SHORT;
    }

    // Default TTL (30 minutes)
    return CACHE_TTL.LONG;
  }

  private getInvalidationPatterns(url: string, userId?: string): string[] {
    const patterns: string[] = [];

    // Story/Book mutations - invalidate story pages, lists, and related caches
    if (
      url.includes('/story') ||
      url.includes('/stories') ||
      url.includes('/books')
    ) {
      patterns.push('cache:/api/stories*'); // Story lists
      patterns.push('cache:/api/story*'); // Individual stories
      patterns.push('cache:/api/books*'); // Books
      patterns.push('cache:/api/audiobooks*'); // Audiobooks
      patterns.push('cache:*/show/*'); // Story show pages (/show/:id, /show/:slug)
      patterns.push('cache:*/listen/*'); // Listen pages
      patterns.push('cache:*/popular*'); // Popular stories (getMostPopularStories)
      patterns.push('cache:*/Popular*'); // Popular stories (case variation)
      patterns.push('cache:*/latest*'); // Latest stories
      patterns.push('cache:*/Latest*'); // Latest stories (case variation)
      patterns.push('cache:*/optimized*'); // Optimized stories (getOptimizedStories)
      patterns.push('cache:*/Optimized*'); // Optimized stories (case variation)
      patterns.push('cache:*/language*'); // Language-specific stories (getOptimizedLanguageStories)
      patterns.push('cache:*/Language*'); // Language-specific stories (case variation)
      patterns.push('cache:*/unique*'); // Unique languages (getUniqueLanguages)
      patterns.push('cache:*/Unique*'); // Unique languages (case variation)
      patterns.push('cache:*/newEpisode*'); // Stories with new episodes
      patterns.push('cache:*/NewEpisode*'); // Stories with new episodes (case variation)
      patterns.push('cache:*/editorsPicks*'); // Editors picks
      patterns.push('cache:*/EditorsPicks*'); // Editors picks (case variation)
      patterns.push('cache:*/feed*'); // Feed
      this.logger.log(
        'Invalidating all /listen route caches (popular/latest/optimized/language/unique/newEpisodes/editorsPicks)'
      );
    }

    // Chapter mutations - invalidate story and chapter caches
    if (url.includes('/chapter')) {
      patterns.push('cache:/api/chapters*'); // Chapter lists
      patterns.push('cache:/api/chapter/*'); // Individual chapters
      patterns.push('cache:/api/story*'); // Parent story needs refresh
      patterns.push('cache:*/show/*'); // Story show pages (chapters changed)
      patterns.push('cache:*/listen/*'); // Listen pages
      this.logger.log('Invalidating chapter caches (including parent story)');
    }

    // Category/Genre mutations - invalidate genres and affected stories
    if (url.includes('/genre') || url.includes('/categories')) {
      patterns.push('cache:/api/genre*'); // Genre lists
      patterns.push('cache:/api/categories*'); // Category lists
      patterns.push('cache:/api/stories*'); // Stories (genre info changed)
      patterns.push('cache:*/show/*'); // Story show pages (genre changed)
      this.logger.log('Invalidating genre caches (including story pages)');
    }

    // Rating mutations - only invalidate rating caches and story pages
    if (url.includes('/rating') || url.includes('/review')) {
      patterns.push('cache:/api/rating*'); // Rating caches
      patterns.push('cache:/api/review*'); // Review caches
      patterns.push('cache:*/show/*'); // Story show pages (rating changed)
      patterns.push('cache:/api/story*'); // Stories show average rating
      this.logger.log('Invalidating rating/review caches');
    }

    // Bookmark mutations - only invalidate THIS user's bookmark cache
    if (url.includes('/bookmark')) {
      if (userId) {
        // User-specific bookmark cache invalidation
        patterns.push(`cache:*/bookmark*:user:${userId}*`);
        this.logger.log(`Invalidating bookmark cache for user: ${userId}`);
      } else {
        // Fallback if no userId
        patterns.push('cache:*/bookmark*');
      }
      // Also clear user's story lists (they show bookmark status)
      if (userId) {
        patterns.push(`cache:*/stories*:user:${userId}*`);
      }
      // Don't invalidate show pages - bookmark is user-specific
    }

    // Progress mutations - only invalidate THIS user's progress cache
    if (url.includes('/progress')) {
      if (userId) {
        // User-specific progress cache invalidation
        patterns.push(`cache:*/progress*:user:${userId}*`);
        // Also invalidate continueListening cache (user's listening history)
        patterns.push(`cache:*/continueListening*:user:${userId}*`);
        patterns.push(`cache:*/continue*:user:${userId}*`);
        this.logger.log(
          `Invalidating progress & continueListening cache for user: ${userId}`
        );
      } else {
        // Fallback if no userId (shouldn't happen)
        patterns.push('cache:*/progress*');
        patterns.push('cache:*/continueListening*');
        patterns.push('cache:*/continue*');
        this.logger.warn(
          'Progress mutation without userId - clearing all progress & continueListening caches'
        );
      }
      // Don't invalidate show pages - progress is user-specific
    }

    // NOTE: Subscription/Payment/Razorpay endpoints are completely excluded from caching
    // No invalidation patterns needed as they're never cached

    // User mutations
    if (url.includes('/users') || url.includes('/auth/profile')) {
      patterns.push('cache:/api/users*');
      patterns.push('cache:/api/auth/profile*');
    }

    return patterns.length > 0 ? patterns : ['cache:*'];
  }

  /**
   * Check if response is successful and should be cached
   */
  private isSuccessResponse(data: any): boolean {
    // If response has a success field, check it explicitly
    if (typeof data === 'object' && data !== null) {
      // Explicit success field check
      if ('success' in data) {
        return data.success === true;
      }

      // If response has statusCode field (HTTP status)
      if ('statusCode' in data) {
        return data.statusCode >= 200 && data.statusCode < 300;
      }

      // If response is an array, consider it successful
      if (Array.isArray(data)) {
        return true;
      }

      // Check for error indicators
      if ('error' in data || 'errors' in data) {
        return false;
      }

      // If response has message field with error-like content
      if ('message' in data && typeof data.message === 'string') {
        const msg = data.message.toLowerCase();
        if (
          msg.includes('error') ||
          msg.includes('fail') ||
          msg.includes('invalid') ||
          msg.includes('not found')
        ) {
          return false;
        }
      }

      // If response has data/results field, consider successful
      if ('data' in data || 'results' in data || 'items' in data) {
        return true;
      }

      // Default to successful for objects without error indicators
      return true;
    }

    // For primitive values, consider successful
    return true;
  }
}
