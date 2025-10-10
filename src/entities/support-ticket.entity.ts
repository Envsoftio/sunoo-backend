import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum TicketCategory {
  TECHNICAL = 'technical',
  BILLING = 'billing',
  ACCOUNT = 'account',
  FEATURE_REQUEST = 'feature_request',
  BUG_REPORT = 'bug_report',
  GENERAL = 'general',
}

@Entity('support_tickets')
export class SupportTicket extends BaseEntity {
  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({
    type: 'enum',
    enum: TicketStatus,
    default: TicketStatus.OPEN,
  })
  status: TicketStatus;

  @Column({
    type: 'enum',
    enum: TicketPriority,
    default: TicketPriority.MEDIUM,
  })
  priority: TicketPriority;

  @Column({
    type: 'enum',
    enum: TicketCategory,
    default: TicketCategory.GENERAL,
  })
  category: TicketCategory;

  @Column({ nullable: true })
  assignedTo?: string; // User ID of admin/agent

  @Column({ nullable: true })
  resolution?: string;

  @Column({ nullable: true })
  closedAt?: Date;

  @Column({ nullable: true })
  closedBy?: string; // User ID who closed the ticket

  @Column({ default: 0 })
  responseCount: number;

  @Column({ nullable: true })
  lastResponseAt?: Date;

  @Column({ nullable: true })
  lastResponseBy?: string; // User ID of last responder

  // Relationships
  @ManyToOne(() => User, user => user.supportTickets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @OneToMany(() => SupportTicketMessage, message => message.ticket, { cascade: true })
  messages: SupportTicketMessage[];
}

@Entity('support_ticket_messages')
export class SupportTicketMessage extends BaseEntity {
  @Column('text')
  content: string;

  @Column({ default: false })
  isInternal: boolean; // Internal notes visible only to admins

  @Column({ nullable: true })
  attachmentUrl?: string;

  @Column({ nullable: true })
  attachmentName?: string;

  // Relationships
  @ManyToOne(() => SupportTicket, ticket => ticket.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticketId' })
  ticket: SupportTicket;

  @Column()
  ticketId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;
}
