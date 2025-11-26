import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'timestamp with time zone', default: () => 'now()' })
  created_at: Date;

  @Column({ type: 'timestamp with time zone', default: () => 'now()' })
  updated_at: Date;

  @Column({ nullable: true })
  subscription_id?: string;

  @Column({ nullable: true })
  plan_id?: string;

  @Column({ type: 'date', nullable: true })
  start_date?: Date;

  @Column({ type: 'date', nullable: true })
  end_date?: Date;

  @Column({ nullable: true })
  status?: string;

  @Column({ type: 'date', nullable: true })
  next_billing_date?: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: any;

  @Column({ type: 'uuid', nullable: true })
  user_id?: string;

  @Column({ default: false })
  user_cancelled: boolean;

  @Column({ type: 'bigint', nullable: true })
  ended_at?: number;

  // Legacy fields for backward compatibility
  @Column({ nullable: true })
  razorpaySubscriptionId?: string;

  @Column({ nullable: true })
  razorpayPaymentId?: string;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt?: Date;

  @Column({ default: false })
  isTrial: boolean;

  @Column({ type: 'timestamp', nullable: true })
  trialEndDate?: Date;

  // Provider field to distinguish between Razorpay and RevenueCat subscriptions
  @Column({ default: 'razorpay' })
  provider?: string; // 'razorpay' | 'revenuecat'

  // Relationships
  @ManyToOne(() => User, user => user.subscriptions)
  @JoinColumn({ name: 'user_id' })
  user?: User;

  // Note: plan_id now stores external plan IDs (Razorpay plan IDs or RevenueCat product IDs),
  // not internal UUIDs, so we don't have a direct relationship with the Plan entity
  //
  // Field reuse strategy:
  // - subscription_id: Stores RevenueCat subscription ID (same field as Razorpay subscription ID)
  // - plan_id: Stores RevenueCat product ID (monthly/yearly/lifetime) or Razorpay plan ID
  // - status: Same status values ('active', 'cancelled', etc.) work for both providers
  // - metadata: Stores provider-specific data (RevenueCat webhook payload, Razorpay details)
  // - provider: Identifies source: 'razorpay' | 'revenuecat'
}
