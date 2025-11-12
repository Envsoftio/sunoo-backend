import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../entities/category.entity';
import { Book } from '../entities/book.entity';

@Injectable()
export class GenreService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Book)
    private bookRepository: Repository<Book>
  ) {}

  async getAllGenres() {
    try {
      const genres = await this.categoryRepository.find({
        where: { is_active: true },
        order: { sort_order: 'ASC', name: 'ASC' },
      });

      return { success: true, data: genres };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getGenreById(id: string) {
    try {
      const genre = await this.categoryRepository.findOne({
        where: { id, is_active: true },
      });

      if (!genre) {
        return { success: false, message: 'Genre not found' };
      }

      return { success: true, data: genre };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getGenreBySlug(slug: string) {
    try {
      const genre = await this.categoryRepository.findOne({
        where: { slug, is_active: true },
      });

      if (!genre) {
        return { success: false, message: 'Genre not found' };
      }

      return { success: true, data: genre };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getStoriesByGenre(
    genreSlug: string,
    userId?: string,
    page = 1,
    limit = 10
  ) {
    try {
      const genre = await this.categoryRepository.findOne({
        where: { slug: genreSlug, is_active: true },
      });

      if (!genre) {
        return { success: false, message: 'Genre not found' };
      }

      // Optimized query with aggregations
      const query = this.bookRepository
        .createQueryBuilder('book')
        .leftJoin('book.category', 'category')
        .leftJoin('book.chapters', 'chapters')
        .leftJoin('book.bookRatings', 'bookRatings')
        .leftJoin('book.audiobookListeners', 'audiobookListeners')
        .select([
          'book.id',
          'book.title',
          'book.bookCoverUrl',
          'book.language',
          'book.bookDescription',
          'book.duration',
          'book.isPublished',
          'book.isFree',
          'book.contentRating',
          'book.tags',
          'book.slug',
          'book.created_at',
          'book.updated_at',
          'book.categoryId',
          'category.name',
          'category.slug',
        ])
        .addSelect('COUNT(DISTINCT chapters.id)', 'chapterCount')
        .addSelect('COALESCE(AVG(bookRatings.rating), 0)', 'averageRating')
        .addSelect(
          'COALESCE(SUM(audiobookListeners.count), 0)',
          'listenerCount'
        )
        .where('book.categoryId = :categoryId', { categoryId: genre.id })
        .andWhere('book.isPublished = :isPublished', { isPublished: true })
        .groupBy('book.id')
        .addGroupBy('category.id')
        .orderBy('book.created_at', 'DESC')
        .limit(limit)
        .offset((page - 1) * limit);

      // Get total count efficiently
      const totalQuery = this.bookRepository
        .createQueryBuilder('book')
        .where('book.categoryId = :categoryId', { categoryId: genre.id })
        .andWhere('book.isPublished = :isPublished', { isPublished: true });

      const [result, total] = await Promise.all([
        query.getRawAndEntities(),
        totalQuery.getCount(),
      ]);

      // Get user bookmarks if userId provided
      let bookmarks: string[] = [];
      if (userId) {
        const userBookmarks = await this.bookRepository
          .createQueryBuilder('book')
          .leftJoin('book.bookmarks', 'bookmark')
          .where('bookmark.userId = :userId', { userId })
          .andWhere('book.categoryId = :categoryId', { categoryId: genre.id })
          .andWhere('book.isPublished = :isPublished', { isPublished: true })
          .select('book.id')
          .getRawMany();

        bookmarks = userBookmarks
          .map(b => b.book_id)
          .filter((id): id is string => Boolean(id));
      }

      // Get genre statistics (total chapters, listeners, ratings across all stories)
      const statsQuery = this.bookRepository
        .createQueryBuilder('book')
        .leftJoin('book.chapters', 'chapters')
        .leftJoin('book.bookRatings', 'bookRatings')
        .leftJoin('book.audiobookListeners', 'audiobookListeners')
        .select('COUNT(DISTINCT chapters.id)', 'totalChapters')
        .addSelect(
          'COALESCE(SUM(audiobookListeners.count), 0)',
          'totalListeners'
        )
        .addSelect('COALESCE(AVG(bookRatings.rating), 0)', 'averageRating')
        .addSelect('COUNT(DISTINCT bookRatings.id)', 'totalRatings')
        .where('book.categoryId = :categoryId', { categoryId: genre.id })
        .andWhere('book.isPublished = :isPublished', { isPublished: true });

      const statsResult = await statsQuery.getRawOne();

      // Process results with aggregated data
      const processedStories = result.entities.map((story, index) => ({
        ...story,
        isBookmarked: userId ? bookmarks.includes(story.id) : false,
        chapters: parseInt(result.raw[index]?.chapterCount || '0'),
        listeners: parseInt(result.raw[index]?.listenerCount || '0'),
        averageRating:
          parseFloat(result.raw[index]?.averageRating || '0') || null,
        narrator: { data: {} }, // Default narrator structure
        category: story.category?.name || genre.name,
      }));

      return {
        success: true,
        data: processedStories,
        category: {
          id: genre.id,
          name: genre.name,
          slug: genre.slug,
          description: genre.description,
          icon_url: genre.icon_url,
          color: genre.color,
        },
        genreStats: {
          totalStories: total,
          totalChapters: parseInt(statsResult?.totalChapters || '0'),
          totalListeners: parseInt(statsResult?.totalListeners || '0'),
          averageRating: parseFloat(statsResult?.averageRating || '0') || null,
          totalRatings: parseInt(statsResult?.totalRatings || '0'),
        },
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getFeaturedGenres() {
    try {
      // Optimized single query with aggregations
      const result = await this.categoryRepository
        .createQueryBuilder('category')
        .leftJoin('category.books', 'book', 'book.isPublished = :isPublished', {
          isPublished: true,
        })
        .leftJoin('book.bookRatings', 'rating')
        .leftJoin('book.audiobookListeners', 'listeners')
        .select([
          'category.id',
          'category.name',
          'category.slug',
          'category.description',
          'category.icon_url',
          'category.color',
          'category.sort_order',
          'category.featured',
          'category.is_active',
          'category.created_at',
          'category.updated_at',
        ])
        .addSelect('COUNT(DISTINCT book.id)', 'storyCount')
        .addSelect('COALESCE(AVG(rating.rating), 0)', 'averageRating')
        .addSelect('COUNT(DISTINCT rating.id)', 'ratingCount')
        .addSelect('COALESCE(SUM(listeners.count), 0)', 'totalListeners')
        .where('category.is_active = :active', { active: true })
        .andWhere('category.featured = :featured', { featured: true })
        .groupBy('category.id')
        .orderBy('category.sort_order', 'ASC')
        .addOrderBy('category.name', 'ASC')
        .limit(10)
        .getRawAndEntities();

      // Process results with aggregated data
      const genresWithStats = result.entities.map((genre, index) => ({
        ...genre,
        storyCount: parseInt(result.raw[index]?.storyCount || '0'),
        averageRating: parseFloat(
          parseFloat(result.raw[index]?.averageRating || '0').toFixed(1)
        ),
        ratingCount: parseInt(result.raw[index]?.ratingCount || '0'),
        totalListeners: parseInt(result.raw[index]?.totalListeners || '0'),
      }));

      return { success: true, data: genresWithStats };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getGenreStats() {
    try {
      // Optimized single query with aggregations for frontend display
      const result = await this.categoryRepository
        .createQueryBuilder('category')
        .leftJoin('category.books', 'book', 'book.isPublished = :isPublished', {
          isPublished: true,
        })
        .leftJoin('book.bookRatings', 'rating')
        .leftJoin('book.audiobookListeners', 'listeners')
        .select([
          'category.id',
          'category.name',
          'category.slug',
          'category.description',
          'category.icon_url',
          'category.color',
        ])
        .addSelect('COUNT(DISTINCT book.id)', 'storyCount')
        .addSelect('COALESCE(AVG(rating.rating), 0)', 'averageRating')
        .addSelect('COALESCE(SUM(listeners.count), 0)', 'listenerCount')
        .where('category.is_active = :active', { active: true })
        .groupBy('category.id')
        .orderBy('COUNT(DISTINCT book.id)', 'DESC')
        .addOrderBy('category.name', 'ASC')
        .setParameter('isPublished', true)
        .setParameter('active', true)
        .getRawAndEntities();

      // Process results with aggregated data
      const stats = result.entities.map((category, index) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        iconUrl: category.icon_url,
        color: category.color,
        storyCount: parseInt(result.raw[index]?.storyCount || '0'),
        averageRating: parseFloat(
          parseFloat(result.raw[index]?.averageRating || '0').toFixed(1)
        ),
        listenerCount: parseInt(result.raw[index]?.listenerCount || '0'),
      }));

      return { success: true, data: stats };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async createGenre(genreData: any) {
    try {
      const genre = this.categoryRepository.create({
        ...genreData,
        is_active: true,
        featured: false,
      });

      const savedGenre = await this.categoryRepository.save(genre);
      return { success: true, data: savedGenre };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async updateGenre(id: string, genreData: any) {
    try {
      const genre = await this.categoryRepository.findOne({
        where: { id },
      });

      if (!genre) {
        return { success: false, message: 'Genre not found' };
      }

      Object.assign(genre, genreData);
      const updatedGenre = await this.categoryRepository.save(genre);

      return { success: true, data: updatedGenre };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async deleteGenre(id: string) {
    try {
      const genre = await this.categoryRepository.findOne({
        where: { id },
        relations: ['books'],
      });

      if (!genre) {
        return { success: false, message: 'Genre not found' };
      }

      if (genre.books && genre.books.length > 0) {
        return {
          success: false,
          message: 'Cannot delete genre with associated stories',
        };
      }

      await this.categoryRepository.remove(genre);
      return { success: true, message: 'Genre deleted successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async searchGenres(query: string, page = 1, limit = 10) {
    try {
      const [genres, total] = await this.categoryRepository
        .createQueryBuilder('category')
        .where(
          'category.name ILIKE :query OR category.description ILIKE :query',
          {
            query: `%${query}%`,
          }
        )
        .andWhere('category.is_active = :active', { active: true })
        .orderBy('category.name', 'ASC')
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();

      return {
        success: true,
        data: genres,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}
