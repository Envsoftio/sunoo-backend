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
    private audiobookListenerRepository: Repository<AudiobookListener>
  ) {}

  async getAllStories(userId?: string) {
    try {
      const stories = await this.bookRepository.find({
        relations: [
          'chapters',
          'category',
          'author',
          'bookRatings',
          'audiobookListeners',
        ],
        order: { createdAt: 'DESC' },
      });

      let bookmarks: string[] = [];
      if (userId) {
        const userBookmarks = await this.bookmarkRepository.find({
          where: { userId },
          select: ['bookId'],
        });
        bookmarks = userBookmarks.map(b => b.bookId);
      }

      const sortedData = stories.map(story => {
        const ratings = story.bookRatings || [];
        const averageRating =
          ratings.length > 0
            ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
            : null;

        return {
          ...story,
          isBookmarked: userId ? bookmarks.includes(story.id) : false,
          chapters: story.chapters
            .sort((a, b) => a.order - b.order)
            .map(chapter => ({
              ...chapter,
              chapterUrl: `https://your-s3-url.com/${chapter.chapterUrl}`, // Update with actual S3 URL
            })),
          listeners: story.audiobookListeners[0]?.count || 0,
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
        relations: ['chapters', 'category', 'author', 'bookRatings'],
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
        relations: ['chapters', 'category', 'author', 'bookRatings'],
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
    try {
      const stories = await this.bookRepository
        .createQueryBuilder('book')
        .leftJoinAndSelect('book.audiobookListeners', 'listeners')
        .leftJoinAndSelect('book.category', 'category')
        .leftJoinAndSelect('book.author', 'author')
        .orderBy('listeners.count', 'DESC')
        .limit(10)
        .getMany();

      return { success: true, data: stories };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getLatestStories() {
    try {
      const stories = await this.bookRepository.find({
        relations: ['category', 'author'],
        order: { createdAt: 'DESC' },
        take: 10,
      });

      return { success: true, data: stories };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getStoriesByGenre(genre: string) {
    try {
      const stories = await this.bookRepository.find({
        where: { genre },
        relations: ['category', 'author'],
        order: { createdAt: 'DESC' },
      });

      return { success: true, data: stories };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getStoriesByLanguage(language: string) {
    try {
      const stories = await this.bookRepository.find({
        where: { language },
        relations: ['category', 'author'],
        order: { createdAt: 'DESC' },
      });

      return { success: true, data: stories };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getAllCategories() {
    try {
      const categories = await this.categoryRepository.find({
        where: { isActive: true },
        order: { sortOrder: 'ASC' },
      });

      return { success: true, data: categories };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getAuthors() {
    try {
      const authors = await this.authorRepository.find({
        where: { isActive: true },
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
        where: { bookId: storyId, isActive: true },
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
      const bookmarks = await this.bookmarkRepository.find({
        where: { userId },
        relations: ['book', 'book.author', 'book.category'],
      });

      return { success: true, data: bookmarks };
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
        bookRating.review = review;
      } else {
        bookRating = this.bookRatingRepository.create({
          userId,
          bookId,
          rating,
          review,
        });
      }

      await this.bookRatingRepository.save(bookRating);

      return { success: true, message: 'Rating saved successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}
