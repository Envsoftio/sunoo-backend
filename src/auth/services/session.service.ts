import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { UserSession } from '../../entities/user-session.entity';
import { User } from '../../entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

export interface CreateSessionData {
  userId: string;
  userAgent?: string;
  ipAddress?: string;
  deviceInfo?: string;
  metadata?: any;
}

export interface SessionInfo {
  id: string;
  refreshToken: string;
  accessToken: string;
  expiresAt: Date;
  lastUsedAt?: Date;
  userAgent?: string;
  ipAddress?: string;
  deviceInfo?: string;
  isActive: boolean;
  createdAt: Date;
}

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(UserSession)
    private sessionRepository: Repository<UserSession>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService
  ) {}

  async createSession(data: CreateSessionData): Promise<SessionInfo> {
    const user = await this.userRepository.findOne({
      where: { id: data.userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Generate refresh token
    const refreshToken = uuidv4();

    // Calculate expiry (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Generate access token
    const accessTokenExpiry =
      this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ||
      this.configService.get('security')?.jwt?.accessTokenExpiry ||
      '24h';
    const accessToken = this.jwtService.sign(
      { sub: data.userId, email: user.email, role: user.role },
      { expiresIn: accessTokenExpiry }
    );

    // Create session record
    const session = this.sessionRepository.create({
      userId: data.userId,
      refreshToken,
      accessToken,
      expiresAt,
      lastUsedAt: new Date(),
      userAgent: data.userAgent,
      ipAddress: data.ipAddress,
      deviceInfo: data.deviceInfo,
      metadata: data.metadata,
      isActive: true,
    });

    const savedSession = await this.sessionRepository.save(session);

    return {
      id: savedSession.id,
      refreshToken: savedSession.refreshToken,
      accessToken: savedSession.accessToken || '',
      expiresAt: savedSession.expiresAt,
      lastUsedAt: savedSession.lastUsedAt,
      userAgent: savedSession.userAgent,
      ipAddress: savedSession.ipAddress,
      deviceInfo: savedSession.deviceInfo,
      isActive: savedSession.isActive,
      createdAt: savedSession.created_at,
    };
  }

  async refreshSession(refreshToken: string): Promise<SessionInfo> {
    const session = await this.sessionRepository.findOne({
      where: { refreshToken, isActive: true },
      relations: ['user'],
    });

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (session.expiresAt < new Date()) {
      // Mark session as inactive
      await this.sessionRepository.update(session.id, { isActive: false });
      throw new UnauthorizedException('Refresh token expired');
    }

    // Check if user is still active
    if (!session.user || !session.user.isActive) {
      await this.sessionRepository.update(session.id, { isActive: false });
      throw new UnauthorizedException('User not found or inactive');
    }

    // Generate new access token
    const accessTokenExpiry =
      this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ||
      this.configService.get('security')?.jwt?.accessTokenExpiry ||
      '24h';
    const newAccessToken = this.jwtService.sign(
      {
        sub: session.userId,
        email: session.user.email,
        role: session.user.role,
      },
      { expiresIn: accessTokenExpiry }
    );

    // Update session
    await this.sessionRepository.update(session.id, {
      accessToken: newAccessToken,
      lastUsedAt: new Date(),
    });

    // Return updated session info
    const updatedSession = await this.sessionRepository.findOne({
      where: { id: session.id },
    });

    if (!updatedSession) {
      throw new Error('Session not found');
    }

    return {
      id: updatedSession.id,
      refreshToken: updatedSession.refreshToken,
      accessToken: updatedSession.accessToken || '',
      expiresAt: updatedSession.expiresAt,
      lastUsedAt: updatedSession.lastUsedAt,
      userAgent: updatedSession.userAgent,
      ipAddress: updatedSession.ipAddress,
      deviceInfo: updatedSession.deviceInfo,
      isActive: updatedSession.isActive,
      createdAt: updatedSession.created_at,
    };
  }

  async invalidateSession(refreshToken: string): Promise<void> {
    await this.sessionRepository.update({ refreshToken }, { isActive: false });
  }

  async invalidateAllUserSessions(userId: string): Promise<void> {
    await this.sessionRepository.update(
      { userId, isActive: true },
      { isActive: false }
    );
  }

  async getUserSessions(userId: string): Promise<SessionInfo[]> {
    const sessions = await this.sessionRepository.find({
      where: { userId, isActive: true },
      order: { lastUsedAt: 'DESC' },
    });

    return sessions.map(session => ({
      id: session.id,
      refreshToken: session.refreshToken,
      accessToken: session.accessToken || '',
      expiresAt: session.expiresAt,
      lastUsedAt: session.lastUsedAt,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      deviceInfo: session.deviceInfo,
      isActive: session.isActive,
      createdAt: session.created_at,
    }));
  }

  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.sessionRepository.update(
      {
        expiresAt: LessThan(new Date()),
        isActive: true,
      },
      { isActive: false }
    );

    return result.affected || 0;
  }

  async getActiveSessionCount(userId: string): Promise<number> {
    return await this.sessionRepository.count({
      where: { userId, isActive: true },
    });
  }

  async validateSession(refreshToken: string): Promise<boolean> {
    const session = await this.sessionRepository.findOne({
      where: { refreshToken, isActive: true },
      relations: ['user'],
    });

    if (!session) {
      return false;
    }

    if (session.expiresAt < new Date()) {
      await this.sessionRepository.update(session.id, { isActive: false });
      return false;
    }

    if (!session.user || !session.user.isActive) {
      await this.sessionRepository.update(session.id, { isActive: false });
      return false;
    }

    return true;
  }
}
