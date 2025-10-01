import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Book } from './book.entity';

@Entity('book_ratings')
export class BookRating extends BaseEntity {
  @Column({ type: 'uuid', nullable: true })
  bookId?: string;

  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @Column({ type: 'numeric', nullable: true })
  rating?: number;

  @Column({ type: 'text', nullable: true })
  comment?: string;

  // Legacy fields for backward compatibility
  @Column({ type: 'int', nullable: true })
  review?: number; // 1-5

  // Relationships
  @ManyToOne(() => User, user => user.bookRatings)
  @JoinColumn({ name: 'userId' })
  user?: User;

  @ManyToOne(() => Book, book => book.bookRatings)
  @JoinColumn({ name: 'bookId' })
  book?: Book;
}
