import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Book } from './book.entity';

@Entity('audiobook_listeners')
export class AudiobookListener extends BaseEntity {
  @Column({ nullable: true })
  userId?: string;

  @Column({ nullable: true })
  bookId?: string;

  // Legacy fields for backward compatibility
  @Column({ default: 1 })
  count: number;

  // Relationships
  @ManyToOne(() => User, (user) => user.audiobookListeners)
  @JoinColumn({ name: 'userId' })
  user?: User;

  @ManyToOne(() => Book, (book) => book.audiobookListeners)
  @JoinColumn({ name: 'bookId' })
  book?: Book;
}
