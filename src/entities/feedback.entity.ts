import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity('feedbacks')
export class Feedback extends BaseEntity {
  @Column({ nullable: true })
  user_id?: string;

  @Column({ nullable: true })
  name?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  type?: string;

  @Column({ type: 'text', nullable: true })
  message?: string;

  // Legacy fields for backward compatibility
  @Column({ type: 'int', default: 1 })
  rating: number; // 1-5

  @Column({ nullable: true })
  subject?: string;

  @Column({ default: 'pending' })
  status: string; // pending, reviewed, resolved

  // Relationships
  @ManyToOne(() => User, (user) => user.feedbacks)
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
