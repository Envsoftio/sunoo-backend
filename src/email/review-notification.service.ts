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

      // 3. Get writers (users with writer role) - you might want to add a writer role to users
      // For now, we'll get all users who have written reviews for this book as potential writers
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
      const storyCasts = await this.storyCastRepository.find({
        where: { story_id: bookId },
      });

      const castMembers: Array<{ email: string; name: string }> = [];
      for (const storyCast of storyCasts) {
        if (storyCast.cast_id) {
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
   * Get writers associated with a book
   * For now, we'll get users who have reviewed this book as potential writers
   * You might want to add a proper writer role or relationship
   */
  private async getWritersForBook(
    bookId: string
  ): Promise<Array<{ email: string; name: string }>> {
    try {
      // This is a placeholder implementation
      // You might want to add a proper writer relationship to books
      // For now, we'll get users who have reviewed this book
      const reviews = await this.bookRatingRepository.find({
        where: { bookId },
        relations: ['user'],
      });

      return reviews
        .map(review => review.user)
        .filter(
          (user): user is NonNullable<typeof user> =>
            user !== null && user !== undefined && !!user.email
        )
        .map(user => ({
          email: user.email,
          name: user.name || user.email,
        }));
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
