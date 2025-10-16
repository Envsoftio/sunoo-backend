/**
 * Cache key prefixes for different entities
 */
export const CACHE_KEYS = {
  USER: 'user',
  USER_PROFILE: 'user:profile',
  STORY: 'story',
  STORIES_LIST: 'stories:list',
  GENRE: 'genre',
  GENRES_LIST: 'genres:list',
  SUBSCRIPTION: 'subscription',
  BOOK: 'book',
  BOOKS_LIST: 'books:list',
  CHAPTER: 'chapter',
  CHAPTERS_LIST: 'chapters:list',
  AUTHOR: 'author',
  AUTHORS_LIST: 'authors:list',
} as const;

/**
 * Default TTL values in seconds
 */
export const CACHE_TTL = {
  VERY_SHORT: 10, // 10 seconds (progress - updates every 3s, cache briefly)
  SHORT: 60, // 1 minute (ratings, reviews)
  MEDIUM: 300, // 5 minutes (lists, feeds)
  LONG: 1800, // 30 minutes (user data)
  VERY_LONG: 3600, // 1 hour (stable content)
  DAY: 86400, // 24 hours (genres, categories)
  WEEK: 604800, // 7 days (stories, chapters - rarely change)
  INDEFINITE: 2592000, // 30 days (essentially indefinite, invalidate manually)
} as const;

/**
 * Helper to build cache keys
 */
export class CacheKeyBuilder {
  static user(userId: string): string {
    return `${CACHE_KEYS.USER}:${userId}`;
  }

  static userProfile(userId: string): string {
    return `${CACHE_KEYS.USER_PROFILE}:${userId}`;
  }

  static story(storyId: string): string {
    return `${CACHE_KEYS.STORY}:${storyId}`;
  }

  static storiesList(page: number = 1, limit: number = 10): string {
    return `${CACHE_KEYS.STORIES_LIST}:${page}:${limit}`;
  }

  static genre(genreId: string): string {
    return `${CACHE_KEYS.GENRE}:${genreId}`;
  }

  static genresList(): string {
    return CACHE_KEYS.GENRES_LIST;
  }

  static book(bookId: string): string {
    return `${CACHE_KEYS.BOOK}:${bookId}`;
  }

  static booksList(page: number = 1, limit: number = 10): string {
    return `${CACHE_KEYS.BOOKS_LIST}:${page}:${limit}`;
  }

  static chapter(chapterId: string): string {
    return `${CACHE_KEYS.CHAPTER}:${chapterId}`;
  }

  static chaptersList(bookId: string): string {
    return `${CACHE_KEYS.CHAPTERS_LIST}:${bookId}`;
  }

  static subscription(userId: string): string {
    return `${CACHE_KEYS.SUBSCRIPTION}:${userId}`;
  }
}
