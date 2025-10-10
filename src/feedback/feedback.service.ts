import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback } from '../entities/feedback.entity';
import { EmailService } from '../email/email.service';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';
import { SanitizationUtil } from '../common/utils/sanitization.util';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(Feedback)
    private feedbackRepository: Repository<Feedback>,
    private emailService: EmailService
  ) {}

  async submitFeedback(feedbackData: SubmitFeedbackDto) {
    try {
      // Additional sanitization for extra security
      const sanitizedData = {
        name: feedbackData.name
          ? SanitizationUtil.sanitizeInput(feedbackData.name)
          : null,
        email: SanitizationUtil.sanitizeEmail(feedbackData.email),
        type: SanitizationUtil.validateFeedbackType(feedbackData.type),
        message: SanitizationUtil.sanitizeInput(feedbackData.message),
        user_id: feedbackData.user_id
          ? SanitizationUtil.sanitizeUUID(feedbackData.user_id)
          : null,
      };

      // Validate required fields after sanitization
      if (
        !sanitizedData.email ||
        !sanitizedData.type ||
        !sanitizedData.message
      ) {
        return {
          success: false,
          error: 'Invalid or missing required fields after sanitization',
        };
      }

      // Validate message length after sanitization
      if (sanitizedData.message.length < 10) {
        return {
          success: false,
          error: 'Message too short after sanitization',
        };
      }

      const feedback = this.feedbackRepository.create(sanitizedData as any);
      const savedFeedback = await this.feedbackRepository.save(feedback);

      // Send email notification to admin asynchronously (non-blocking)
      void this.sendFeedbackEmailAsync(savedFeedback);

      return {
        success: true,
        data: savedFeedback,
        message: 'Feedback submitted successfully',
      };
    } catch (error) {
      console.error('Error in submitFeedback:', error);
      return {
        success: false,
        error: 'Failed to submit feedback. Please try again.',
      };
    }
  }

  // Private method to send email asynchronously without blocking the response
  private async sendFeedbackEmailAsync(feedbackData: any) {
    try {
      console.log('Attempting to send feedback notification email...');
      const adminEmail = 'hello@sunoo.app';
      console.log('Admin email:', adminEmail);
      console.log('Feedback data:', feedbackData);

      const emailResult = await this.emailService.sendFeedbackNotification(
        feedbackData,
        adminEmail
      );
      console.log('Email sending result:', emailResult);

      if (emailResult) {
        console.log('Feedback notification email sent successfully');
      } else {
        console.log('Failed to send feedback notification email');
      }
    } catch (emailError) {
      // Log email error but don't fail the feedback submission
      console.error('Failed to send feedback notification email:', emailError);
    }
  }

  async getFeedbackStats() {
    try {
      const total = await this.feedbackRepository.count();
      const pending = await this.feedbackRepository.count({
        where: { status: 'pending' },
      });
      const resolved = await this.feedbackRepository.count({
        where: { status: 'resolved' },
      });

      return {
        success: true,
        data: {
          total,
          pending,
          resolved,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getAllFeedbacks(page = 1, limit = 10, status?: string) {
    try {
      const queryBuilder =
        this.feedbackRepository.createQueryBuilder('feedback');

      if (status) {
        queryBuilder.where('feedback.status = :status', { status });
      }

      const [feedbacks, total] = await queryBuilder
        .orderBy('feedback.created_at', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();

      return {
        success: true,
        data: {
          feedbacks,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
