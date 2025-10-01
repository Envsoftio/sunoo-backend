import { Entity, Column, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Subscription } from './subscription.entity';
import { Payment } from './payment.entity';

@Entity('plans')
export class Plan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamp with time zone', default: () => 'now()' })
  created_at: Date;

  @Column({ type: 'timestamp with time zone', default: () => 'now()' })
  updated_at: Date;
  @Column({ nullable: true })
  planName?: string;

  @Column({ nullable: true })
  razorpayPlanId?: string;

  @Column({ nullable: true })
  currency?: string;

  @Column({ type: 'numeric', nullable: true })
  amount?: number;

  @Column({ nullable: true })
  liveMode?: boolean;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  frequency?: string;

  // Note: plan_id in subscriptions and payments now stores external Razorpay plan IDs
  // so we don't have direct relationships with those entities
}
