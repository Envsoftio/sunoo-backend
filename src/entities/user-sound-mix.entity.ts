import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

interface MixSound {
  sound_id: string;
  volume: number;
}

@Entity('user_sound_mixes')
@Index(['user_id', 'created_at'])
export class UserSoundMix extends BaseEntity {
  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb' })
  mix_data: { sounds: MixSound[] };

  @Column({ type: 'boolean', default: false })
  is_favorite: boolean;

  @Column({ type: 'int', default: 0 })
  play_count: number;
}
