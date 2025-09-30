import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback } from '../entities/feedback.entity';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(Feedback)
    private feedbackRepository: Repository<Feedback>
  ) {}

  async submitFeedback(feedbackData: any) {
    try {
      const feedback = this.feedbackRepository.create(feedbackData);
      const savedFeedback = await this.feedbackRepository.save(feedback);

      return {
        success: true,
        data: savedFeedback,
        message: 'Feedback submitted successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
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
        .orderBy('feedback.createdAt', 'DESC')
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
