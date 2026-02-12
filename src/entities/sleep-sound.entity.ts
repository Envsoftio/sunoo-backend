import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { SleepSoundCategory } from './sleep-sound-category.entity';

@Entity('sleep_sounds')
export class SleepSound extends BaseEntity {
  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 500 })
  audio_url: string; // S3 key

  @Column({ type: 'int', default: 0 })
  duration_seconds: number;

  @Column({ type: 'bigint', default: 0 })
  file_size_bytes: number;

  @Column({ type: 'varchar', length: 50, default: 'audio/mpeg' })
  mime_type: string;

  @Column({ type: 'uuid' })
  category_id: string;

  @ManyToOne(() => SleepSoundCategory, { nullable: false })
  @JoinColumn({ name: 'category_id' })
  category: SleepSoundCategory;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ type: 'boolean', default: true })
  is_published: boolean;

  @Column({ type: 'boolean', default: false })
  is_premium: boolean;

  @Column({ type: 'jsonb', nullable: true })
  tags: string[]; // ["relaxing", "nature", "deep-sleep"]

  @Column({ type: 'varchar', length: 50, nullable: true })
  mood: string; // "calm", "energizing", "focus"

  @Column({ type: 'varchar', length: 50, nullable: true })
  intensity: string; // "low", "medium", "high"

  @Column({ type: 'int', default: 0 })
  play_count: number;

  @Column({ type: 'int', default: 0 })
  unique_listeners: number;
}
