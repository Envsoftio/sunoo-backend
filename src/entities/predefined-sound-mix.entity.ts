import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

interface MixSound {
  sound_id: string;
  volume: number;
}

@Entity('predefined_sound_mixes')
@Index(['priority'])
@Index(['is_published'])
export class PredefinedSoundMix extends BaseEntity {
  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  cover_image: string; // S3 key

  @Column({ type: 'jsonb' })
  mix_data: { sounds: MixSound[] };

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string; // "Sleep", "Focus", "Meditation"

  @Column({ type: 'boolean', default: false })
  is_premium: boolean;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ type: 'boolean', default: true })
  is_published: boolean;

  @Column({ type: 'int', default: 0 })
  play_count: number;
}
