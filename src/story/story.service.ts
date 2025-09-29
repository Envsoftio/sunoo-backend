import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from '../entities/book.entity';
import { Category } from '../entities/category.entity';
import { Chapter } from '../entities/chapter.entity';
import { Bookmark } from '../entities/bookmark.entity';
import { BookRating } from '../entities/book-rating.entity';
import { UserProgress } from '../entities/user-progress.entity';
import { AudiobookListener } from '../entities/audiobook-listener.entity';

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
    private audiobookListenerRepository: Repository<AudiobookListener>
  ) {}

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

      const sortedData = stories.map(story => {
        const ratings = story.bookRatings || [];
        const averageRating =
          ratings.length > 0
            ? ratings.reduce((sum, r) => sum + (r.rating || 0), 0) /
              ratings.length
            : null;

        return {
          ...story,
          isBookmarked: userId ? bookmarks.includes(story.id) : false,
          chapters:
            story.chapters?.sort((a, b) => (a.order || 0) - (b.order || 0)) ||
            [],
          listeners: story.audiobookListeners?.[0]?.count || 0,
          averageRating,
        };
      });

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

  async getStoryBySlugForShow(slug: string) {
    try {
      const story = await this.bookRepository.findOne({
        where: { slug },
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

      const sortedData = stories.map(story => {
        const ratings = story.bookRatings || [];
        const averageRating =
          ratings.length > 0
            ? ratings.reduce((sum, r) => sum + (r.rating || 0), 0) /
              ratings.length
            : null;

        return {
          ...story,
          isBookmarked: userId ? bookmarks.includes(story.id) : false,
          chapters:
            story.chapters?.sort((a, b) => (a.order || 0) - (b.order || 0)) ||
            [],
          listeners: story.audiobookListeners?.[0]?.count || 0,
          averageRating,
        };
      });

      return { success: true, data: sortedData };
    } catch (error) {
      return { success: false, message: error.message };
    }
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

      const sortedData = stories.map(story => {
        const ratings = story.bookRatings || [];
        const averageRating =
          ratings.length > 0
            ? ratings.reduce((sum, r) => sum + (r.rating || 0), 0) /
              ratings.length
            : null;

        return {
          ...story,
          isBookmarked: userId ? bookmarks.includes(story.id) : false,
          chapters:
            story.chapters?.sort((a, b) => (a.order || 0) - (b.order || 0)) ||
            [],
          listeners: story.audiobookListeners?.[0]?.count || 0,
          averageRating,
        };
      });

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

      const sortedData = stories.map(story => {
        const ratings = story.bookRatings || [];
        const averageRating =
          ratings.length > 0
            ? ratings.reduce((sum, r) => sum + (r.rating || 0), 0) /
              ratings.length
            : null;

        return {
          ...story,
          isBookmarked: userId ? bookmarks.includes(story.id) : false,
          chapters:
            story.chapters?.sort((a, b) => (a.order || 0) - (b.order || 0)) ||
            [],
          listeners: story.audiobookListeners?.[0]?.count || 0,
          averageRating,
        };
      });

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

      const sortedData = stories.map(story => {
        const ratings = story.bookRatings || [];
        const averageRating =
          ratings.length > 0
            ? ratings.reduce((sum, r) => sum + (r.rating || 0), 0) /
              ratings.length
            : null;

        return {
          ...story,
          isBookmarked: userId ? bookmarks.includes(story.id) : false,
          chapters:
            story.chapters?.sort((a, b) => (a.order || 0) - (b.order || 0)) ||
            [],
          listeners: story.audiobookListeners?.[0]?.count || 0,
          averageRating,
        };
      });

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
        where: { bookId: storyId },
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
            ...story,
            isBookmarked: true,
            chapters:
              story.chapters?.sort((a, b) => (a.order || 0) - (b.order || 0)) ||
              [],
            listeners: story.audiobookListeners?.[0]?.count || 0,
            averageRating,
            bookmarkedAt: bookmark.created_at,
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

      let userProgress = await this.userProgressRepository.findOne({
        where: { userId, bookId },
      });

      if (userProgress) {
        userProgress.progress = progress;
        userProgress.currentTime = currentTime;
        userProgress.totalTime = totalTime;
        userProgress.lastListenedAt = new Date();
        if (chapterId) userProgress.chapterId = chapterId;
      } else {
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

  async getProgress(userId: string, bookId: string) {
    try {
      const progress = await this.userProgressRepository.findOne({
        where: { userId, bookId },
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

      const sortedData = stories.map(story => {
        const ratings = story.bookRatings || [];
        const averageRating =
          ratings.length > 0
            ? ratings.reduce((sum, r) => sum + (r.rating || 0), 0) /
              ratings.length
            : null;

        return {
          ...story,
          isBookmarked: userId ? bookmarks.includes(story.id) : false,
          chapters:
            story.chapters?.sort((a, b) => (a.order || 0) - (b.order || 0)) ||
            [],
          listeners: story.audiobookListeners?.[0]?.count || 0,
          averageRating,
        };
      });

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

      const sortedData = stories.map(story => {
        const ratings = story.bookRatings || [];
        const averageRating =
          ratings.length > 0
            ? ratings.reduce((sum, r) => sum + (r.rating || 0), 0) /
              ratings.length
            : null;

        return {
          ...story,
          isBookmarked: userId ? bookmarks.includes(story.id) : false,
          chapters:
            story.chapters?.sort((a, b) => (a.order || 0) - (b.order || 0)) ||
            [],
          listeners: story.audiobookListeners?.[0]?.count || 0,
          averageRating,
        };
      });

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
}
