import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Feedback } from '../entities/feedback.entity';
import { Subscription } from '../entities/subscription.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Feedback)
    private feedbackRepository: Repository<Feedback>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>
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
      let dateFilter: Date;
      const now = new Date();

      switch (period) {
        case 'day':
          dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }

      const registrations = await this.userRepository
        .createQueryBuilder('user')
        .select('DATE(user.created_at)', 'date')
        .addSelect('COUNT(*)', 'count')
        .where('user.created_at >= :dateFilter', { dateFilter })
        .groupBy('DATE(user.created_at)')
        .orderBy('date', 'ASC')
        .getRawMany();

      return { success: true, data: registrations };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getSubscriptionRegistrationsByPeriod(period: string) {
    try {
      let dateFilter: Date;
      const now = new Date();

      switch (period) {
        case 'day':
          dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }

      const subscriptions = await this.subscriptionRepository
        .createQueryBuilder('subscription')
        .select('DATE(subscription.created_at)', 'date')
        .addSelect('COUNT(*)', 'count')
        .addSelect('subscription.status', 'status')
        .where('subscription.created_at >= :dateFilter', { dateFilter })
        .groupBy('DATE(subscription.created_at), subscription.status')
        .orderBy('date', 'ASC')
        .getRawMany();

      return { success: true, data: subscriptions };
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
}
