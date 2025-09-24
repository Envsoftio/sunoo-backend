import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Book } from './book.entity';

@Entity('audiobook_listeners')
export class AudiobookListener extends BaseEntity {
  @Column()
  userId: string;

  @Column()
  bookId: string;

  @Column({ default: 1 })
  count: number;

  @ManyToOne(() => User, user => user.audiobookListeners)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Book, book => book.audiobookListeners)
  @JoinColumn({ name: 'bookId' })
  book: Book;
}
