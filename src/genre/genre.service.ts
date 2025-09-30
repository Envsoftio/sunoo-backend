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

      const [stories, total] = await this.bookRepository.findAndCount({
        where: {
          category: { id: genre.id },
          isPublished: true,
        },
        relations: ['category', 'bookRatings', 'audiobookListeners'],
        order: { created_at: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });

      let bookmarks: string[] = [];
      if (userId) {
        const userBookmarks = await this.bookRepository
          .createQueryBuilder('book')
          .leftJoin('book.bookmarks', 'bookmark')
          .where('bookmark.userId = :userId', { userId })
          .andWhere('book.category.id = :genreId', { genreId: genre.id })
          .select('book.id')
          .getRawMany();

        bookmarks = userBookmarks
          .map(b => b.book_id)
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

      return {
        success: true,
        data: processedStories,
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
      const featuredGenres = await this.categoryRepository.find({
        where: { is_active: true, featured: true },
        order: { sort_order: 'ASC', name: 'ASC' },
        take: 10,
      });

      // Add story counts and average ratings to each genre
      const genresWithStats = await Promise.all(
        featuredGenres.map(async genre => {
          const storyCount = await this.bookRepository.count({
            where: {
              category: { id: genre.id },
              isPublished: true,
            },
          });

          // Calculate average rating for this genre
          const ratingResult = await this.bookRepository
            .createQueryBuilder('book')
            .leftJoin('book.bookRatings', 'rating')
            .select('AVG(rating.rating)', 'averageRating')
            .addSelect('COUNT(rating.id)', 'ratingCount')
            .where('book.category = :categoryId', { categoryId: genre.id })
            .andWhere('book.isPublished = :isPublished', { isPublished: true })
            .getRawOne();

          const averageRating = ratingResult?.averageRating
            ? parseFloat(parseFloat(ratingResult.averageRating).toFixed(1))
            : 0;

          return {
            ...genre,
            storyCount,
            averageRating,
            ratingCount: parseInt(ratingResult?.ratingCount || '0'),
          };
        })
      );

      return { success: true, data: genresWithStats };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getGenreStats() {
    try {
      // Get all active categories first
      const categories = await this.categoryRepository.find({
        where: { is_active: true },
        order: { name: 'ASC' },
      });

      // Get story counts for each category
      const stats = await Promise.all(
        categories.map(async category => {
          const storyCount = await this.bookRepository.count({
            where: { category: { id: category.id }, isPublished: true },
          });

          return {
            id: category.id,
            name: category.name,
            slug: category.slug,
            iconUrl: category.icon_url,
            color: category.color,
            storyCount,
          };
        })
      );

      // Sort by story count descending
      stats.sort((a, b) => b.storyCount - a.storyCount);

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
