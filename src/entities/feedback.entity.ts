import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity('feedbacks')
export class Feedback extends BaseEntity {
  @Column()
  userId: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'int', default: 1 })
  rating: number; // 1-5

  @Column({ nullable: true })
  subject?: string;

  @Column({ default: 'pending' })
  status: string; // pending, reviewed, resolved

  @ManyToOne(() => User, user => user.feedbacks)
  @JoinColumn({ name: 'userId' })
  user: User;
}
