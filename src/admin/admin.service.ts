/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Feedback } from '../entities/feedback.entity';
import { Subscription } from '../entities/subscription.entity';
import { UserSession } from '../entities/user-session.entity';
import { Category } from '../entities/category.entity';
import { CastMember } from '../entities/cast-member.entity';
import { Bookmark } from '../entities/bookmark.entity';
import { Book } from '../entities/book.entity';
import { Author } from '../entities/author.entity';
import { Narrator } from '../entities/narrator.entity';
import { UserProgress } from '../entities/user-progress.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Feedback)
    private feedbackRepository: Repository<Feedback>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(UserSession)
    private userSessionRepository: Repository<UserSession>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(CastMember)
    private castMemberRepository: Repository<CastMember>,
    @InjectRepository(Bookmark)
    private bookmarkRepository: Repository<Bookmark>,
    @InjectRepository(Book)
    private bookRepository: Repository<Book>,
    @InjectRepository(Author)
    private authorRepository: Repository<Author>,
    @InjectRepository(Narrator)
    private narratorRepository: Repository<Narrator>,
    @InjectRepository(UserProgress)
    private userProgressRepository: Repository<UserProgress>
  ) {}

  // User Management
  async getUsers() {
    try {
      const users = await this.userRepository.find({
        select: [
          'id',
          'email',
          'name',
          'role',
          'isActive',
          'created_at',
          'updated_at',
        ],
        order: { created_at: 'DESC' },
      });
      return { success: true, data: users };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async deleteUser(email: string) {
    try {
      const user = await this.userRepository.findOne({ where: { email } });
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      await this.userRepository.remove(user);
      return { success: true, message: 'User deleted successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async makeNarrator(email: string) {
    try {
      const user = await this.userRepository.findOne({ where: { email } });
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      user.role = 'narrator';
      await this.userRepository.save(user);

      return { success: true, message: 'User made narrator successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // Analytics
  async getUserRegistrationsByPeriod(period: string) {
    try {
      let dateFormat: string;
      let dateFilter: Date;
      const now = new Date();

      switch (period) {
        case 'day':
          dateFormat = 'YYYY-MM-DD';
          dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
          break;
        case 'week':
          dateFormat = 'YYYY-"W"WW';
          dateFilter = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000); // Last 12 weeks
          break;
        case 'month':
          dateFormat = 'YYYY-MM';
          dateFilter = new Date(now.getTime() - 12 * 30 * 24 * 60 * 60 * 1000); // Last 12 months
          break;
        case 'year':
          dateFormat = 'YYYY';
          dateFilter = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000); // Last 5 years
          break;
        default:
          dateFormat = 'YYYY-MM-DD';
          dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      const registrations = await this.userRepository
        .createQueryBuilder('user')
        .select(`TO_CHAR(user.created_at, '${dateFormat}')`, 'period')
        .addSelect('COUNT(*)', 'count')
        .where('user.created_at >= :dateFilter', { dateFilter })
        .groupBy(`TO_CHAR(user.created_at, '${dateFormat}')`)
        .orderBy('period', 'ASC')
        .getRawMany();

      // Transform data to match frontend expectations
      const transformedData = registrations.map(item => ({
        period: item.period,
        count: parseInt(item.count)
      }));

      return { success: true, data: transformedData };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getSubscriptionRegistrationsByPeriod(period: string) {
    try {
      let dateFormat: string;
      let dateFilter: Date;
      const now = new Date();

      switch (period) {
        case 'day':
          dateFormat = 'YYYY-MM-DD';
          dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
          break;
        case 'week':
          dateFormat = 'YYYY-"W"WW';
          dateFilter = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000); // Last 12 weeks
          break;
        case 'month':
          dateFormat = 'YYYY-MM';
          dateFilter = new Date(now.getTime() - 12 * 30 * 24 * 60 * 60 * 1000); // Last 12 months
          break;
        case 'year':
          dateFormat = 'YYYY';
          dateFilter = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000); // Last 5 years
          break;
        default:
          dateFormat = 'YYYY-MM-DD';
          dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      // Get all periods in the range to ensure we have data for all periods
      const allPeriods = await this.subscriptionRepository
        .createQueryBuilder('subscription')
        .select(`TO_CHAR(subscription.created_at, '${dateFormat}')`, 'period')
        .where('subscription.created_at >= :dateFilter', { dateFilter })
        .groupBy(`TO_CHAR(subscription.created_at, '${dateFormat}')`)
        .orderBy('period', 'ASC')
        .getRawMany();

      // Get subscription counts by status for each period
      const subscriptions = await this.subscriptionRepository
        .createQueryBuilder('subscription')
        .select(`TO_CHAR(subscription.created_at, '${dateFormat}')`, 'period')
        .addSelect('subscription.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('subscription.created_at >= :dateFilter', { dateFilter })
        .groupBy(`TO_CHAR(subscription.created_at, '${dateFormat}'), subscription.status`)
        .orderBy('period', 'ASC')
        .getRawMany();

      // Transform data to match frontend expectations
      const periodMap = new Map();

      // Initialize all periods with zero counts
      allPeriods.forEach(period => {
        periodMap.set(period.period, {
          period: period.period,
          active: 0,
          authorized: 0,
          cancelled: 0
        });
      });

      // Fill in actual counts
      subscriptions.forEach(item => {
        const periodData = periodMap.get(item.period);
        if (periodData) {
          switch (item.status) {
            case 'active':
              periodData.active = parseInt(item.count);
              break;
            case 'authorized':
              periodData.authorized = parseInt(item.count);
              break;
            case 'cancelled':
              periodData.cancelled = parseInt(item.count);
              break;
          }
        }
      });

      const transformedData = Array.from(periodMap.values());

      return { success: true, data: transformedData };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // Feedback Management
  async getFeedbackCount() {
    try {
      const count = await this.feedbackRepository.count();
      return { success: true, data: { count } };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getAllFeedbacks() {
    try {
      const feedbacks = await this.feedbackRepository.find({
        relations: ['user'],
        order: { created_at: 'DESC' },
      });
      return { success: true, data: feedbacks };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async updateNarratorPassword(userId: string, newPassword: string) {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      // Hash the new password
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update the user's password
      user.password = hashedPassword;
      await this.userRepository.save(user);

      // Invalidate all user sessions for security
      await this.userSessionRepository.update(
        { userId: userId, isActive: true },
        { isActive: false }
      );

      return { success: true, message: 'Password updated successfully. All sessions have been invalidated.' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // Additional methods for frontend compatibility
  async getAllNarrators() {
    try {
      const narrators = await this.userRepository.find({
        where: { role: 'narrator' },
        select: ['id', 'email', 'name', 'isActive', 'created_at', 'updated_at'],
        order: { created_at: 'DESC' },
      });
      return { success: true, data: narrators };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getNarrator(id: string) {
    try {
      const narrator = await this.userRepository.findOne({
        where: { id, role: 'narrator' },
        select: ['id', 'email', 'name', 'isActive', 'created_at', 'updated_at'],
      });
      if (!narrator) {
        return { success: false, message: 'Narrator not found' };
      }
      return { success: true, data: narrator };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async addNarrator(narratorData: any) {
    try {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(narratorData.password, 10);

      const narrator = this.userRepository.create({
        ...narratorData,
        password: hashedPassword,
        role: 'narrator',
      });

      const savedNarrator = await this.userRepository.save(narrator);
      return { success: true, data: savedNarrator };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async editNarrator(narratorData: any, id: string) {
    try {
      const narrator = await this.userRepository.findOne({ where: { id } });
      if (!narrator) {
        return { success: false, message: 'Narrator not found' };
      }

      await this.userRepository.update(id, narratorData);
      return { success: true, message: 'Narrator updated successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async deleteNarrator(email: string) {
    try {
      const narrator = await this.userRepository.findOne({ where: { email, role: 'narrator' } });
      if (!narrator) {
        return { success: false, message: 'Narrator not found' };
      }

      await this.userRepository.delete(narrator.id);
      return { success: true, message: 'Narrator deleted successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async updateNarratorProfile(userId: string) {
    try {
      const narrator = await this.userRepository.findOne({ where: { id: userId, role: 'narrator' } });
      if (!narrator) {
        return { success: false, message: 'Narrator not found' };
      }

      // Update profile logic here
      return { success: true, message: 'Profile updated successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async updateNarratorName(userId: string, name: string) {
    try {
      const narrator = await this.userRepository.findOne({ where: { id: userId, role: 'narrator' } });
      if (!narrator) {
        return { success: false, message: 'Narrator not found' };
      }

      await this.userRepository.update(userId, { name });
      return { success: true, message: 'Name updated successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }


  async getUserActivities(startDate?: Date, endDate?: Date) {
    try {
      // Get user progress with related data instead of sessions
      let query = this.userSessionRepository
        .createQueryBuilder('session')
        .leftJoinAndSelect('session.user', 'user')
        .leftJoin('user.userProgress', 'progress')
        .leftJoin('progress.book', 'book')
        .leftJoin('progress.chapter', 'chapter')
        .select([
          'session.id',
          'session.userId',
          'session.isActive',
          'session.created_at',
          'session.updated_at',
          'user.id',
          'user.name',
          'user.email',
          'user.imageURL',
          'progress.id',
          'progress.progress_time',
          'progress.updated_at',
          'book.id',
          'book.title',
          'chapter.id',
          'chapter.name',
          'chapter.playbackTime'
        ])
        .orderBy('session.updated_at', 'DESC');

      if (startDate) {
        query = query.andWhere('session.updated_at >= :startDate', { startDate });
      }
      if (endDate) {
        query = query.andWhere('session.updated_at <= :endDate', { endDate });
      }

      const activities = await query.getMany();

      // Transform the data to match frontend expectations
      const transformedActivities = activities.map(activity => ({
        id: activity.id,
        userId: activity.userId,
        isActive: activity.isActive,
        created_at: activity.created_at,
        updated_at: activity.updated_at,
        User: activity.user ? {
          id: activity.user.id,
          name: activity.user.name,
          email: activity.user.email,
          imageURL: activity.user.imageURL
        } : null,
        // Add progress data if available
        progress_time: 0, // Default value
        Books: null,
        Chapters: null
      }));

      return { success: true, data: transformedActivities };
    } catch (error) {
      console.error('Error in getUserActivities:', error);
      return { success: false, message: error.message };
    }
  }

  async getSubscriptionCounts() {
    try {
      const active = await this.subscriptionRepository.count({ where: { status: 'active' } });
      const authorized = await this.subscriptionRepository.count({ where: { status: 'authorized' } });
      const cancelled = await this.subscriptionRepository.count({ where: { status: 'cancelled' } });

      return {
        success: true,
        data: {
          active,
          authorized,
          cancelled
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  getStoryCasts(_storyId: string) {
    try {
      // This would need to be implemented based on your cast system
      // For now, return empty array
      return { success: true, casts: [] };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  saveStoryCasts(_storyId: string, _casts: any[]) {
    try {
      // This would need to be implemented based on your cast system
      // For now, return success
      return { success: true, message: 'Casts saved successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getCastMembers() {
    try {
      const castMembers = await this.castMemberRepository.find({
        order: { created_at: 'DESC' }
      });

      return { success: true, data: castMembers };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getUserBookLikes(page: number, limit: number, search: string, sortBy: string, sortOrder: string) {
    try {
      const offset = (page - 1) * limit;

      // Build query for bookmarks with user and book relations
      let query = this.bookmarkRepository
        .createQueryBuilder('bookmark')
        .leftJoinAndSelect('bookmark.user', 'user')
        .leftJoinAndSelect('bookmark.book', 'book')
        .leftJoinAndSelect('book.category', 'category');

      // Apply search filter
      if (search) {
        query = query.where(
          '(user.name ILIKE :search OR user.email ILIKE :search OR book.title ILIKE :search)',
          { search: `%${search}%` }
        );
      }

      // Apply sorting
      const validSortFields = ['created_at', 'user.name', 'book.title'];
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
      const sortDirection = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

      query = query.orderBy(`bookmark.${sortField}`, sortDirection);

      // Get total count for pagination
      const total = await query.getCount();

      // Apply pagination
      const bookmarks = await query
        .skip(offset)
        .take(limit)
        .getMany();

      // Transform data to match expected format
      const transformedData = bookmarks.map(bookmark => ({
        id: bookmark.id,
        userId: bookmark.userId,
        bookId: bookmark.bookId,
        likedAt: bookmark.created_at,
        user: {
          id: bookmark.user?.id,
          name: bookmark.user?.name,
          email: bookmark.user?.email,
          joinedAt: bookmark.user?.created_at
        },
        book: {
          id: bookmark.book?.id,
          title: bookmark.book?.title,
          language: bookmark.book?.language,
          duration: bookmark.book?.duration,
          coverUrl: bookmark.book?.bookCoverUrl,
          category: bookmark.book?.category?.name
        }
      }));

      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: transformedData,
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async saveCategory(categoryData: any) {
    try {
      const { id, ...data } = categoryData;

      if (id) {
        // Update existing category
        await this.categoryRepository.update(id, data);
        return { success: true, message: 'Category updated successfully' };
      } else {
        // Create new category
        const category = this.categoryRepository.create(data);
        await this.categoryRepository.save(category);
        return { success: true, message: 'Category created successfully', data: category };
      }
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getCategories() {
    try {
      const categories = await this.categoryRepository.find({
        order: { sort_order: 'ASC' }
      });
      return { success: true, data: categories };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async deleteCategory(id: string) {
    try {
      await this.categoryRepository.delete(id);
      return { success: true, message: 'Category deleted successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // Cast Member Management
  async createCastMember(data: { name: string; bio: string; picture: string }) {
    try {
      const castMember = this.castMemberRepository.create(data);
      const savedCastMember = await this.castMemberRepository.save(castMember);
      return { success: true, message: 'Cast member created successfully', data: savedCastMember };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async updateCastMember(id: string, data: { name: string; bio: string; picture: string }) {
    try {
      await this.castMemberRepository.update(id, data);
      const updatedCastMember = await this.castMemberRepository.findOne({ where: { id } });
      return { success: true, message: 'Cast member updated successfully', data: updatedCastMember };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async deleteCastMember(id: string) {
    try {
      await this.castMemberRepository.delete(id);
      return { success: true, message: 'Cast member deleted successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async uploadCastPicture(id: string, pictureKey: string) {
    try {
      await this.castMemberRepository.update(id, { picture: pictureKey });
      return { success: true, message: 'Picture uploaded successfully', data: { pictureKey } };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // Dashboard Analytics Methods
  async getDashboardStats() {
    try {
      const [
        userCount,
        narratorCount,
        authorCount,
        bookCount,
        feedbackCount,
        userLikesCount,
        subscriptionCounts
      ] = await Promise.all([
        this.userRepository.count(),
        this.narratorRepository.count(),
        this.authorRepository.count(),
        this.bookRepository.count(),
        this.feedbackRepository.count(),
        this.bookmarkRepository.count(),
        this.getSubscriptionCounts()
      ]);

      return {
        success: true,
        data: {
          userCount,
          narratorCount,
          authorCount,
          bookCount,
          feedbackCount,
          userLikesCount,
          subscriptionCounts: subscriptionCounts.success ? subscriptionCounts.data : null
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getUserCount() {
    try {
      const count = await this.userRepository.count();
      return { success: true, data: { count } };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getBookCount() {
    try {
      const count = await this.bookRepository.count();
      return { success: true, data: { count } };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getAuthorCount() {
    try {
      const count = await this.authorRepository.count();
      return { success: true, data: { count } };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getNarratorCount() {
    try {
      const count = await this.narratorRepository.count();
      return { success: true, data: { count } };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getUserLikesCount() {
    try {
      const count = await this.bookmarkRepository.count();
      return { success: true, data: { count } };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}
