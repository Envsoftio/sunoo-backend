import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Plan } from './plan.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'timestamp with time zone', default: () => 'now()' })
  created_at: Date;

  @Column({ type: 'timestamp with time zone', default: () => 'now()' })
  updated_at: Date;

  @Column({ nullable: true })
  invoice_id?: string;

  @Column({ nullable: true })
  plan_id?: string;

  @Column({ nullable: true })
  currency?: string;

  @Column({ nullable: true })
  status?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: any;

  @Column({ nullable: true })
  payment_id?: string;

  @Column({ nullable: true })
  amount?: string;

  @Column({ nullable: true })
  user_id?: string;

  @Column({ nullable: true })
  subscription_id?: string;

  // Relationships
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => Plan, plan => plan.payments)
  @JoinColumn({ name: 'plan_id' })
  plan?: Plan;
}
