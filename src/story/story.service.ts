import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Book } from '../entities/book.entity';
import { Category } from '../entities/category.entity';
import { Chapter } from '../entities/chapter.entity';
import { Bookmark } from '../entities/bookmark.entity';
import { BookRating } from '../entities/book-rating.entity';
import { UserProgress } from '../entities/user-progress.entity';
import { AudiobookListener } from '../entities/audiobook-listener.entity';
import { Subscription } from '../entities/subscription.entity';
import { StoryCast } from '../entities/story-cast.entity';
import { CastMember } from '../entities/cast-member.entity';
import { ChapterBookmark } from '../entities/chapter-bookmark.entity';

@Injectable()
export class StoryService {
  constructor(
    @InjectRepository(Book)
    private bookRepository: Repository<Book>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Chapter)
    private chapterRepository: Repository<Chapter>,
    @InjectRepository(Bookmark)
    private bookmarkRepository: Repository<Bookmark>,
    @InjectRepository(BookRating)
    private bookRatingRepository: Repository<BookRating>,
    @InjectRepository(UserProgress)
    private userProgressRepository: Repository<UserProgress>,
    @InjectRepository(AudiobookListener)
    private audiobookListenerRepository: Repository<AudiobookListener>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(StoryCast)
    private storyCastRepository: Repository<StoryCast>,
    @InjectRepository(CastMember)
    private castMemberRepository: Repository<CastMember>,
    @InjectRepository(ChapterBookmark)
    private chapterBookmarkRepository: Repository<ChapterBookmark>,
    private configService: ConfigService
  ) {}

  // Helper function to process chapters with access control
  private processChaptersWithAccess(
    chapters: any[],
    userIsSubscribed: boolean,
    isBookFree: boolean
  ) {
    if (!chapters || !Array.isArray(chapters)) {
      return [];
    }

    return chapters.map((chapter, index) => {
      const canAccess = this.determineChapterAccess(
        index,
        userIsSubscribed,
        isBookFree
      );

      const processedChapter = {
        ...chapter,
        canAccess,
      };

      // Add audio URL for accessible chapters (like Supabase implementation)
      if (canAccess && chapter.chapterUrl) {
        // Construct full S3 HLS URL for audio file
        const awsS3HlsUrl = this.configService.get<string>('app.awsS3HlsUrl');
        processedChapter.chapterUrl = `${awsS3HlsUrl}/${chapter.chapterUrl}`;
      } else {
        // Remove audio-related fields for locked chapters (security)
        delete processedChapter.chapterUrl;
        delete processedChapter.audioUrl;
        delete processedChapter.hlsUrl;
      }

      return processedChapter;
    });
  }

  // Helper function to determine if a chapter can be accessed
  private determineChapterAccess(
    chapterIndex: number,
    userIsSubscribed: boolean,
    isBookFree: boolean
  ) {
    // If user is subscribed, they can access all chapters
    if (userIsSubscribed) {
      return true;
    }

    // If book is free, all chapters are accessible
    if (isBookFree) {
      return true;
    }

    // For non-subscribed users, only first 3 chapters are free
    return chapterIndex < 3;
  }

  async getAllStories(userId?: string) {
    try {
      const stories = await this.bookRepository.find({
        relations: [
          'chapters',
          'category',
          'bookRatings',
          'audiobookListeners',
        ],
        order: { created_at: 'DESC' },
      });

      let bookmarks: string[] = [];
      if (userId) {
        const userBookmarks = await this.bookmarkRepository.find({
          where: { userId },
          select: ['bookId'],
        });
        bookmarks = userBookmarks
          .map(b => b.bookId)
          .filter(Boolean) as string[];
      }

      const sortedData = stories.map(story =>
        this.processStoryData(story, userId, bookmarks)
      );

      return { success: true, data: sortedData };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getStoryById(id: string) {
    try {
      const story = await this.bookRepository.findOne({
        where: { id },
        relations: ['chapters', 'category', 'bookRatings'],
      });

      if (!story) {
        return { success: false, message: 'Story not found' };
      }

      return { success: true, data: story };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getStoryBySlugForShow(slug: string, userId?: string) {
    try {
      const story = await this.bookRepository.findOne({
        where: { slug },
        relations: [
          'chapters',
          'category',
          'bookRatings',
          'audiobookListeners',
        ],
      });

      if (!story) {
        return { success: false, message: 'Story not found' };
      }

      let isBookmarked = false;
      if (userId) {
        const bookmark = await this.bookmarkRepository.findOne({
          where: { userId, bookId: story.id },
        });
        isBookmarked = !!bookmark;
      }

      const ratings = story.bookRatings || [];
      const averageRating =
        ratings.length > 0
          ? ratings.reduce((sum, r) => sum + (r.rating || 0), 0) /
            ratings.length
          : null;

      // Get total listeners count
      const totalListeners =
        story.audiobookListeners?.reduce(
          (sum, listener) => sum + (listener.count || 0),
          0
        ) || 0;

      // Check user subscription status
      let userIsSubscribed = false;
      if (userId) {
        const subscription = await this.subscriptionRepository.findOne({
          where: {
            user_id: userId,
            status: 'active',
          },
        });
        userIsSubscribed = !!subscription;
      }

      // Get cast data
      const storyCasts = await this.storyCastRepository.find({
        where: { story_id: story.id },
        order: { created_at: 'ASC' },
      });

      const casts: any[] = [];
      if (storyCasts.length > 0) {
        for (const storyCast of storyCasts) {
          const castMember = await this.castMemberRepository.findOne({
            where: { id: storyCast.cast_id },
          });

          casts.push({
            id: storyCast.id,
            created_at: storyCast.created_at,
            updated_at: storyCast.updated_at,
            story_id: storyCast.story_id,
            role: storyCast.role,
            cast_id: storyCast.cast_id,
            name:
              castMember?.name ||
              storyCast.name ||
              `Unknown ${storyCast.role || 'Cast Member'}`,
            picture: castMember?.picture || storyCast.picture || '',
          });
        }
      }

      // Return empty array if no cast data exists - frontend will handle defaults

      // Process chapters with access control
      const sortedChapters =
        story.chapters?.sort((a, b) => (a.order || 0) - (b.order || 0)) || [];
      const processedChapters = this.processChaptersWithAccess(
        sortedChapters,
        userIsSubscribed,
        story.isFree || false
      );

      return {
        success: true,
        data: {
          ...story,
          isBookmarked,
          Chapters: processedChapters,
          chapters: story.chapters?.length || 0,
          listeners: totalListeners,
          averageRating,
          casts: casts || [],
          userIsSubscribed,
          isBookFree: story.isFree || false,
        },
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getMostPopularStories(userId?: string) {
    try {
      const stories = await this.bookRepository
        .createQueryBuilder('book')
        .leftJoinAndSelect('book.chapters', 'chapters')
        .leftJoinAndSelect('book.category', 'category')
        .leftJoinAndSelect('book.bookRatings', 'bookRatings')
        .leftJoinAndSelect('book.audiobookListeners', 'audiobookListeners')
        .orderBy('audiobookListeners.count', 'DESC')
        .addOrderBy('book.created_at', 'DESC')
        .getMany();

      let bookmarks: string[] = [];
      if (userId) {
        const userBookmarks = await this.bookmarkRepository.find({
          where: { userId },
          select: ['bookId'],
        });
        bookmarks = userBookmarks
          .map(b => b.bookId)
          .filter(Boolean) as string[];
      }

      const sortedData = stories.map(story =>
        this.processStoryData(story, userId, bookmarks)
      );

      return { success: true, data: sortedData };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // Helper function to process story data consistently
  private processStoryData(
    story: any,
    userId?: string,
    bookmarks: string[] = []
  ) {
    const ratings = story.bookRatings || [];
    const averageRating =
      ratings.length > 0
        ? ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / ratings.length
        : null;

    return {
      ...story,
      isBookmarked: userId ? bookmarks.includes(story.id) : false,
      chapters: story.chapters?.length || 0, // Chapter count for frontend
      listeners: story.audiobookListeners?.[0]?.count || 0,
      averageRating,
      narrator: story.narrator || { data: {} }, // Default narrator structure
      category: story.category?.name || story.category || 'Unknown', // Extract category name
    };
  }

  async getLatestStories(userId?: string) {
    try {
      const stories = await this.bookRepository.find({
        relations: [
          'chapters',
          'category',
          'bookRatings',
          'audiobookListeners',
        ],
        order: { created_at: 'DESC' },
        take: 20, // Limit to latest 20 stories
      });

      let bookmarks: string[] = [];
      if (userId) {
        const userBookmarks = await this.bookmarkRepository.find({
          where: { userId },
          select: ['bookId'],
        });
        bookmarks = userBookmarks
          .map(b => b.bookId)
          .filter(Boolean) as string[];
      }

      const sortedData = stories.map(story =>
        this.processStoryData(story, userId, bookmarks)
      );

      return { success: true, data: sortedData };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getStoriesByGenre(genre: string, userId?: string) {
    try {
      const stories = await this.bookRepository
        .createQueryBuilder('book')
        .leftJoinAndSelect('book.chapters', 'chapters')
        .leftJoinAndSelect('book.category', 'category')
        .leftJoinAndSelect('book.bookRatings', 'bookRatings')
        .leftJoinAndSelect('book.audiobookListeners', 'audiobookListeners')
        .where('category.slug = :genre', { genre })
        .orderBy('book.created_at', 'DESC')
        .getMany();

      let bookmarks: string[] = [];
      if (userId) {
        const userBookmarks = await this.bookmarkRepository.find({
          where: { userId },
          select: ['bookId'],
        });
        bookmarks = userBookmarks
          .map(b => b.bookId)
          .filter(Boolean) as string[];
      }

      const sortedData = stories.map(story =>
        this.processStoryData(story, userId, bookmarks)
      );

      return { success: true, data: sortedData };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getStoriesByLanguage(language: string, userId?: string) {
    try {
      const stories = await this.bookRepository.find({
        where: { language },
        relations: [
          'chapters',
          'category',
          'bookRatings',
          'audiobookListeners',
        ],
        order: { created_at: 'DESC' },
      });

      let bookmarks: string[] = [];
      if (userId) {
        const userBookmarks = await this.bookmarkRepository.find({
          where: { userId },
          select: ['bookId'],
        });
        bookmarks = userBookmarks
          .map(b => b.bookId)
          .filter(Boolean) as string[];
      }

      const sortedData = stories.map(story =>
        this.processStoryData(story, userId, bookmarks)
      );

      return { success: true, data: sortedData };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getAllCategories() {
    try {
      // Use raw SQL query to bypass TypeORM column naming issues
      const categories = await this.categoryRepository.query(`
        SELECT
          id,
          name,
          slug,
          description,
          icon_url,
          color,
          is_active,
          sort_order,
          featured,
          created_at,
          updated_at
        FROM categories
        WHERE is_active = true
        ORDER BY sort_order ASC
      `);

      return { success: true, data: categories };
    } catch (error) {
      console.error('getAllCategories error:', error);
      return { success: false, message: error.message };
    }
  }

  async getChapters(storyId: string) {
    try {
      const chapters = await this.chapterRepository.find({
        where: {
          bookId: storyId,
          deleted_at: IsNull(), // Exclude soft-deleted chapters
        },
        order: { order: 'ASC' },
      });

      return { success: true, data: chapters };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async createBookmark(userId: string, bookId: string) {
    try {
      const existingBookmark = await this.bookmarkRepository.findOne({
        where: { userId, bookId },
      });

      if (existingBookmark) {
        return { success: false, message: 'Bookmark already exists' };
      }

      const bookmark = this.bookmarkRepository.create({ userId, bookId });
      await this.bookmarkRepository.save(bookmark);

      return { success: true, message: 'Bookmark created successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async removeBookmark(userId: string, bookId: string) {
    try {
      await this.bookmarkRepository.delete({ userId, bookId });
      return { success: true, message: 'Bookmark removed successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getBookmarks(userId: string) {
    try {
      const bookmarks = await this.bookmarkRepository
        .createQueryBuilder('bookmark')
        .leftJoinAndSelect('bookmark.book', 'book')
        .leftJoinAndSelect('book.chapters', 'chapters')
        .leftJoinAndSelect('book.category', 'category')
        .leftJoinAndSelect('book.bookRatings', 'bookRatings')
        .leftJoinAndSelect('book.audiobookListeners', 'audiobookListeners')
        .where('bookmark.userId = :userId', { userId })
        .orderBy('bookmark.created_at', 'DESC')
        .getMany();

      const sortedData = bookmarks
        .map(bookmark => {
          const story = bookmark.book;
          if (!story) return null;

          const ratings = story.bookRatings || [];
          const averageRating =
            ratings.length > 0
              ? ratings.reduce((sum, r) => sum + (r.rating || 0), 0) /
                ratings.length
              : null;

          return {
            id: story.id,
            isBookmarked: true,
            averageRating,
            bookmarkedAt: bookmark.created_at,
            Books: {
              id: story.id,
              title: story.title,
              bookCoverUrl: story.bookCoverUrl,
              language: story.language,
              bookDescription: story.bookDescription,
              duration: story.duration,
              isPublished: story.isPublished,
              isFree: story.isFree,
              contentRating: story.contentRating,
              tags: story.tags,
              slug: story.slug,
              created_at: story.created_at,
              updated_at: story.updated_at,
              categoryId: story.categoryId,
              category: story.category,
              Chapters:
                story.chapters?.sort(
                  (a, b) => (a.order || 0) - (b.order || 0)
                ) || [],
              AudiobookListeners: story.audiobookListeners || [],
              bookRatings: story.bookRatings || [],
            },
          };
        })
        .filter(Boolean);

      return { success: true, data: sortedData };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async saveProgress(userId: string, progressData: any) {
    try {
      const { bookId, chapterId, progress, currentTime, totalTime } =
        progressData;

      // Find existing progress for this specific user, book, and chapter
      let userProgress = await this.userProgressRepository.findOne({
        where: { userId, bookId, chapterId },
      });

      if (userProgress) {
        // Update existing progress
        userProgress.progress = progress;
        userProgress.currentTime = currentTime;
        userProgress.totalTime = totalTime;
        userProgress.lastListenedAt = new Date();
      } else {
        // Create new progress record
        userProgress = this.userProgressRepository.create({
          userId,
          bookId,
          chapterId,
          progress,
          currentTime,
          totalTime,
          lastListenedAt: new Date(),
        });
      }

      await this.userProgressRepository.save(userProgress);

      return { success: true, message: 'Progress saved successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getProgress(userId: string, bookId?: string, chapterId?: string) {
    try {
      const whereCondition: any = { userId };
      if (bookId) {
        whereCondition.bookId = bookId;
      }
      if (chapterId) {
        whereCondition.chapterId = chapterId;
      }

      const progress = await this.userProgressRepository.findOne({
        where: whereCondition,
      });

      return { success: true, data: progress || null };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async saveRating(
    userId: string,
    ratingData: { bookId: string; rating: number; review?: string }
  ) {
    try {
      const { bookId, rating, review } = ratingData;

      let bookRating = await this.bookRatingRepository.findOne({
        where: { userId, bookId },
      });

      if (bookRating) {
        bookRating.rating = rating;
        bookRating.comment = review;
      } else {
        bookRating = this.bookRatingRepository.create({
          userId,
          bookId,
          rating,
          comment: review,
        });
      }

      await this.bookRatingRepository.save(bookRating);

      return { success: true, message: 'Rating saved successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getStoryByIdForShow(id: string, userId?: string) {
    try {
      const story = await this.bookRepository.findOne({
        where: { id },
        relations: [
          'chapters',
          'category',
          'bookRatings',
          'audiobookListeners',
        ],
      });

      if (!story) {
        return { success: false, message: 'Story not found' };
      }

      let isBookmarked = false;
      if (userId) {
        const bookmark = await this.bookmarkRepository.findOne({
          where: { userId, bookId: id },
        });
        isBookmarked = !!bookmark;
      }

      const ratings = story.bookRatings || [];
      const averageRating =
        ratings.length > 0
          ? ratings.reduce((sum, r) => sum + (r.rating || 0), 0) /
            ratings.length
          : null;

      return {
        success: true,
        data: {
          ...story,
          isBookmarked,
          chapters:
            story.chapters?.sort((a, b) => (a.order || 0) - (b.order || 0)) ||
            [],
          listeners: story.audiobookListeners?.[0]?.count || 0,
          averageRating,
        },
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getBookmarkStatus(userId: string, bookId: string) {
    try {
      const bookmark = await this.bookmarkRepository.findOne({
        where: { userId, bookId },
      });

      return { success: true, data: { isBookmarked: !!bookmark } };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getChapterCount(id: string) {
    try {
      const count = await this.chapterRepository.count({
        where: { bookId: id },
      });

      return { success: true, count };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getUniqueLanguages() {
    try {
      const languages = await this.bookRepository
        .createQueryBuilder('book')
        .select('DISTINCT book.language', 'language')
        .where('book.language IS NOT NULL')
        .getRawMany();

      return { success: true, data: languages.map(l => l.language) };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getOptimizedStories(userId?: string) {
    try {
      // Get all stories in one optimized query
      const [continueListening, newReleases, mostPopular, editorsPicks] =
        await Promise.all([
          this.getContinueListeningStories(userId || ''),
          this.getLatestStories(userId),
          this.getMostPopularStoriesThisWeek(userId || ''),
          this.getStoriesWithNewEpisodes(userId || ''),
        ]);

      return {
        success: true,
        data: {
          continueListening: continueListening.success
            ? continueListening.data
            : [],
          newReleases: newReleases.success ? newReleases.data : [],
          mostPopular: mostPopular.success ? mostPopular.data : [],
          editorsPicks: editorsPicks.success ? editorsPicks.data : [],
        },
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getOptimizedLanguageStories(languages: string[], userId?: string) {
    try {
      const storiesByLanguage: { [key: string]: any[] } = {};

      // Fetch stories for each language in parallel
      const languagePromises = languages.map(async language => {
        const result = await this.getStoriesByLanguage(language, userId);
        return {
          language,
          stories: result.success ? result.data : [],
        };
      });

      const results = await Promise.all(languagePromises);

      // Convert to object format
      results.forEach(({ language, stories }) => {
        storiesByLanguage[language] = stories || [];
      });

      return { success: true, data: storiesByLanguage };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getContinueListeningStories(userId: string) {
    try {
      const progressStories = await this.userProgressRepository
        .createQueryBuilder('progress')
        .leftJoinAndSelect('progress.book', 'book')
        .leftJoinAndSelect('book.chapters', 'chapters')
        .leftJoinAndSelect('book.category', 'category')
        .leftJoinAndSelect('book.bookRatings', 'bookRatings')
        .leftJoinAndSelect('book.audiobookListeners', 'audiobookListeners')
        .where('progress.userId = :userId', { userId })
        .andWhere('progress.progress > 0')
        .orderBy('progress.lastListenedAt', 'DESC')
        .getMany();

      const stories = progressStories.map(progress => {
        const story = progress.book;
        const ratings = story.bookRatings || [];
        const averageRating =
          ratings.length > 0
            ? ratings.reduce((sum, r) => sum + (r.rating || 0), 0) /
              ratings.length
            : null;

        return {
          ...story,
          isBookmarked: true,
          chapters:
            story.chapters?.sort((a, b) => (a.order || 0) - (b.order || 0)) ||
            [],
          listeners: story.audiobookListeners?.[0]?.count || 0,
          averageRating,
          userProgress: {
            progress: progress.progress,
            currentTime: progress.currentTime,
            totalTime: progress.totalTime,
            lastListenedAt: progress.lastListenedAt,
          },
        };
      });

      return { success: true, data: stories };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getStoriesWithNewEpisodes(userId: string) {
    try {
      // Get stories with chapters added in the last 7 days
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const stories = await this.bookRepository
        .createQueryBuilder('book')
        .leftJoinAndSelect('book.chapters', 'chapters')
        .leftJoinAndSelect('book.category', 'category')
        .leftJoinAndSelect('book.bookRatings', 'bookRatings')
        .leftJoinAndSelect('book.audiobookListeners', 'audiobookListeners')
        .where('chapters.created_at > :weekAgo', { weekAgo })
        .orderBy('chapters.created_at', 'DESC')
        .getMany();

      let bookmarks: string[] = [];
      if (userId) {
        const userBookmarks = await this.bookmarkRepository.find({
          where: { userId },
          select: ['bookId'],
        });
        bookmarks = userBookmarks
          .map(b => b.bookId)
          .filter(Boolean) as string[];
      }

      const sortedData = stories.map(story =>
        this.processStoryData(story, userId, bookmarks)
      );

      return { success: true, data: sortedData };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getMostPopularStoriesThisWeek(userId: string) {
    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const stories = await this.bookRepository
        .createQueryBuilder('book')
        .leftJoinAndSelect('book.chapters', 'chapters')
        .leftJoinAndSelect('book.category', 'category')
        .leftJoinAndSelect('book.bookRatings', 'bookRatings')
        .leftJoinAndSelect('book.audiobookListeners', 'audiobookListeners')
        .leftJoinAndSelect('book.userProgress', 'userProgress')
        .where('userProgress.lastListenedAt > :weekAgo', { weekAgo })
        .orderBy('audiobookListeners.count', 'DESC')
        .addOrderBy('book.created_at', 'DESC')
        .getMany();

      let bookmarks: string[] = [];
      if (userId) {
        const userBookmarks = await this.bookmarkRepository.find({
          where: { userId },
          select: ['bookId'],
        });
        bookmarks = userBookmarks
          .map(b => b.bookId)
          .filter(Boolean) as string[];
      }

      const sortedData = stories.map(story =>
        this.processStoryData(story, userId, bookmarks)
      );

      return { success: true, data: sortedData };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getMostPopularStoriesByUniqueListeners(userId?: string) {
    try {
      const stories = await this.bookRepository
        .createQueryBuilder('book')
        .leftJoinAndSelect('book.chapters', 'chapters')
        .leftJoinAndSelect('book.category', 'category')
        .leftJoinAndSelect('book.bookRatings', 'bookRatings')
        .leftJoinAndSelect('book.audiobookListeners', 'audiobookListeners')
        .where('book.isPublished = :isPublished', { isPublished: true })
        .orderBy('audiobookListeners.count', 'DESC')
        .addOrderBy('book.created_at', 'DESC')
        .getMany();

      let bookmarks: string[] = [];
      if (userId) {
        const userBookmarks = await this.bookmarkRepository.find({
          where: { userId },
          select: ['bookId'],
        });
        bookmarks = userBookmarks
          .map(b => b.bookId)
          .filter(Boolean) as string[];
      }

      const sortedData = stories.map(story =>
        this.processStoryData(story, userId, bookmarks)
      );

      return { success: true, data: sortedData };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getGenreStats() {
    try {
      const stats = await this.categoryRepository
        .createQueryBuilder('category')
        .leftJoin('category.books', 'book')
        .select('category.name', 'name')
        .addSelect('category.slug', 'slug')
        .addSelect('COUNT(book.id)', 'storyCount')
        .groupBy('category.id, category.name, category.slug')
        .orderBy('storyCount', 'DESC')
        .getRawMany();

      return { success: true, data: stats };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getFeaturedGenres() {
    try {
      const featuredGenres = await this.categoryRepository.find({
        where: { featured: true },
        order: { sort_order: 'ASC' },
      });

      return { success: true, data: featuredGenres };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // Story Management Methods
  async handleAddStories(
    storyData: { title: string; language: string; description: string },
    _userId: string
  ) {
    try {
      const story = this.bookRepository.create({
        title: storyData.title,
        language: storyData.language,
        bookDescription: storyData.description,
        slug: storyData.title.toLowerCase().replace(/\s+/g, '-'),
        isPublished: true,
      });

      const savedStory = await this.bookRepository.save(story);
      return {
        success: true,
        data: savedStory,
        message: 'Story added successfully',
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async handleEditStories(
    storyData: {
      id: string;
      title: string;
      language: string;
      description: string;
    },
    _userId: string
  ) {
    try {
      const story = await this.bookRepository.findOne({
        where: { id: storyData.id },
      });
      if (!story) {
        return { success: false, message: 'Story not found' };
      }

      // For now, allow editing without author check (can be added later)
      story.title = storyData.title;
      story.language = storyData.language;
      story.bookDescription = storyData.description;
      story.slug = storyData.title.toLowerCase().replace(/\s+/g, '-');

      const updatedStory = await this.bookRepository.save(story);
      return {
        success: true,
        data: updatedStory,
        message: 'Story updated successfully',
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async handleAddChapterInStory(chapters: any[], _userId: string) {
    try {
      const savedChapters: any[] = [];

      for (const chapterData of chapters) {
        const chapter = this.chapterRepository.create({
          ...chapterData,
        });
        const savedChapter = await this.chapterRepository.save(chapter);
        savedChapters.push(savedChapter);
      }

      return {
        success: true,
        data: savedChapters,
        message: 'Chapters added successfully',
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async updateStoryCover(storyId: string, _userId: string) {
    try {
      const story = await this.bookRepository.findOne({
        where: { id: storyId },
      });
      if (!story) {
        return { success: false, message: 'Story not found' };
      }

      // Update cover logic here (you might want to handle file upload)
      // For now, just return success
      return { success: true, message: 'Cover updated successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async deleteChapter(chapterId: string, _userId: string) {
    try {
      const chapter = await this.chapterRepository.findOne({
        where: { id: chapterId },
        relations: ['book'],
      });

      if (!chapter) {
        return { success: false, message: 'Chapter not found' };
      }

      // For now, allow deletion without permission check (can be added later)
      await this.chapterRepository.remove(chapter);
      return { success: true, message: 'Chapter deleted successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // Additional methods for frontend compatibility
  async getAudiobooks(userId?: string) {
    try {
      const stories = await this.bookRepository.find({
        where: { isPublished: true },
        relations: ['category', 'bookRatings', 'audiobookListeners'],
        order: { created_at: 'DESC' },
      });

      let bookmarks: string[] = [];
      if (userId) {
        const userBookmarks = await this.bookmarkRepository.find({
          where: { userId },
          select: ['bookId'],
        });
        bookmarks = userBookmarks
          .map(b => b.bookId)
          .filter((id): id is string => Boolean(id));
      }

      const processedStories = stories.map(story => ({
        ...story,
        isBookmarked: userId ? bookmarks.includes(story.id) : false,
        averageRating:
          story.bookRatings?.length > 0
            ? story.bookRatings.reduce(
                (sum, rating) => sum + (rating.rating || 0),
                0
              ) / story.bookRatings.length
            : 0,
      }));

      return { success: true, data: processedStories };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async searchStories(query: string, userId?: string, page = 1, limit = 10) {
    try {
      const stories = await this.bookRepository
        .createQueryBuilder('book')
        .leftJoinAndSelect('book.category', 'category')
        .leftJoinAndSelect('book.bookRatings', 'bookRatings')
        .where('book.title ILIKE :query OR book.description ILIKE :query', {
          query: `%${query}%`,
        })
        .andWhere('book.isPublished = :published', { published: true })
        .orderBy('book.created_at', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .getMany();

      return { success: true, data: stories };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getFeaturedStories(_userId?: string) {
    try {
      // Get stories with highest ratings or most listeners
      const stories = await this.bookRepository.find({
        where: { isPublished: true },
        relations: ['category', 'bookRatings', 'audiobookListeners'],
        order: { created_at: 'DESC' },
        take: 10,
      });

      return { success: true, data: stories };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getFeaturedCategories() {
    try {
      const categories = await this.categoryRepository.find({
        where: { is_active: true },
        order: { created_at: 'DESC' },
        take: 10,
      });

      return { success: true, data: categories };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getCategoryStats() {
    try {
      const stats = await this.categoryRepository
        .createQueryBuilder('category')
        .leftJoin('category.books', 'book')
        .select('category.name', 'name')
        .addSelect('COUNT(book.id)', 'storyCount')
        .where('category.is_active = :active', { active: true })
        .groupBy('category.id, category.name')
        .getRawMany();

      return { success: true, data: stats };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  getAllAuthors(_page = 1, _limit = 10) {
    // This would need to be implemented based on your author system
    return {
      success: true,
      data: [],
      pagination: { page: _page, limit: _limit, total: 0, pages: 0 },
    };
  }

  getAuthorById(_id: string) {
    // This would need to be implemented based on your author system
    return { success: true, data: null };
  }

  getAllNarrators(_page = 1, _limit = 10) {
    // This would need to be implemented based on your narrator system
    return {
      success: true,
      data: [],
      pagination: { page: _page, limit: _limit, total: 0, pages: 0 },
    };
  }

  getNarratorById(_id: string) {
    // This would need to be implemented based on your narrator system
    return { success: true, data: null };
  }

  async getStoryBySlug(slug: string, userId?: string) {
    try {
      // Use query builder to ensure proper slug matching
      const story = await this.bookRepository
        .createQueryBuilder('book')
        .leftJoinAndSelect('book.category', 'category')
        .leftJoinAndSelect('book.chapters', 'chapters')
        .leftJoinAndSelect('book.bookRatings', 'bookRatings')
        .leftJoinAndSelect('book.audiobookListeners', 'audiobookListeners')
        .where('book.isPublished = :isPublished', { isPublished: true })
        .andWhere('LOWER(book.slug) = LOWER(:slug)', { slug })
        .getOne();

      if (!story) {
        return { success: false, message: 'Story not found' };
      }

      // Check user subscription status
      let userIsSubscribed = false;
      let isBookmarked = false;

      if (userId) {
        // Check if user has active subscription
        const subscription = await this.subscriptionRepository.findOne({
          where: {
            user_id: userId,
            status: 'active',
          },
        });
        userIsSubscribed = !!subscription;

        // Check if story is bookmarked
        const bookmark = await this.bookmarkRepository.findOne({
          where: {
            userId,
            bookId: story.id,
          },
        });
        isBookmarked = !!bookmark;
      }

      // Calculate average rating
      const ratings = story.bookRatings || [];
      const averageRating =
        ratings.length > 0
          ? ratings.reduce((sum, r) => sum + (r.rating || 0), 0) /
            ratings.length
          : 0;

      // Get total listeners count
      const totalListeners =
        story.audiobookListeners?.reduce(
          (sum, listener) => sum + (listener.count || 0),
          0
        ) || 0;

      // First, let's check what's in the story_casts table
      const storyCasts = await this.storyCastRepository.find({
        where: { story_id: story.id },
        order: { created_at: 'ASC' },
      });

      // Try to find cast members for each cast_id
      const casts: any[] = [];
      if (storyCasts.length > 0) {
        for (const storyCast of storyCasts) {
          const castMember = await this.castMemberRepository.findOne({
            where: { id: storyCast.cast_id },
          });

          casts.push({
            id: storyCast.id,
            created_at: storyCast.created_at,
            updated_at: storyCast.updated_at,
            story_id: storyCast.story_id,
            role: storyCast.role,
            cast_id: storyCast.cast_id,
            // Use cast member data if available, otherwise use story cast data or fallbacks
            name:
              castMember?.name ||
              storyCast.name ||
              `Unknown ${storyCast.role || 'Cast Member'}`,
            picture: castMember?.picture || storyCast.picture,
          });
        }
      }

      // Return empty array if no cast data exists - frontend will handle defaults

      // Process chapters with access control
      const sortedChapters =
        story.chapters?.sort((a, b) => (a.order || 0) - (b.order || 0)) || [];
      const processedChapters = this.processChaptersWithAccess(
        sortedChapters,
        userIsSubscribed,
        story.isFree || false
      );

      // Process the story data
      const processedStory = {
        ...story,
        userIsSubscribed,
        isBookmarked,
        isBookFree: story.isFree || false,
        averageRating,
        listeners: totalListeners,
        Chapters: processedChapters, // Use processed chapters with access control
        casts: casts || [], // Add cast data
      };

      return { success: true, data: processedStory };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getStoryRatings(storyId: string, page = 1, limit = 10) {
    try {
      const ratings = await this.bookRatingRepository.find({
        where: { bookId: storyId },
        relations: ['user'],
        order: { created_at: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });

      return { success: true, data: ratings };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async trackUserListening(userId: string, body: any) {
    try {
      // Track user listening progress
      const progress = this.userProgressRepository.create({
        userId,
        bookId: body.storyId,
        chapterId: body.chapterId,
        progress: body.progress,
        currentTime: body.progress,
        totalTime: 0, // Will be updated when audio loads
      });

      await this.userProgressRepository.save(progress);

      // Track unique listener count (like Supabase implementation)
      const existingListener = await this.audiobookListenerRepository.findOne({
        where: { userId, bookId: body.storyId },
      });

      if (!existingListener) {
        const listener = this.audiobookListenerRepository.create({
          userId,
          bookId: body.storyId,
          count: 1,
        });
        await this.audiobookListenerRepository.save(listener);
      }

      return { success: true, message: 'Listening tracked successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async createListener(userId: string, bookId: string) {
    try {
      const existingListener = await this.audiobookListenerRepository.findOne({
        where: { userId, bookId },
      });

      if (!existingListener) {
        const listener = this.audiobookListenerRepository.create({
          userId,
          bookId,
          count: 1,
        });
        await this.audiobookListenerRepository.save(listener);
        return {
          success: true,
          message: 'Listener record created successfully',
        };
      }

      return { success: true, message: 'Listener already exists' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getChapterBookmarks(userId: string, bookId: string, chapterId: string) {
    try {
      const bookmarks = await this.chapterBookmarkRepository.find({
        where: { userId, bookId, chapterId },
        order: { audioTimeStamp: 'ASC' },
      });

      return { success: true, data: bookmarks };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async createChapterBookmark(userId: string, body: any) {
    try {
      const { bookId, chapterId, bookmarkText, audioTimeStamp } = body;

      const bookmark = this.chapterBookmarkRepository.create({
        userId,
        bookId,
        chapterId,
        bookmarkText,
        audioTimeStamp: audioTimeStamp.toString(),
      });

      await this.chapterBookmarkRepository.save(bookmark);

      return {
        success: true,
        data: bookmark,
        message: 'Chapter bookmark created successfully',
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async deleteChapterBookmark(userId: string, bookmarkId: string) {
    try {
      const bookmark = await this.chapterBookmarkRepository.findOne({
        where: { id: bookmarkId, userId },
      });

      if (!bookmark) {
        return { success: false, message: 'Bookmark not found' };
      }

      await this.chapterBookmarkRepository.remove(bookmark);

      return {
        success: true,
        message: 'Chapter bookmark deleted successfully',
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async toggleBookmark(userId: string, storyId: string) {
    try {
      const existingBookmark = await this.bookmarkRepository.findOne({
        where: { userId, bookId: storyId },
      });

      if (existingBookmark) {
        await this.bookmarkRepository.remove(existingBookmark);
        return {
          success: true,
          message: 'Bookmark removed',
          bookmarked: false,
        };
      } else {
        const bookmark = this.bookmarkRepository.create({
          userId,
          bookId: storyId,
        });
        await this.bookmarkRepository.save(bookmark);
        return { success: true, message: 'Bookmark added', bookmarked: true };
      }
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async deleteStory(storyId: string, _userId: string) {
    try {
      const story = await this.bookRepository.findOne({
        where: { id: storyId },
      });

      if (!story) {
        return { success: false, message: 'Story not found' };
      }

      await this.bookRepository.remove(story);
      return { success: true, message: 'Story deleted successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}
