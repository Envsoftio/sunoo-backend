/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Feedback } from '../entities/feedback.entity';
import { Subscription } from '../entities/subscription.entity';
import { UserSession } from '../entities/user-session.entity';
import { Category } from '../entities/category.entity';
import { CastMember } from '../entities/cast-member.entity';
import { StoryCast } from '../entities/story-cast.entity';
import { Bookmark } from '../entities/bookmark.entity';
import { Book } from '../entities/book.entity';
import { UserProgress } from '../entities/user-progress.entity';
import { Chapter } from '../entities/chapter.entity';
import { BookRating } from '../entities/book-rating.entity';
import { AudiobookListener } from '../entities/audiobook-listener.entity';
import { EmailService } from '../email/email.service';
import { ZeptomailService } from '../email/zeptomail.service';

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
    @InjectRepository(StoryCast)
    private storyCastRepository: Repository<StoryCast>,
    @InjectRepository(Bookmark)
    private bookmarkRepository: Repository<Bookmark>,
    @InjectRepository(Book)
    private bookRepository: Repository<Book>,
    @InjectRepository(UserProgress)
    private userProgressRepository: Repository<UserProgress>,
    @InjectRepository(Chapter)
    private chapterRepository: Repository<Chapter>,
    @InjectRepository(BookRating)
    private bookRatingRepository: Repository<BookRating>,
    @InjectRepository(AudiobookListener)
    private audiobookListenerRepository: Repository<AudiobookListener>,
    private emailService: EmailService,
    private zeptomailService: ZeptomailService
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
          'email_notifications_enabled',
          'marketing_emails_enabled',
          'new_content_emails_enabled',
          'subscription_emails_enabled',
        ],
        relations: ['subscriptions'],
        order: { created_at: 'DESC' },
      });

      // Process users to add subscription status
      const processedUsers = users.map(user => {
        let subscriptionStatus = 'none';

        if (user.subscriptions && user.subscriptions.length > 0) {
          // Find the most recent active subscription
          const activeSubscription = user.subscriptions.find(
            sub =>
              sub.status === 'active' &&
              (!sub.end_date || new Date(sub.end_date) > new Date())
          );

          if (activeSubscription) {
            subscriptionStatus = 'active';
          } else {
            // Check for authorized subscription
            const authorizedSubscription = user.subscriptions.find(
              sub => sub.status === 'authorized'
            );
            if (authorizedSubscription) {
              subscriptionStatus = 'authorized';
            } else {
              subscriptionStatus = 'cancelled';
            }
          }
        }

        return {
          ...user,
          subscription_status: subscriptionStatus,
          is_subscribed: subscriptionStatus === 'active',
        };
      });

      return { success: true, data: processedUsers };
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
        count: parseInt(item.count),
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
        .groupBy(
          `TO_CHAR(subscription.created_at, '${dateFormat}'), subscription.status`
        )
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
          cancelled: 0,
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

      return {
        success: true,
        message:
          'Password updated successfully. All sessions have been invalidated.',
      };
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
          'chapter.playbackTime',
        ])
        .orderBy('session.updated_at', 'DESC');

      if (startDate) {
        query = query.andWhere('session.updated_at >= :startDate', {
          startDate,
        });
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
        User: activity.user
          ? {
              id: activity.user.id,
              name: activity.user.name,
              email: activity.user.email,
              imageURL: activity.user.imageURL,
            }
          : null,
        // Add progress data if available
        progress_time: 0, // Default value
        Books: null,
        Chapters: null,
      }));

      return { success: true, data: transformedActivities };
    } catch (error) {
      console.error('Error in getUserActivities:', error);
      return { success: false, message: error.message };
    }
  }

  async getSubscriptionCounts() {
    try {
      const active = await this.subscriptionRepository.count({
        where: { status: 'active' },
      });
      const authorized = await this.subscriptionRepository.count({
        where: { status: 'authorized' },
      });
      const cancelled = await this.subscriptionRepository.count({
        where: { status: 'cancelled' },
      });

      return {
        success: true,
        data: {
          active,
          authorized,
          cancelled,
        },
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getStoryCasts(storyId: string) {
    try {
      const query = `
        SELECT
          sc.id,
          sc.story_id,
          sc.role,
          sc.cast_id,
          COALESCE(cm.name, sc.name) as name,
          COALESCE(cm.picture, sc.picture) as picture
        FROM story_casts sc
        LEFT JOIN cast_members cm ON sc.cast_id::uuid = cm.id
        WHERE sc.story_id = $1
      `;

      const result = await this.storyCastRepository.query(query, [storyId]);

      return { success: true, casts: result };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async saveStoryCasts(storyId: string, casts: any[]) {
    try {
      // First, delete existing casts for this story
      await this.storyCastRepository.delete({ story_id: storyId });

      // Then, insert new casts
      const storyCasts = casts.map(cast => {
        const storyCast = new StoryCast();
        storyCast.story_id = storyId;
        storyCast.name = cast.name;
        storyCast.role = cast.role;
        storyCast.picture = cast.picture_url || cast.picture;
        // Only set cast_id if it's provided and not empty
        storyCast.cast_id =
          cast.cast_id && cast.cast_id !== '' ? cast.cast_id : '';
        return storyCast;
      });

      await this.storyCastRepository.save(storyCasts);

      return { success: true, message: 'Casts saved successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getCastMembers() {
    try {
      const castMembers = await this.castMemberRepository.find({
        order: { created_at: 'DESC' },
      });

      return { success: true, data: castMembers };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getUserBookLikes(
    page: number,
    limit: number,
    search: string,
    sortBy: string,
    sortOrder: string
  ) {
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
      const sortField = validSortFields.includes(sortBy)
        ? sortBy
        : 'created_at';
      const sortDirection = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

      query = query.orderBy(`bookmark.${sortField}`, sortDirection);

      // Get total count for pagination
      const total = await query.getCount();

      // Apply pagination
      const bookmarks = await query.skip(offset).take(limit).getMany();

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
          joinedAt: bookmark.user?.created_at,
        },
        book: {
          id: bookmark.book?.id,
          title: bookmark.book?.title,
          language: bookmark.book?.language,
          duration: bookmark.book?.duration,
          coverUrl: bookmark.book?.bookCoverUrl,
          category: bookmark.book?.category?.name,
        },
      }));

      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: transformedData,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
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
        return {
          success: true,
          message: 'Category created successfully',
          data: category,
        };
      }
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getCategories() {
    try {
      const categories = await this.categoryRepository.find({
        order: { sort_order: 'ASC' },
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
      return {
        success: true,
        message: 'Cast member created successfully',
        data: savedCastMember,
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async updateCastMember(
    id: string,
    data: { name: string; bio: string; picture: string }
  ) {
    try {
      await this.castMemberRepository.update(id, data);
      const updatedCastMember = await this.castMemberRepository.findOne({
        where: { id },
      });
      return {
        success: true,
        message: 'Cast member updated successfully',
        data: updatedCastMember,
      };
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
      return {
        success: true,
        message: 'Picture uploaded successfully',
        data: { pictureKey },
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // Dashboard Analytics Methods
  async getDashboardStats() {
    try {
      const [
        userCount,
        bookCount,
        feedbackCount,
        userLikesCount,
        subscriptionCounts,
      ] = await Promise.all([
        this.userRepository.count(),
        this.bookRepository.count(),
        this.feedbackRepository.count(),
        this.bookmarkRepository.count(),
        this.getSubscriptionCounts(),
      ]);

      return {
        success: true,
        data: {
          userCount,
          bookCount,
          feedbackCount,
          userLikesCount,
          subscriptionCounts: subscriptionCounts.success
            ? subscriptionCounts.data
            : null,
        },
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

  async getUserLikesCount() {
    try {
      const count = await this.bookmarkRepository.count();
      return { success: true, data: { count } };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // Story Management Methods
  async getStories(
    page: number = 1,
    limit: number = 10,
    search: string = '',
    sortBy: string = 'created_at',
    sortOrder: string = 'desc',
    category: string = '',
    language: string = '',
    isPublished: string = ''
  ) {
    try {
      const offset = (page - 1) * limit;

      let query = this.bookRepository
        .createQueryBuilder('book')
        .leftJoinAndSelect('book.category', 'category')
        .leftJoinAndSelect('book.chapters', 'chapters')
        .leftJoinAndSelect('book.bookRatings', 'bookRatings')
        .leftJoinAndSelect('book.audiobookListeners', 'audiobookListeners')
        .where('book.deleted_at IS NULL'); // Exclude soft-deleted stories

      // Apply search filter
      if (search) {
        query = query.andWhere(
          '(book.title ILIKE :search OR book.bookDescription ILIKE :search)',
          { search: `%${search}%` }
        );
      }

      // Apply category filter
      if (category) {
        query = query.andWhere('category.slug = :category', { category });
      }

      // Apply language filter
      if (language) {
        query = query.andWhere('book.language = :language', { language });
      }

      // Apply published status filter
      if (isPublished !== '') {
        const published = isPublished === 'true';
        query = query.andWhere('book.isPublished = :isPublished', {
          isPublished: published,
        });
      }

      // Apply sorting
      const validSortFields = [
        'created_at',
        'updated_at',
        'title',
        'isPublished',
      ];
      const sortField = validSortFields.includes(sortBy)
        ? sortBy
        : 'created_at';
      const sortDirection = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

      query = query.orderBy(`book.${sortField}`, sortDirection);

      // Get total count for pagination
      const total = await query.getCount();

      // Apply pagination
      const stories = await query.skip(offset).take(limit).getMany();

      // Process stories with additional data
      const processedStories = stories.map(story => {
        const ratings = story.bookRatings || [];
        const averageRating =
          ratings.length > 0
            ? ratings.reduce((sum, r) => sum + (r.rating || 0), 0) /
              ratings.length
            : 0;

        const totalListeners =
          story.audiobookListeners?.reduce(
            (sum, listener) => sum + (listener.count || 0),
            0
          ) || 0;

        return {
          ...story,
          averageRating: Math.round(averageRating * 10) / 10,
          listeners: totalListeners,
          chapterCount: story.chapters?.length || 0,
          category: story.category?.name || 'Uncategorized',
        };
      });

      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: processedStories,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getStory(id: string) {
    try {
      const story = await this.bookRepository.findOne({
        where: { id, deleted_at: IsNull() },
        relations: [
          'category',
          'chapters',
          'bookRatings',
          'audiobookListeners',
        ],
      });

      if (!story) {
        return { success: false, message: 'Story not found' };
      }

      const ratings = story.bookRatings || [];
      const averageRating =
        ratings.length > 0
          ? ratings.reduce((sum, r) => sum + (r.rating || 0), 0) /
            ratings.length
          : 0;

      const totalListeners =
        story.audiobookListeners?.reduce(
          (sum, listener) => sum + (listener.count || 0),
          0
        ) || 0;

      return {
        success: true,
        data: {
          ...story,
          averageRating: Math.round(averageRating * 10) / 10,
          listeners: totalListeners,
          chapterCount: story.chapters?.length || 0,
          category: story.category?.id || '',
        },
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async createStory(storyData: any) {
    try {
      const story = this.bookRepository.create({
        ...storyData,
        slug: storyData.title?.toLowerCase().replace(/\s+/g, '-') || '',
        created_at: new Date(),
        updated_at: new Date(),
      });

      const savedStory = await this.bookRepository.save(story);
      return {
        success: true,
        data: savedStory,
        message: 'Story created successfully',
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async updateStory(id: string, storyData: any) {
    try {
      const story = await this.bookRepository.findOne({
        where: { id, deleted_at: IsNull() },
      });
      if (!story) {
        return { success: false, message: 'Story not found' };
      }

      // Update slug if title changed
      if (storyData.title && storyData.title !== story.title) {
        storyData.slug = storyData.title.toLowerCase().replace(/\s+/g, '-');
      }

      storyData.updated_at = new Date();

      await this.bookRepository.update(id, storyData);
      const updatedStory = await this.bookRepository.findOne({
        where: { id, deleted_at: IsNull() },
        relations: ['category', 'chapters'],
      });

      return {
        success: true,
        data: updatedStory,
        message: 'Story updated successfully',
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async deleteStory(id: string) {
    try {
      const story = await this.bookRepository.findOne({
        where: { id, deleted_at: IsNull() },
      });
      if (!story) {
        return { success: false, message: 'Story not found' };
      }

      // Soft delete: set deleted_at timestamp instead of removing the record
      await this.bookRepository.update(id, {
        deleted_at: new Date(),
      });

      return { success: true, message: 'Story deleted successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async toggleStoryPublish(id: string, isPublished: boolean) {
    try {
      const story = await this.bookRepository.findOne({
        where: { id, deleted_at: IsNull() },
      });
      if (!story) {
        return { success: false, message: 'Story not found' };
      }

      await this.bookRepository.update(id, {
        isPublished,
        updated_at: new Date(),
      });

      return {
        success: true,
        message: `Story ${isPublished ? 'published' : 'unpublished'} successfully`,
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async updateStoryCover(id: string, coverUrl: string) {
    try {
      const story = await this.bookRepository.findOne({
        where: { id, deleted_at: IsNull() },
      });
      if (!story) {
        return { success: false, message: 'Story not found' };
      }

      await this.bookRepository.update(id, {
        bookCoverUrl: coverUrl,
        updated_at: new Date(),
      });

      return { success: true, message: 'Story cover updated successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // Chapter Management Methods
  async getStoryChapters(storyId: string) {
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

  async addChapter(storyId: string, chapterData: any) {
    try {
      const story = await this.bookRepository.findOne({
        where: { id: storyId, deleted_at: IsNull() },
      });
      if (!story) {
        return { success: false, message: 'Story not found' };
      }

      const chapter = this.chapterRepository.create({
        ...chapterData,
        bookId: storyId,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const savedChapter = await this.chapterRepository.save(chapter);
      return {
        success: true,
        data: savedChapter,
        message: 'Chapter added successfully',
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async updateChapter(id: string, chapterData: any) {
    try {
      const chapter = await this.chapterRepository.findOne({
        where: { id, deleted_at: IsNull() },
      });
      if (!chapter) {
        return { success: false, message: 'Chapter not found' };
      }

      chapterData.updated_at = new Date();

      await this.chapterRepository.update(id, chapterData);
      const updatedChapter = await this.chapterRepository.findOne({
        where: { id, deleted_at: IsNull() },
      });

      return {
        success: true,
        data: updatedChapter,
        message: 'Chapter updated successfully',
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async deleteChapter(id: string) {
    try {
      const chapter = await this.chapterRepository.findOne({
        where: { id, deleted_at: IsNull() },
      });
      if (!chapter) {
        return { success: false, message: 'Chapter not found' };
      }

      // Soft delete: set deleted_at timestamp instead of removing the record
      await this.chapterRepository.update(id, {
        deleted_at: new Date(),
      });

      return { success: true, message: 'Chapter deleted successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  bulkUploadChapters(_storyId: string, _file: any) {
    try {
      // This is a placeholder implementation
      // In a real implementation, you would:
      // 1. Extract the ZIP file
      // 2. Process each audio file
      // 3. Upload to S3 or your storage service
      // 4. Create chapter records in the database

      return {
        success: true,
        message: 'Bulk upload functionality needs to be implemented',
        data: { uploadedCount: 0 },
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // Story Analytics Methods
  async getStoryAnalyticsOverview() {
    try {
      const [
        totalStories,
        publishedStories,
        totalChapters,
        totalListeners,
        averageRating,
        totalBookmarks,
      ] = await Promise.all([
        this.bookRepository.count(),
        this.bookRepository.count({ where: { isPublished: true } }),
        this.chapterRepository.count(),
        this.audiobookListenerRepository
          .createQueryBuilder('listener')
          .select('SUM(listener.count)', 'total')
          .getRawOne()
          .then(result => parseInt(result.total) || 0),
        this.bookRatingRepository
          .createQueryBuilder('rating')
          .select('AVG(rating.rating)', 'average')
          .getRawOne()
          .then(result => parseFloat(result.average) || 0),
        this.bookmarkRepository.count(),
      ]);

      return {
        success: true,
        data: {
          totalStories,
          publishedStories,
          unpublishedStories: totalStories - publishedStories,
          totalChapters,
          totalListeners,
          averageRating: Math.round(averageRating * 10) / 10,
          totalBookmarks,
        },
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getPopularStoriesAnalytics(
    period: string = 'week',
    limit: number = 10
  ) {
    try {
      let dateFilter: Date;
      const now = new Date();

      switch (period) {
        case 'day':
          dateFilter = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
          break;
        case 'week':
          dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      const popularStories = await this.bookRepository
        .createQueryBuilder('book')
        .leftJoinAndSelect('book.category', 'category')
        .leftJoinAndSelect('book.audiobookListeners', 'listeners')
        .leftJoinAndSelect('book.bookRatings', 'ratings')
        .where('book.isPublished = :isPublished', { isPublished: true })
        .andWhere('listeners.created_at >= :dateFilter', { dateFilter })
        .orderBy('listeners.count', 'DESC')
        .addOrderBy('book.created_at', 'DESC')
        .take(limit)
        .getMany();

      const processedStories = popularStories.map(story => {
        const ratings = story.bookRatings || [];
        const averageRating =
          ratings.length > 0
            ? ratings.reduce((sum, r) => sum + (r.rating || 0), 0) /
              ratings.length
            : 0;

        const totalListeners =
          story.audiobookListeners?.reduce(
            (sum, listener) => sum + (listener.count || 0),
            0
          ) || 0;

        return {
          ...story,
          averageRating: Math.round(averageRating * 10) / 10,
          listeners: totalListeners,
          category: story.category?.name || 'Uncategorized',
        };
      });

      return { success: true, data: processedStories };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getStoryListenersAnalytics(storyId: string, period: string = 'week') {
    try {
      let dateFilter: Date;
      const now = new Date();

      switch (period) {
        case 'day':
          dateFilter = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
          break;
        case 'week':
          dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      const listeners = await this.audiobookListenerRepository
        .createQueryBuilder('listener')
        .leftJoinAndSelect('listener.user', 'user')
        .where('listener.bookId = :storyId', { storyId })
        .andWhere('listener.created_at >= :dateFilter', { dateFilter })
        .orderBy('listener.created_at', 'DESC')
        .getMany();

      const totalListeners = listeners.reduce(
        (sum, listener) => sum + (listener.count || 0),
        0
      );

      return {
        success: true,
        data: {
          storyId,
          period,
          totalListeners,
          uniqueListeners: listeners.length,
          listeners: listeners.map(listener => ({
            id: listener.id,
            userId: listener.userId,
            count: listener.count,
            createdAt: listener.created_at,
            user: listener.user
              ? {
                  id: listener.user.id,
                  name: listener.user.name,
                  email: listener.user.email,
                }
              : null,
          })),
        },
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getStoryRatingsAnalytics(storyId: string) {
    try {
      const ratings = await this.bookRatingRepository.find({
        where: { bookId: storyId },
        relations: ['user'],
        order: { created_at: 'DESC' },
      });

      const totalRatings = ratings.length;
      const averageRating =
        totalRatings > 0
          ? ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / totalRatings
          : 0;

      const ratingDistribution = [1, 2, 3, 4, 5].map(star => ({
        stars: star,
        count: ratings.filter(r => r.rating === star).length,
      }));

      return {
        success: true,
        data: {
          storyId,
          totalRatings,
          averageRating: Math.round(averageRating * 10) / 10,
          ratingDistribution,
          ratings: ratings.map(rating => ({
            id: rating.id,
            rating: rating.rating,
            comment: rating.comment,
            createdAt: rating.created_at,
            user: rating.user
              ? {
                  id: rating.user.id,
                  name: rating.user.name,
                  email: rating.user.email,
                }
              : null,
          })),
        },
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getStoryCompletionRates() {
    try {
      const stories = await this.bookRepository
        .createQueryBuilder('book')
        .leftJoinAndSelect('book.chapters', 'chapters')
        .leftJoinAndSelect('book.userProgress', 'progress')
        .where('book.isPublished = :isPublished', { isPublished: true })
        .getMany();

      const completionRates = stories.map(story => {
        const totalChapters = story.chapters?.length || 0;
        const completedProgress =
          story.userProgress?.filter(p => p.progress >= 0.9).length || 0;
        const totalProgress = story.userProgress?.length || 0;

        const completionRate =
          totalProgress > 0 ? (completedProgress / totalProgress) * 100 : 0;

        return {
          storyId: story.id,
          title: story.title,
          totalChapters,
          totalProgress,
          completedProgress,
          completionRate: Math.round(completionRate * 10) / 10,
        };
      });

      const averageCompletionRate =
        completionRates.length > 0
          ? completionRates.reduce(
              (sum, story) => sum + story.completionRate,
              0
            ) / completionRates.length
          : 0;

      return {
        success: true,
        data: {
          averageCompletionRate: Math.round(averageCompletionRate * 10) / 10,
          completionRates: completionRates.sort(
            (a, b) => b.completionRate - a.completionRate
          ),
        },
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async sendEmail(user: any, templateKey: string, dynamicFields: any) {
    try {
      console.log(
        'Sending email to:',
        user.email,
        'with template:',
        templateKey,
        'and fields:',
        dynamicFields
      );

      // Use Zeptomail service to send email with template
      const emailSent = await this.zeptomailService.sendEmailWithTemplate({
        to: user.email,
        templateKey: templateKey,
        dynamicFields: dynamicFields,
        userName: user.name,
        userEmail: user.email,
      });

      if (emailSent) {
        return {
          success: true,
          message: 'Email sent successfully',
          data: {
            recipient: user.email,
            template: templateKey,
            sentAt: new Date().toISOString(),
          },
        };
      } else {
        return {
          success: false,
          message: 'Failed to send email',
          error: 'Zeptomail service returned false',
        };
      }
    } catch (error) {
      console.error('Error sending email:', error);
      return {
        success: false,
        message: 'Failed to send email',
        error: error.message,
      };
    }
  }
}
