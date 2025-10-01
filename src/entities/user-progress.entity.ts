import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Book } from './book.entity';
import { Chapter } from './chapter.entity';

@Entity('user_progress')
export class UserProgress {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'timestamp with time zone', default: () => 'now()' })
  created_at: Date;

  @Column({ type: 'timestamp with time zone', default: () => 'now()' })
  updated_at: Date;

  @Column()
  userId: string;

  @Column()
  bookId: string;

  @Column()
  chapterId: string;

  @Column({ type: 'numeric', nullable: true })
  totalNumberOfReadingTimes?: number;

  @Column({ type: 'numeric', nullable: true })
  progress_time?: number;

  // Legacy fields for backward compatibility
  @Column({ type: 'decimal', precision: 10, scale: 6, default: 0 })
  progress: number; // percentage 0-100

  @Column({ type: 'decimal', precision: 10, scale: 6, default: 0 })
  currentTime: number; // in seconds

  @Column({ type: 'decimal', precision: 10, scale: 6, default: 0 })
  totalTime: number; // in seconds

  @Column({ type: 'timestamp', nullable: true })
  lastListenedAt?: Date;

  // Relationships
  @ManyToOne(() => User, user => user.userProgress)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Book, book => book.userProgress)
  @JoinColumn({ name: 'bookId' })
  book: Book;

  @ManyToOne(() => Chapter, chapter => chapter.userProgress)
  @JoinColumn({ name: 'chapterId' })
  chapter: Chapter;
}
