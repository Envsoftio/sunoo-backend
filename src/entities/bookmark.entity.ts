import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Book } from './book.entity';

@Entity('bookmarks')
export class Bookmark extends BaseEntity {
  @Column({ nullable: true })
  bookId?: string;

  @Column({ nullable: true })
  userId?: string;

  // Relationships
  @ManyToOne(() => User, user => user.bookmarks)
  @JoinColumn({ name: 'userId' })
  user?: User;

  @ManyToOne(() => Book, book => book.bookmarks)
  @JoinColumn({ name: 'bookId' })
  book?: Book;
}
