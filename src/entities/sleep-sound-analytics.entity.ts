import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { SleepSound } from './sleep-sound.entity';

export enum AnalyticsEventType {
  PLAY = 'play',
  PAUSE = 'pause',
  STOP = 'stop',
  TIMER_STOP = 'timer_stop',
  COMPLETE = 'complete',
}

@Entity('sleep_sound_analytics')
@Index(['user_id', 'created_at'])
@Index(['sound_id', 'created_at'])
@Index(['session_id'])
export class SleepSoundAnalytics extends BaseEntity {
  @Column({ type: 'uuid', nullable: true })
  user_id: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid' })
  sound_id: string;

  @ManyToOne(() => SleepSound, { nullable: false })
  @JoinColumn({ name: 'sound_id' })
  sound: SleepSound;

  @Column({ type: 'uuid' })
  session_id: string;

  @Column({ type: 'enum', enum: AnalyticsEventType })
  event_type: AnalyticsEventType;

  @Column({ type: 'int', default: 0 })
  duration_listened_seconds: number;

  @Column({ type: 'float', default: 1.0 })
  volume_level: number;

  @Column({ type: 'int', nullable: true })
  timer_duration_minutes: number;

  @Column({ type: 'jsonb', nullable: true })
  device_info: any;
}
