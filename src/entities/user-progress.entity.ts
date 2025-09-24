import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Book } from './book.entity';
import { Chapter } from './chapter.entity';

@Entity('user_progress')
export class UserProgress extends BaseEntity {
  @Column()
  userId: string;

  @Column()
  bookId: string;

  @Column({ nullable: true })
  chapterId?: string;

  @Column({ default: 0 })
  progress: number; // percentage 0-100

  @Column({ default: 0 })
  currentTime: number; // in seconds

  @Column({ default: 0 })
  totalTime: number; // in seconds

  @Column({ type: 'timestamp', nullable: true })
  lastListenedAt?: Date;

  @ManyToOne(() => User, user => user.userProgress)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Book, book => book.userProgress)
  @JoinColumn({ name: 'bookId' })
  book: Book;

  @ManyToOne(() => Chapter, chapter => chapter.userProgress)
  @JoinColumn({ name: 'chapterId' })
  chapter?: Chapter;
}
