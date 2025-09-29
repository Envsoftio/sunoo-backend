import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity('user_sessions')
@Index(['userId', 'isActive']) // Index for efficient queries
@Index(['refreshToken']) // Index for refresh token lookups
@Index(['expiresAt']) // Index for cleanup queries
export class UserSession extends BaseEntity {
  @Column({ nullable: false })
  userId: string;

  @Column({ unique: true })
  refreshToken: string;

  @Column({ nullable: true })
  accessToken?: string;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt?: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  userAgent?: string;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true })
  deviceInfo?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: any;

  // Relationships
  @ManyToOne(() => User, user => user.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: User;
}
