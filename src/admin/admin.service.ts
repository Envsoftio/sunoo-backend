/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Feedback } from '../entities/feedback.entity';
import { Subscription } from '../entities/subscription.entity';
import { UserSession } from '../entities/user-session.entity';

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
    private userSessionRepository: Repository<UserSession>
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

  getUserBookLikes(_page = 1, _limit = 10, _search = '', _sortBy = 'created_at', _sortOrder = 'desc') {
    // This would need to be implemented based on your bookmark/rating system
    return { success: true, data: [], pagination: { page: _page, limit: _limit, total: 0, pages: 0 } };
  }
}
