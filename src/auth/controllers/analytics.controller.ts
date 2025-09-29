import {
  Controller,
  Get,
  UseGuards,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { SessionService } from '../services/session.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSession } from '../../entities/user-session.entity';
import { User } from '../../entities/user.entity';

@Controller('auth/analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(
    private sessionService: SessionService,
    @InjectRepository(UserSession)
    private sessionRepository: Repository<UserSession>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  @Get('online-users')
  async getOnlineUsers() {
    const activeSessions = await this.sessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.user', 'user')
      .where('session.isActive = :isActive', { isActive: true })
      .andWhere('session.expiresAt > :now', { now: new Date() })
      .select([
        'session.id',
        'session.userId',
        'session.lastUsedAt',
        'session.userAgent',
        'session.ipAddress',
        'session.deviceInfo',
        'user.email',
        'user.name',
        'user.role',
      ])
      .getMany();

    const uniqueUsers = new Map();
    activeSessions.forEach(session => {
      if (!uniqueUsers.has(session.userId)) {
        uniqueUsers.set(session.userId, {
          userId: session.userId,
          email: session.user?.email || 'Unknown',
          name: session.user?.name || 'Unknown',
          role: session.user?.role || 'user',
          lastActivity: session.lastUsedAt,
          sessionCount: 0,
          devices: [],
        });
      }

      const user = uniqueUsers.get(session.userId);
      user.sessionCount++;
      user.devices.push({
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        deviceInfo: session.deviceInfo,
        lastUsed: session.lastUsedAt,
      });
    });

    return {
      success: true,
      data: {
        onlineUsers: Array.from(uniqueUsers.values()),
        totalOnlineUsers: uniqueUsers.size,
        totalActiveSessions: activeSessions.length,
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('session-stats')
  async getSessionStats(
    @Query('days', new DefaultValuePipe(7), ParseIntPipe) days: number,
  ) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await this.sessionRepository
      .createQueryBuilder('session')
      .select([
        'DATE(session.createdAt) as date',
        'COUNT(*) as total_sessions',
        'COUNT(DISTINCT session.userId) as unique_users',
        'AVG(EXTRACT(EPOCH FROM (session.lastUsedAt - session.createdAt))) as avg_session_duration',
      ])
      .where('session.createdAt >= :startDate', { startDate })
      .groupBy('DATE(session.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    const totalUsers = await this.userRepository.count();
    const activeUsers = await this.sessionService.getActiveSessionCount('all');

    return {
      success: true,
      data: {
        period: `${days} days`,
        totalUsers,
        activeUsers,
        dailyStats: stats,
        summary: {
          totalSessions: stats.reduce((sum, day) => sum + parseInt(day.total_sessions), 0),
          uniqueUsers: stats.reduce((sum, day) => sum + parseInt(day.unique_users), 0),
          avgSessionDuration: stats.reduce((sum, day) => sum + parseFloat(day.avg_session_duration || 0), 0) / stats.length,
        },
      },
    };
  }

  @Get('device-stats')
  async getDeviceStats() {
    const deviceStats = await this.sessionRepository
      .createQueryBuilder('session')
      .select([
        'session.userAgent',
        'COUNT(*) as count',
        'COUNT(DISTINCT session.userId) as unique_users',
      ])
      .where('session.isActive = :isActive', { isActive: true })
      .andWhere('session.expiresAt > :now', { now: new Date() })
      .groupBy('session.userAgent')
      .orderBy('count', 'DESC')
      .getRawMany();

    return {
      success: true,
      data: {
        deviceStats: deviceStats.map(stat => ({
          userAgent: stat.userAgent,
          sessionCount: parseInt(stat.count),
          uniqueUsers: parseInt(stat.unique_users),
        })),
        totalDevices: deviceStats.length,
      },
    };
  }

  @Get('user-activity')
  async getUserActivity(
    @Query('userId') userId?: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ) {
    let query = this.sessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.user', 'user')
      .select([
        'session.id',
        'session.userId',
        'session.createdAt',
        'session.lastUsedAt',
        'session.userAgent',
        'session.ipAddress',
        'session.deviceInfo',
        'session.isActive',
        'user.email',
        'user.name',
      ])
      .orderBy('session.lastUsedAt', 'DESC')
      .limit(limit);

    if (userId) {
      query = query.where('session.userId = :userId', { userId });
    }

    const activities = await query.getMany();

    return {
      success: true,
      data: {
        activities: activities.map(activity => ({
          id: activity.id,
          userId: activity.userId,
          userEmail: activity.user?.email || 'Unknown',
          userName: activity.user?.name || 'Unknown',
          createdAt: activity.created_at,
          lastUsedAt: activity.lastUsedAt,
          userAgent: activity.userAgent,
          ipAddress: activity.ipAddress,
          deviceInfo: activity.deviceInfo,
          isActive: activity.isActive,
          sessionDuration: activity.lastUsedAt
            ? Math.floor((activity.lastUsedAt.getTime() - activity.created_at.getTime()) / 1000)
            : null,
        })),
        total: activities.length,
      },
    };
  }

  @Get('security-alerts')
  async getSecurityAlerts() {
    // Multiple sessions from different IPs for same user
    const suspiciousSessions = await this.sessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.user', 'user')
      .select([
        'session.userId',
        'user.email',
        'user.name',
        'COUNT(DISTINCT session.ipAddress) as ip_count',
        'COUNT(*) as session_count',
        'ARRAY_AGG(DISTINCT session.ipAddress) as ip_addresses',
        'ARRAY_AGG(DISTINCT session.userAgent) as user_agents',
      ])
      .where('session.isActive = :isActive', { isActive: true })
      .andWhere('session.expiresAt > :now', { now: new Date() })
      .groupBy('session.userId, user.email, user.name')
      .having('COUNT(DISTINCT session.ipAddress) > 1')
      .getRawMany();

    // Long-running sessions (more than 24 hours)
    const longSessions = await this.sessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.user', 'user')
      .where('session.isActive = :isActive', { isActive: true })
      .andWhere('session.createdAt < :cutoff', {
        cutoff: new Date(Date.now() - 24 * 60 * 60 * 1000)
      })
      .getMany();

    return {
      success: true,
      data: {
        suspiciousSessions: suspiciousSessions.map(session => ({
          userId: session.userId,
          userEmail: session.userEmail,
          userName: session.userName,
          ipCount: parseInt(session.ip_count),
          sessionCount: parseInt(session.session_count),
          ipAddresses: session.ip_addresses,
          userAgents: session.user_agents,
        })),
        longRunningSessions: longSessions.map(session => ({
          id: session.id,
          userId: session.userId,
          userEmail: session.user?.email || 'Unknown',
          userName: session.user?.name || 'Unknown',
          createdAt: session.created_at,
          lastUsedAt: session.lastUsedAt,
          duration: Math.floor((Date.now() - session.created_at.getTime()) / (1000 * 60 * 60)),
        })),
        totalAlerts: suspiciousSessions.length + longSessions.length,
      },
    };
  }
}
