import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

export enum Platform {
  ANDROID = 'android',
  IOS = 'ios',
}

@Entity('device_tokens')
@Index(['userId'])
@Index(['token'])
@Index(['isActive'])
export class DeviceToken extends BaseEntity {
  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @Column({ unique: true })
  token: string;

  @Column({
    type: 'varchar',
    enum: Platform,
  })
  platform: Platform;

  @Column({ nullable: true })
  deviceId?: string;

  @Column({ type: 'jsonb', nullable: true })
  deviceInfo?: any;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  lastUsedAt?: Date;

  // Relationships
  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'userId' })
  user?: User;
}


