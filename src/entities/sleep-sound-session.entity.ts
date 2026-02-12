import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity('sleep_sound_sessions')
@Index(['user_id', 'started_at'])
export class SleepSoundSession extends BaseEntity {
  @Column({ type: 'uuid', nullable: true })
  user_id: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'timestamp with time zone' })
  started_at: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  ended_at: Date;

  @Column({ type: 'int', default: 0 })
  total_duration_seconds: number;

  @Column({ type: 'jsonb' })
  sounds_played: string[]; // array of sound_ids

  @Column({ type: 'int', nullable: true })
  timer_duration_minutes: number;

  @Column({ type: 'boolean', default: false })
  completed_naturally: boolean;
}
