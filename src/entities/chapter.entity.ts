import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Book } from './book.entity';
import { UserProgress } from './user-progress.entity';
import { ChapterBookmark } from './chapter-bookmark.entity';

@Entity('chapters')
export class Chapter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamp with time zone', default: () => 'now()' })
  created_at: Date;

  @Column({ type: 'timestamp with time zone', default: () => 'now()' })
  updated_at: Date;
  @Column()
  name: string;

  @Column({ nullable: true })
  playbackTime?: string;

  @Column({ type: 'uuid', nullable: true })
  bookId?: string;

  @Column({ nullable: true })
  chapterUrl?: string;

  @Column({ type: 'numeric', nullable: true })
  order?: number;

  // Relationships
  @ManyToOne(() => Book, book => book.chapters)
  @JoinColumn({ name: 'bookId' })
  book?: Book;

  @OneToMany(() => UserProgress, userProgress => userProgress.chapter)
  userProgress: UserProgress[];

  @OneToMany(() => ChapterBookmark, chapterBookmark => chapterBookmark.chapter)
  chapterBookmarks: ChapterBookmark[];
}
