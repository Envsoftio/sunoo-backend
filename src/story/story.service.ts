import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from '../entities/book.entity';
import { Category } from '../entities/category.entity';
import { Author } from '../entities/author.entity';
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
    @InjectRepository(Author)
    private authorRepository: Repository<Author>,
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
  ) {}

  async getAllStories(userId?: string) {
    try {
      const stories = await this.bookRepository.find({
        order: { created_at: 'DESC' },
      });

      let bookmarks: string[] = [];
      if (userId) {
        const userBookmarks = await this.bookmarkRepository.find({
          where: { userId },
          select: ['bookId'],
        });
        bookmarks = userBookmarks
          .map((b) => b.bookId)
          .filter(Boolean) as string[];
      }

      const sortedData = stories.map((story) => {
        return {
          ...story,
          isBookmarked: userId ? bookmarks.includes(story.id) : false,
          chapters: [], // Temporarily disabled due to TypeORM soft delete issue
          listeners: 0, // Temporarily disabled
          averageRating: null, // Temporarily disabled
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

  async getMostPopularStories() {
    // Temporarily disabled due to entity relationship issues
    return { success: false, message: 'Feature temporarily disabled' };
  }

  async getLatestStories() {
    // Temporarily disabled due to entity relationship issues
    return { success: false, message: 'Feature temporarily disabled' };
  }

  async getStoriesByGenre(genre: string) {
    // Temporarily disabled due to entity relationship issues
    return { success: false, message: 'Feature temporarily disabled' };
  }

  async getStoriesByLanguage(language: string) {
    // Temporarily disabled due to entity relationship issues
    return { success: false, message: 'Feature temporarily disabled' };
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

  async getAuthors() {
    try {
      const authors = await this.authorRepository.find({
        where: {},
        order: { name: 'ASC' },
      });

      return { success: true, data: authors };
    } catch (error) {
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
    // Temporarily disabled due to entity relationship issues
    return { success: false, message: 'Feature temporarily disabled' };
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
    ratingData: { bookId: string; rating: number; review?: string },
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
}
