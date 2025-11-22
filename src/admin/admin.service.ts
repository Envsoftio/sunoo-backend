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
import { DeviceToken } from '../entities/device-token.entity';
import { EmailService } from '../email/email.service';
import { ZeptomailService } from '../email/zeptomail.service';
import { S3Service } from '../common/services/s3.service';
import { ContactFormDto } from '../dto/contact.dto';
import { SanitizationUtil } from '../common/utils/sanitization.util';
import { PushNotificationService } from '../push-notification/push-notification.service';
import {
  SendNotificationDto,
  ContentNotificationDto,
  EngagementNotificationDto,
  EngagementType,
  NotificationType,
} from '../dto/push-notification.dto';
import { In } from 'typeorm';

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
    @InjectRepository(DeviceToken)
    private deviceTokenRepository: Repository<DeviceToken>,
    private emailService: EmailService,
    private zeptomailService: ZeptomailService,
    private s3Service: S3Service,
    private pushNotificationService: PushNotificationService
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
          'hasDefaultPassword',
          'authId',
          'country',
          'isEmailVerified',
          'lastLoginAt',
          'avatar',
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

  async getAllSessions() {
    try {
      const sessions = await this.userSessionRepository.find({
        relations: ['user'],
        order: { created_at: 'DESC' },
        take: 1000, // Limit to prevent huge queries
      });

      const processedSessions = sessions.map(session => ({
        id: session.id,
        userId: session.userId,
        userEmail: session.user?.email || 'Unknown',
        userName: session.user?.name || 'Unknown',
        refreshToken: session.refreshToken,
        expiresAt: session.expiresAt,
        lastUsedAt: session.lastUsedAt,
        isActive: session.isActive,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        deviceInfo: session.deviceInfo,
        createdAt: session.created_at,
        updatedAt: session.updated_at,
      }));

      return { success: true, data: processedSessions };
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

      switch (period) {
        case 'day':
          dateFormat = 'YYYY-MM-DD';
          break;
        case 'week':
          // Use ISO week format to match Supabase implementation
          dateFormat = 'IYYY-"W"IW';
          break;
        case 'month':
          dateFormat = 'YYYY-MM';
          break;
        case 'year':
          dateFormat = 'YYYY';
          break;
        default:
          dateFormat = 'YYYY-MM-DD';
      }

      // Get all user registrations without date filter (like Supabase implementation)
      const registrations = await this.userRepository
        .createQueryBuilder('user')
        .select(`TO_CHAR(user.created_at, '${dateFormat}')`, 'period')
        .addSelect('COUNT(*)', 'count')
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

      switch (period) {
        case 'day':
          dateFormat = 'YYYY-MM-DD';
          break;
        case 'week':
          // Use ISO week format to match Supabase implementation
          dateFormat = 'IYYY-"W"IW';
          break;
        case 'month':
          dateFormat = 'YYYY-MM';
          break;
        case 'year':
          dateFormat = 'YYYY';
          break;
        default:
          dateFormat = 'YYYY-MM-DD';
      }

      // Get all periods to ensure we have data for all periods (like Supabase implementation)
      const allPeriods = await this.subscriptionRepository
        .createQueryBuilder('subscription')
        .select(`TO_CHAR(subscription.created_at, '${dateFormat}')`, 'period')
        .groupBy(`TO_CHAR(subscription.created_at, '${dateFormat}')`)
        .orderBy('period', 'ASC')
        .getRawMany();

      // Get subscription counts by status for each period
      const subscriptions = await this.subscriptionRepository
        .createQueryBuilder('subscription')
        .select(`TO_CHAR(subscription.created_at, '${dateFormat}')`, 'period')
        .addSelect('subscription.status', 'status')
        .addSelect('COUNT(*)', 'count')
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
          inactive: 0, // Add inactive status
          authorized: 0,
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
            case 'pending':
            case 'authenticated':
              // Map authorized/pending states to 'authorized'
              periodData.authorized += parseInt(item.count);
              break;
            case 'cancelled':
            case 'inactive':
            case 'halted':
            case 'failed':
              // Map various inactive states to 'inactive'
              periodData.inactive += parseInt(item.count);
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
      // Get user progress with related data - this is the correct approach
      let query = this.userProgressRepository
        .createQueryBuilder('progress')
        .leftJoinAndSelect('progress.user', 'user')
        .leftJoinAndSelect('progress.book', 'book')
        .leftJoinAndSelect('progress.chapter', 'chapter')
        .select([
          'progress.id',
          'progress.currentTime',
          'progress.updated_at',
          'user.id',
          'user.name',
          'user.email',
          'user.imageURL',
          'book.id',
          'book.title',
          'chapter.id',
          'chapter.name',
          'chapter.playbackTime',
        ])
        .orderBy('progress.updated_at', 'DESC')
        .limit(100); // Add limit for performance

      if (startDate) {
        query = query.andWhere('progress.updated_at >= :startDate', {
          startDate,
        });
      }
      if (endDate) {
        query = query.andWhere('progress.updated_at <= :endDate', { endDate });
      }

      const activities = await query.getMany();

      // Transform the data to match frontend expectations
      const transformedActivities = activities.map(activity => {
        // Convert playbackTime string to seconds (similar to frontend logic)
        let playbackTimeSec = 0;
        if (typeof activity.chapter?.playbackTime === 'string') {
          // Handle different formats: "01h 05m 08s" or "1:23:45"
          if (
            activity.chapter.playbackTime.includes('h') ||
            activity.chapter.playbackTime.includes('m') ||
            activity.chapter.playbackTime.includes('s')
          ) {
            // Format: "01h 05m 08s"
            const hMatch = activity.chapter.playbackTime.match(/(\d+)h/);
            const mMatch = activity.chapter.playbackTime.match(/(\d+)m/);
            const sMatch = activity.chapter.playbackTime.match(/(\d+)s/);
            if (hMatch) playbackTimeSec += parseInt(hMatch[1], 10) * 3600;
            if (mMatch) playbackTimeSec += parseInt(mMatch[1], 10) * 60;
            if (sMatch) playbackTimeSec += parseInt(sMatch[1], 10);
          } else if (activity.chapter.playbackTime.includes(':')) {
            // Format: "1:23:45" or "23:45"
            const timeParts = activity.chapter.playbackTime
              .split(':')
              .map(Number);
            if (timeParts.length === 3) {
              playbackTimeSec =
                timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2];
            } else if (timeParts.length === 2) {
              playbackTimeSec = timeParts[0] * 60 + timeParts[1];
            }
          }
        } else if (typeof activity.chapter?.playbackTime === 'number') {
          playbackTimeSec = activity.chapter.playbackTime;
        }

        const prog = Number(activity.currentTime);
        let percent = 0;
        if (playbackTimeSec > 0 && !isNaN(prog)) {
          percent = Math.min(100, Math.round((prog / playbackTimeSec) * 100));
        }

        return {
          id: activity.id,
          userName: activity.user?.name || '',
          userEmail: activity.user?.email || '',
          userImage: activity.user?.imageURL || null,
          bookTitle: activity.book?.title || '',
          chapterName: activity.chapter?.name || '',
          progress_time: activity.currentTime, // Using currentTime instead of progress_time
          playbackTime: playbackTimeSec,
          progressPercent: percent,
          updated_at: activity.updated_at,
          // Keep the old structure for backward compatibility
          User: activity.user
            ? {
                id: activity.user.id,
                name: activity.user.name,
                email: activity.user.email,
                imageURL: activity.user.imageURL,
              }
            : null,
          Books: activity.book
            ? {
                id: activity.book.id,
                title: activity.book.title,
              }
            : null,
          Chapters: activity.chapter
            ? {
                id: activity.chapter.id,
                name: activity.chapter.name,
                playbackTime: activity.chapter.playbackTime,
              }
            : null,
        };
      });

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

      // Convert picture keys to full URLs for API response
      const castsWithUrls = result.map(cast => ({
        ...cast,
        picture: cast.picture
          ? this.s3Service.getFileUrl(cast.picture)
          : cast.picture,
      }));

      return { success: true, casts: castsWithUrls };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async saveStoryCasts(storyId: string, casts: any[]) {
    try {
      if (!storyId) {
        return { success: false, message: 'Story ID is required' };
      }

      // First, delete existing casts for this story
      await this.storyCastRepository.delete({ story_id: storyId });

      // If no casts provided, just return success (all casts deleted)
      if (!casts || casts.length === 0) {
        return { success: true, message: 'Casts removed successfully' };
      }

      // Then, insert new casts - filter out invalid entries
      const storyCasts = casts
        .filter(cast => {
          // Ensure required fields are present
          if (!cast.role || cast.role.trim() === '') {
            console.warn('Skipping cast without role:', cast);
            return false;
          }
          return true;
        })
        .map(cast => {
          const storyCast = new StoryCast();
          storyCast.story_id = storyId;
          storyCast.name = cast.name || null;
          storyCast.role = cast.role.trim(); // Required field
          storyCast.picture = cast.picture_url || cast.picture || null;
          // cast_id is required in DB (NOT NULL), use empty string if not provided
          storyCast.cast_id =
            cast.cast_id && cast.cast_id !== '' ? cast.cast_id : '';
          storyCast.created_at = new Date();
          storyCast.updated_at = new Date();
          return storyCast;
        });

      // Only save if we have valid casts
      if (storyCasts.length > 0) {
        await this.storyCastRepository.save(storyCasts);
      }

      return {
        success: true,
        message: 'Casts saved successfully',
        savedCount: storyCasts.length,
      };
    } catch (error) {
      console.error('Error saving story casts:', error);
      return {
        success: false,
        message: error.message || 'Failed to save casts',
        error: error.stack,
      };
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

      // Auto-generate slug from name if not provided
      if (!data.slug && data.name) {
        data.slug = data.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
      }

      // Set updated_at timestamp
      data.updated_at = new Date();

      if (id) {
        // Update existing category
        await this.categoryRepository.update(id, data);
        const updatedCategory = await this.categoryRepository.findOne({
          where: { id },
        });
        return {
          success: true,
          message: 'Category updated successfully',
          data: updatedCategory,
        };
      } else {
        // Create new category
        const category = this.categoryRepository.create({
          ...data,
          created_at: new Date(),
        });
        const savedCategory = await this.categoryRepository.save(category);
        return {
          success: true,
          message: 'Category created successfully',
          data: savedCategory,
        };
      }
    } catch (error) {
      console.error('Error saving category:', error);
      return {
        success: false,
        message: error.message || 'Failed to save category',
      };
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
  async createCastMember(data: {
    name: string;
    bio: string;
    picture: string;
    email?: string;
  }) {
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
    data: {
      name: string;
      bio: string;
      picture: string;
      email?: string;
    }
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

  async uploadCastPicture(id: string, file: any) {
    try {
      if (!file) {
        return { success: false, message: 'No file provided' };
      }

      // Upload to S3 - returns only the key (path), not full URL
      // Use casts/{id}.jpg format so updates overwrite existing file
      const fileExtension = this.getFileExtension(file.originalname) || '.jpg';
      const fileKey = await this.s3Service.uploadMulterFile(
        file,
        'casts',
        `${id}${fileExtension}`
      );

      // Update cast member with S3 key (path only)
      await this.castMemberRepository.update(id, { picture: fileKey });

      // Return both key and full URL for API response
      const fileUrl = this.s3Service.getFileUrl(fileKey);

      return {
        success: true,
        message: 'Picture uploaded successfully',
        data: { pictureKey: fileKey, pictureUrl: fileUrl },
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot !== -1 ? filename.substring(lastDot) : '';
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
          ? ratings.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) /
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

  /**
   * Generate slug from title (matching Supabase function logic)
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Handle HLS conversion webhook - creates book and chapters from conversion output
   */
  async handleHlsWebhook(payload: {
    outputPaths: Array<{ name: string; url: string; playbackTime?: string }>;
    storyName: string;
    totalDuration: string;
  }) {
    try {
      const { outputPaths, storyName, totalDuration } = payload;
      console.log('totalDuration', totalDuration);
      // Validate required fields
      if (!outputPaths || !Array.isArray(outputPaths)) {
        return {
          success: false,
          message: "Invalid payload: missing 'outputPaths'",
        };
      }

      if (!storyName || typeof storyName !== 'string') {
        return {
          success: false,
          message: "Invalid payload: missing 'storyName'",
        };
      }

      // Validate outputPaths structure
      for (const pathObj of outputPaths) {
        if (!pathObj.name || !pathObj.url) {
          return {
            success: false,
            message: "Invalid outputPaths object: missing 'name' or 'url'",
          };
        }
      }

      // Generate slug from story name
      const slug = this.generateSlug(storyName);

      // Create book
      const newBook = this.bookRepository.create({
        title: storyName,
        slug: slug,
        duration: totalDuration,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const savedBook = await this.bookRepository.save(newBook);

      // Prepare chapters - save only S3 keys (paths), not full URLs
      const chapters = outputPaths.map((pathObj, index) => {
        return this.chapterRepository.create({
          name: pathObj.name,
          chapterUrl: pathObj.url, // Store S3 key/path directly
          bookId: savedBook.id,
          playbackTime: pathObj.playbackTime || undefined,
          order: index + 1,
          created_at: new Date(),
          updated_at: new Date(),
        });
      });

      // Insert chapters
      const savedChapters = await this.chapterRepository.save(chapters);

      return {
        success: true,
        status: 'success',
        bookId: savedBook.id,
        chaptersInserted: savedChapters.length,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Internal Server Error',
      };
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

      // Exclude bookCoverUrl from update if not provided
      // Cover is handled separately via the cover upload endpoint
      const { bookCoverUrl: _bookCoverUrl, ...updateData } = storyData;

      updateData.updated_at = new Date();

      await this.bookRepository.update(id, updateData);
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

  async updateStoryCover(id: string, file: any) {
    try {
      if (!file) {
        return { success: false, message: 'No file provided' };
      }

      const story = await this.bookRepository.findOne({
        where: { id, deleted_at: IsNull() },
      });
      if (!story) {
        return { success: false, message: 'Story not found' };
      }

      // Upload to S3 - returns only the key (path), not full URL
      // Use stories/{id}/picture.{ext} format so updates overwrite existing file
      const fileExtension = this.getFileExtension(file.originalname) || '.jpg';
      const fileKey = await this.s3Service.uploadMulterFile(
        file,
        'stories',
        `${id}/picture${fileExtension}`
      );

      // Update story with S3 key (path only)
      await this.bookRepository.update(id, {
        bookCoverUrl: fileKey,
        updated_at: new Date(),
      });

      // Return both key and full URL for API response
      const fileUrl = this.s3Service.getFileUrl(fileKey);

      return {
        success: true,
        message: 'Story cover uploaded successfully',
        data: { coverKey: fileKey, coverUrl: fileUrl },
      };
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
          ? ratings.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) /
            totalRatings
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
          error: 'Email service returned false',
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

  // Story Plays Analytics Methods
  async getStoryPlaysAnalytics(
    page: number = 1,
    limit: number = 10,
    search: string = '',
    sortBy: string = 'total_plays',
    sortOrder: string = 'desc',
    storyId: string = '',
    language: string = ''
  ) {
    try {
      const offset = (page - 1) * limit;

      let query = this.userProgressRepository
        .createQueryBuilder('progress')
        .leftJoin('progress.book', 'book')
        .leftJoin('progress.user', 'user')
        .leftJoin('book.category', 'category')
        .select([
          'book.id',
          'book.title',
          'book.slug',
          'book.bookCoverUrl',
          'book.language',
          'book.isPublished',
          'book.created_at',
          'category.name',
          'category.slug',
        ])
        .addSelect('SUM(progress.currentTime)', 'total_play_time')
        .addSelect('COUNT(DISTINCT progress.userId)', 'unique_listeners')
        .addSelect('COUNT(progress.id)', 'total_plays')
        .addSelect('AVG(progress.currentTime)', 'avg_play_time')
        .where('progress.currentTime > 0')
        .groupBy(
          'book.id, book.title, book.slug, book.bookCoverUrl, book.language, book.isPublished, book.created_at, category.name, category.slug'
        );

      // Apply search filter
      if (search) {
        query = query.andWhere(
          '(book.title ILIKE :search OR book.slug ILIKE :search OR book.bookDescription ILIKE :search)',
          { search: `%${search}%` }
        );
      }

      // Apply language filter
      if (language) {
        query = query.andWhere('book.language = :language', { language });
      }

      // Apply story filter
      if (storyId) {
        query = query.andWhere('book.id = :storyId', { storyId });
      }

      // Apply sorting
      const validSortFields = [
        'total_play_time',
        'unique_listeners',
        'total_plays',
        'avg_play_time',
        'book.title',
        'book.created_at',
      ];
      const sortField = validSortFields.includes(sortBy)
        ? sortBy
        : 'total_plays';
      const sortDirection = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

      query = query.orderBy(sortField, sortDirection);

      // Add secondary sort by book.id to ensure deterministic ordering
      if (sortField !== 'book.id') {
        query = query.addOrderBy('book.id', 'ASC');
      }

      // Get total count for pagination - need to count grouped results
      const countQuery = this.userProgressRepository
        .createQueryBuilder('progress')
        .leftJoin('progress.book', 'book')
        .leftJoin('book.category', 'category')
        .select('book.id')
        .where('progress.currentTime > 0')
        .groupBy('book.id');

      // Apply same filters to count query
      if (search) {
        countQuery.andWhere(
          '(book.title ILIKE :search OR book.slug ILIKE :search OR book.bookDescription ILIKE :search)',
          { search: `%${search}%` }
        );
      }

      if (language) {
        countQuery.andWhere('book.language = :language', { language });
      }

      if (storyId) {
        countQuery.andWhere('book.id = :storyId', { storyId });
      }

      const total = await countQuery.getCount();

      // Apply pagination
      const results = await query.skip(offset).take(limit).getRawMany();

      // Transform data to match expected format
      const transformedData = results.map(item => ({
        storyId: item.book_id,
        title: item.book_title,
        slug: item.book_slug,
        coverUrl: item.book_bookCoverUrl,
        language: item.book_language,
        isPublished: item.book_isPublished,
        createdAt: item.book_created_at,
        category: item.category_name || 'Uncategorized',
        categorySlug: item.category_slug || '',
        totalPlayTime: parseFloat(item.total_play_time) || 0,
        uniqueListeners: parseInt(item.unique_listeners) || 0,
        totalPlays: parseInt(item.total_plays) || 0,
        avgPlayTime: parseFloat(item.avg_play_time) || 0,
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

  async getStoryPlayDetails(
    storyId: string,
    page: number = 1,
    limit: number = 10
  ) {
    try {
      const offset = (page - 1) * limit;

      const query = this.userProgressRepository
        .createQueryBuilder('progress')
        .leftJoinAndSelect('progress.user', 'user')
        .leftJoinAndSelect('progress.chapter', 'chapter')
        .leftJoinAndSelect('progress.book', 'book')
        .select([
          'progress.id',
          'progress.currentTime',
          'progress.updated_at',
          'progress.created_at',
          'user.id',
          'user.name',
          'user.email',
          'user.imageURL',
          'chapter.id',
          'chapter.name',
          'chapter.playbackTime',
          'book.id',
          'book.title',
        ])
        .where('progress.bookId = :storyId', { storyId })
        .andWhere('progress.currentTime > 0')
        .orderBy('progress.updated_at', 'DESC');

      // Get total count for pagination
      const total = await query.getCount();

      // Apply pagination
      const results = await query.skip(offset).take(limit).getMany();

      // Transform data
      const transformedData = results.map(progress => {
        // Convert playbackTime string to seconds
        let playbackTimeSec = 0;
        if (typeof progress.chapter?.playbackTime === 'string') {
          if (
            progress.chapter.playbackTime.includes('h') ||
            progress.chapter.playbackTime.includes('m') ||
            progress.chapter.playbackTime.includes('s')
          ) {
            // Format: "01h 05m 08s"
            const hMatch = progress.chapter.playbackTime.match(/(\d+)h/);
            const mMatch = progress.chapter.playbackTime.match(/(\d+)m/);
            const sMatch = progress.chapter.playbackTime.match(/(\d+)s/);
            if (hMatch) playbackTimeSec += parseInt(hMatch[1], 10) * 3600;
            if (mMatch) playbackTimeSec += parseInt(mMatch[1], 10) * 60;
            if (sMatch) playbackTimeSec += parseInt(sMatch[1], 10);
          } else if (progress.chapter.playbackTime.includes(':')) {
            // Format: "1:23:45" or "23:45"
            const timeParts = progress.chapter.playbackTime
              .split(':')
              .map(Number);
            if (timeParts.length === 3) {
              playbackTimeSec =
                timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2];
            } else if (timeParts.length === 2) {
              playbackTimeSec = timeParts[0] * 60 + timeParts[1];
            }
          }
        } else if (typeof progress.chapter?.playbackTime === 'number') {
          playbackTimeSec = progress.chapter.playbackTime;
        }

        const prog = Number(progress.currentTime);
        let percent = 0;
        if (playbackTimeSec > 0 && !isNaN(prog)) {
          percent = Math.min(100, Math.round((prog / playbackTimeSec) * 100));
        }

        return {
          id: progress.id,
          userId: progress.user?.id,
          userName: progress.user?.name || '',
          userEmail: progress.user?.email || '',
          userImage: progress.user?.imageURL || null,
          chapterId: progress.chapter?.id,
          chapterName: progress.chapter?.name || '',
          playbackTime: playbackTimeSec,
          progressTime: progress.currentTime, // Using currentTime instead of progress_time
          progressPercent: percent,
          updatedAt: progress.updated_at,
          createdAt: progress.created_at,
        };
      });

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

  async getStoryPlayLanguages() {
    try {
      const languages = await this.bookRepository
        .createQueryBuilder('book')
        .select('DISTINCT book.language', 'language')
        .where('book.language IS NOT NULL')
        .andWhere('book.deleted_at IS NULL')
        .getRawMany();

      return {
        success: true,
        data: languages
          .map(l => l.language)
          .filter(lang => lang && lang.trim() !== ''),
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async submitContactForm(contactFormDto: ContactFormDto) {
    try {
      const { name, email, message, website } = contactFormDto;

      // Honeypot check - if website field is filled, it's likely a bot
      if (website && website.trim().length > 0) {
        // Silently reject but return success message
        return {
          success: true,
          message: 'Thank you for your message. We will get back to you soon!',
        };
      }

      // Sanitize and validate inputs
      const sanitizedName = SanitizationUtil.sanitizeInput(name);
      const sanitizedEmail = SanitizationUtil.sanitizeEmail(email);
      const sanitizedMessage = SanitizationUtil.sanitizeInput(message);

      // Validate name format
      if (!SanitizationUtil.isValidName(sanitizedName)) {
        // Return generic success message to avoid revealing validation to spammers
        return {
          success: true,
          message: 'Thank you for your message. We will get back to you soon!',
        };
      }

      // Validate message content
      if (!SanitizationUtil.isValidMessage(sanitizedMessage)) {
        // Return generic success message to avoid revealing validation to spammers
        return {
          success: true,
          message: 'Thank you for your message. We will get back to you soon!',
        };
      }

      // Additional spam check on sanitized data
      if (
        SanitizationUtil.isSpamText(sanitizedName) ||
        SanitizationUtil.isSpamText(sanitizedMessage)
      ) {
        // Silently reject spam but return success message
        return {
          success: true,
          message: 'Thank you for your message. We will get back to you soon!',
        };
      }

      // Send email using the contact form template
      await this.emailService.sendContactFormEmail({
        name: sanitizedName,
        email: sanitizedEmail,
        message: sanitizedMessage,
      });

      // Always return generic success message (don't reveal if email failed to spammers)
      return {
        success: true,
        message: 'Thank you for your message. We will get back to you soon!',
      };
    } catch (error) {
      console.error('Error submitting contact form:', error);
      // Always return generic success message even on error
      return {
        success: true,
        message: 'Thank you for your message. We will get back to you soon!',
      };
    }
  }

  // Push Notification Methods
  async sendPushNotification(dto: SendNotificationDto) {
    try {
      let userIds: string[] = [];
      let anonymousTokens: string[] = [];

      // Determine target users based on filters
      if (dto.targetFilters?.allUsers) {
        // Get all active users
        const users = await this.userRepository.find({
          where: { isActive: true },
          select: ['id'],
        });
        userIds = users.map(u => u.id);
      } else {
        if (dto.targetFilters?.activeSubscriptions) {
          const subscriptions = await this.subscriptionRepository.find({
            where: { status: 'active' },
            select: ['user_id'],
          });
          const subUserIds = subscriptions
            .map(s => s.user_id)
            .filter((id): id is string => id !== null && id !== undefined);
          userIds.push(...subUserIds);
        }

        if (dto.targetFilters?.withBookmarks) {
          const bookmarks = await this.bookmarkRepository.find({
            select: ['userId'],
          });
          const bookmarkUserIds = [
            ...new Set(
              bookmarks
                .map(b => b.userId)
                .filter((id): id is string => id !== null && id !== undefined)
            ),
          ];
          userIds.push(...bookmarkUserIds);
        }

        if (dto.targetFilters?.withProgress) {
          const progress = await this.userProgressRepository.find({
            select: ['userId'],
          });
          const progressUserIds = [
            ...new Set(
              progress
                .map(p => p.userId)
                .filter((id): id is string => id !== null && id !== undefined)
            ),
          ];
          userIds.push(...progressUserIds);
        }

        if (dto.targetFilters?.userIds) {
          userIds.push(...dto.targetFilters.userIds);
        }

        if (dto.targetFilters?.anonymousUsers) {
          // Get anonymous device tokens - we'll need to add a method to PushNotificationService
          // For now, we'll handle this in the service method
          anonymousTokens = []; // Will be handled by sendToAnonymousUsers
        }
      }

      // Remove duplicates
      userIds = [...new Set(userIds)];

      let totalSuccess = 0;
      let totalFailed = 0;

      // Send to authenticated users
      if (userIds.length > 0) {
        const result = await this.pushNotificationService.sendToUsers(
          userIds,
          dto.title,
          dto.message,
          dto.data,
          dto.type
        );
        totalSuccess += result.success;
        totalFailed += result.failed;
      }

      // Send to anonymous users (if requested)
      if (dto.targetFilters?.anonymousUsers) {
        // Get all anonymous tokens
        const allTokens = await this.deviceTokenRepository.find({
          where: { userId: IsNull(), isActive: true },
        });
        const anonymousTokenStrings = allTokens.map(dt => dt.token);

        if (anonymousTokenStrings.length > 0) {
          const result =
            await this.pushNotificationService.sendToAnonymousUsers(
              anonymousTokenStrings,
              dto.title,
              dto.message,
              dto.data,
              dto.type
            );
          totalSuccess += result.success;
          totalFailed += result.failed;
        }
      }

      return {
        success: true,
        message: `Notification sent to ${totalSuccess} devices`,
        data: {
          success: totalSuccess,
          failed: totalFailed,
          totalTargeted: userIds.length + anonymousTokens.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to send push notification',
      };
    }
  }

  async sendPushToAll(dto: {
    title: string;
    message: string;
    data?: any;
    type?: NotificationType;
  }) {
    try {
      const result = await this.pushNotificationService.sendToAll(
        dto.title,
        dto.message,
        dto.data,
        dto.type || NotificationType.CUSTOM
      );

      return {
        success: true,
        message: `Notification broadcast to ${result.success} devices`,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to broadcast push notification',
      };
    }
  }

  async sendContentNotification(dto: ContentNotificationDto) {
    try {
      // Prepare data payload with deep linking information
      const data = {
        type: 'new_content',
        storyId: dto.storyId,
        ...(dto.chapterId && { chapterId: dto.chapterId }),
        ...dto.targetFilters,
      };

      // Use sendPushNotification with NEW_CONTENT type (always sent regardless of preferences)
      const result = await this.sendPushNotification({
        title: dto.title,
        message: dto.message,
        type: NotificationType.NEW_CONTENT,
        targetFilters: dto.targetFilters,
        data,
      });

      return {
        success: true,
        message: 'Content notification sent successfully',
        data: result.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to send content notification',
      };
    }
  }

  async sendEngagementNotification(dto: EngagementNotificationDto) {
    try {
      let userIds: string[] = [];

      // Determine target users based on engagement type
      if (dto.type === EngagementType.BOOKMARK_REMINDER) {
        const bookmarks = await this.bookmarkRepository.find({
          select: ['userId'],
        });
        userIds = [
          ...new Set(
            bookmarks
              .map(b => b.userId)
              .filter((id): id is string => id !== null && id !== undefined)
          ),
        ];
      } else if (dto.type === EngagementType.CONTINUE_LISTENING) {
        const progress = await this.userProgressRepository.find({
          where: { progress: In([1, 2, 3, 4, 5, 6, 7, 8, 9]) }, // Progress between 1-90%
          select: ['userId'],
        });
        userIds = [
          ...new Set(
            progress
              .map(p => p.userId)
              .filter((id): id is string => id !== null && id !== undefined)
          ),
        ];
      }

      // Apply additional filters if provided
      if (dto.targetFilters) {
        if (dto.targetFilters.activeSubscriptions) {
          const subscriptions = await this.subscriptionRepository.find({
            where: { status: 'active' },
            select: ['user_id'],
          });
          const subUserIds = subscriptions
            .map(s => s.user_id)
            .filter((id): id is string => id !== null && id !== undefined);
          userIds = userIds.filter(id => subUserIds.includes(id));
        }

        if (dto.targetFilters.userIds && dto.targetFilters.userIds.length > 0) {
          userIds = userIds.filter(id =>
            dto.targetFilters!.userIds!.includes(id)
          );
        }
      }

      // Remove duplicates
      userIds = [...new Set(userIds)];

      const result = await this.pushNotificationService.sendToUsers(
        userIds,
        dto.title,
        dto.message,
        { type: 'engagement', engagementType: dto.type },
        NotificationType.ENGAGEMENT
      );

      return {
        success: true,
        message: `Engagement notification sent to ${result.success} devices`,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to send engagement notification',
      };
    }
  }

  async getPushNotificationStats() {
    try {
      const stats = await this.pushNotificationService.getStats();
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to get push notification statistics',
      };
    }
  }
}
