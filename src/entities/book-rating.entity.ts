import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Book } from './book.entity';

@Entity('book_ratings')
export class BookRating extends BaseEntity {
  @Column()
  userId: string;

  @Column()
  bookId: string;

  @Column({ type: 'int' })
  rating: number; // 1-5

  @Column({ type: 'text', nullable: true })
  review?: string;

  @ManyToOne(() => User, user => user.bookRatings)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Book, book => book.bookRatings)
  @JoinColumn({ name: 'bookId' })
  book: Book;
}
