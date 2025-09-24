import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Plan } from './plan.entity';

@Entity('subscriptions')
export class Subscription extends BaseEntity {
  @Column()
  userId: string;

  @Column()
  planId: string;

  @Column({ default: 'active' })
  status: string; // active, cancelled, expired

  @Column({ nullable: true })
  razorpaySubscriptionId?: string;

  @Column({ nullable: true })
  razorpayPaymentId?: string;

  @Column({ type: 'timestamp', nullable: true })
  startDate?: Date;

  @Column({ type: 'timestamp', nullable: true })
  endDate?: Date;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt?: Date;

  @Column({ default: false })
  isTrial: boolean;

  @Column({ type: 'timestamp', nullable: true })
  trialEndDate?: Date;

  @ManyToOne(() => User, user => user.subscriptions)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Plan, plan => plan.subscriptions)
  @JoinColumn({ name: 'planId' })
  plan: Plan;
}
