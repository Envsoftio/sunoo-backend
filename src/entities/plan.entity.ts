import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Subscription } from './subscription.entity';

@Entity('plans')
export class Plan extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ default: 'INR' })
  currency: string;

  @Column({ default: 'monthly' })
  billingPeriod: string; // monthly, yearly

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isPopular: boolean;

  @Column({ type: 'json', nullable: true })
  features?: string[];

  @Column({ default: 0 })
  sortOrder: number;

  @OneToMany(() => Subscription, subscription => subscription.plan)
  subscriptions: Subscription[];
}
