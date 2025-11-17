import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailService } from './email.service';
import { BookRating } from '../entities/book-rating.entity';
import { Book } from '../entities/book.entity';
import { User } from '../entities/user.entity';
import { CastMember } from '../entities/cast-member.entity';
import { StoryCast } from '../entities/story-cast.entity';
import { ConfigService } from '@nestjs/config';

export interface ReviewNotificationData {
  bookId: string;
  userId: string;
  rating: number;
  comment?: string;
  userName: string;
  userEmail: string;
  bookTitle: string;
  bookCoverUrl?: string;
}

@Injectable()
export class ReviewNotificationService {
  private readonly logger = new Logger(ReviewNotificationService.name);

  constructor(
    @InjectRepository(BookRating)
    private bookRatingRepository: Repository<BookRating>,
    @InjectRepository(Book)
    private bookRepository: Repository<Book>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(CastMember)
    private castMemberRepository: Repository<CastMember>,
    @InjectRepository(StoryCast)
    private storyCastRepository: Repository<StoryCast>,
    private emailService: EmailService,
    private configService: ConfigService
  ) {}

  /**
   * Send email notifications when a new review is added
   */
  async sendReviewNotifications(
    reviewData: ReviewNotificationData
  ): Promise<void> {
    try {
      this.logger.log(
        `Sending review notifications for story ${reviewData.bookId}`
      );

      // Get all recipients who should be notified
      const recipients = await this.getNotificationRecipients(
        reviewData.bookId
      );

      // Send notifications to all recipients
      const notificationPromises = recipients.map(recipient =>
        this.sendReviewNotificationToRecipient(recipient, reviewData)
      );

      await Promise.allSettled(notificationPromises);

      this.logger.log(
        `Review notifications sent to ${recipients.length} recipients`
      );
    } catch (error) {
      this.logger.error('Failed to send review notifications:', error);
      throw error;
    }
  }

  /**
   * Get all recipients who should be notified about the review
   */
  private async getNotificationRecipients(bookId: string): Promise<
    Array<{
      email: string;
      name: string;
      role: 'superadmin' | 'voice_artist' | 'writer';
    }>
  > {
    const recipients: Array<{
      email: string;
      name: string;
      role: 'superadmin' | 'voice_artist' | 'writer';
    }> = [];

    try {
      // 1. Get superadmin email from config
      const superadminEmail =
        this.configService.get<string>('email.adminEmail');
      if (superadminEmail) {
        recipients.push({
          email: superadminEmail,
          name: 'Superadmin',
          role: 'superadmin',
        });
      }

      // 2. Get cast members (voice artists) associated with this book
      const castMembers = await this.getCastMembersForBook(bookId);
      const castRecipients = castMembers
        .map(cast => ({
          email: cast.email,
          name: cast.name,
          role: 'voice_artist' as const,
        }))
        .filter(cast => cast.email);
      recipients.push(...castRecipients);

      // 3. Get writers from story_casts table (cast members with writer/author role)
      const writers = await this.getWritersForBook(bookId);
      recipients.push(
        ...writers
          .map(writer => ({
            email: writer.email,
            name: writer.name,
            role: 'writer' as const,
          }))
          .filter(writer => writer.email)
      );

      // Remove duplicates based on email AND role (same person can receive multiple notifications for different roles)
      const uniqueRecipients = recipients.filter(
        (recipient, index, self) =>
          index ===
          self.findIndex(
            r => r.email === recipient.email && r.role === recipient.role
          )
      );

      return uniqueRecipients;
    } catch (error) {
      this.logger.error('Failed to get notification recipients:', error);
      return [];
    }
  }

  /**
   * Get cast members (voice artists) associated with a book
   */
  private async getCastMembersForBook(
    bookId: string
  ): Promise<Array<{ email: string; name: string }>> {
    try {
      // Get story casts with voice artist roles (voice_artist, voice_over, narrator, etc.)
      const storyCasts = await this.storyCastRepository.find({
        where: { story_id: bookId },
      });

      // Filter for voice artist roles (case-insensitive)
      const voiceArtistRoles = [
        'voice_artist',
        'voice_over',
        'voice artist',
        'voice over',
        'Voice Over artist',
        'voice over artist',
        'voice over artist team',
      ];
      const voiceArtistCasts = storyCasts.filter(cast =>
        voiceArtistRoles.some(role =>
          cast.role?.toLowerCase().includes(role.toLowerCase())
        )
      );

      const castMembers: Array<{ email: string; name: string }> = [];
      for (const storyCast of voiceArtistCasts) {
        if (storyCast.cast_id && storyCast.cast_id.trim() !== '') {
          const castMember = await this.castMemberRepository.findOne({
            where: { id: storyCast.cast_id },
          });
          if (castMember && castMember.email) {
            castMembers.push({
              email: castMember.email,
              name: castMember.name,
            });
          }
        }
      }

      return castMembers;
    } catch (error) {
      this.logger.error('Failed to get cast members for book:', error);
      return [];
    }
  }

  /**
   * Get writers associated with a book from story_casts table
   */
  private async getWritersForBook(
    bookId: string
  ): Promise<Array<{ email: string; name: string }>> {
    try {
      // Get story casts with writer/author roles
      const storyCasts = await this.storyCastRepository.find({
        where: { story_id: bookId },
      });

      // Filter for writer roles (case-insensitive)
      const writerRoles = [
        'Writer',
        'writer',
        'author',
        'co-writer',
        'co-author',
      ];
      const writerCasts = storyCasts.filter(cast =>
        writerRoles.some(role =>
          cast.role?.toLowerCase().includes(role.toLowerCase())
        )
      );

      const writers: Array<{ email: string; name: string }> = [];
      for (const storyCast of writerCasts) {
        if (storyCast.cast_id && storyCast.cast_id.trim() !== '') {
          const castMember = await this.castMemberRepository.findOne({
            where: { id: storyCast.cast_id },
          });
          if (castMember && castMember.email) {
            writers.push({
              email: castMember.email,
              name: castMember.name,
            });
          }
        }
      }

      return writers;
    } catch (error) {
      this.logger.error('Failed to get writers for book:', error);
      return [];
    }
  }

  /**
   * Send review notification to a specific recipient
   */
  private async sendReviewNotificationToRecipient(
    recipient: { email: string; name: string; role: string },
    reviewData: ReviewNotificationData
  ): Promise<boolean> {
    try {
      const template = this.getReviewNotificationTemplate(recipient.role);
      const data = {
        recipientName: recipient.name,
        userName: reviewData.userName,
        userEmail: reviewData.userEmail,
        bookTitle: reviewData.bookTitle,
        bookCoverUrl: reviewData.bookCoverUrl,
        rating: reviewData.rating,
        comment: reviewData.comment || 'No comment provided',
        reviewDate: new Date().toLocaleString(),
        appName: this.configService.get<string>('email.templates.appName'),
        appUrl: this.configService.get<string>('email.templates.appUrl'),
        adminUrl: this.configService.get<string>('email.templates.baseUrl'),
      };

      const html = template(data);
      const subject = this.getReviewNotificationSubject(
        recipient.role,
        reviewData.bookTitle
      );

      return await this.emailService.sendEmail({
        to: recipient.email,
        subject,
        html,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send review notification to ${recipient.email}:`,
        error
      );
      return false;
    }
  }

  /**
   * Get the appropriate email template based on recipient role
   */
  private getReviewNotificationTemplate(
    role: string
  ): HandlebarsTemplateDelegate {
    const templateName = `review-notification-${role}`;
    return this.emailService['loadTemplate'](templateName);
  }

  /**
   * Get the appropriate email subject based on recipient role
   */
  private getReviewNotificationSubject(
    role: string,
    bookTitle: string
  ): string {
    const appName = this.configService.get<string>('email.templates.appName');

    switch (role) {
      case 'superadmin':
        return `New Review Alert - ${bookTitle} - ${appName}`;
      case 'voice_artist':
        return `New Review for Your Voice Work - ${bookTitle} - ${appName}`;
      case 'writer':
        return `New Review for Your Story - ${bookTitle} - ${appName}`;
      default:
        return `New Review - ${bookTitle} - ${appName}`;
    }
  }
}
