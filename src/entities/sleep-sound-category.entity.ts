import { Entity, Column } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('sleep_sound_categories')
export class SleepSoundCategory extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  icon: string; // S3 key for category icon

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ type: 'boolean', default: true })
  is_published: boolean;
}
