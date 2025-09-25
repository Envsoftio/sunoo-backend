import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Chapter } from './chapter.entity';
import { Book } from './book.entity';

@Entity('chapter_bookmarks')
export class ChapterBookmark extends BaseEntity {
  @Column({ nullable: true })
  bookId?: string;

  @Column({ nullable: true })
  userId?: string;

  @Column({ nullable: true })
  chapterId?: string;

  @Column({ type: 'text', nullable: true })
  bookmarkText?: string;

  @Column({ nullable: true })
  audioTimeStamp?: string;

  // Legacy fields for backward compatibility
  @Column({ default: 0 })
  timestamp: number; // in seconds

  @Column({ type: 'text', nullable: true })
  note?: string;

  // Relationships
  @ManyToOne(() => User, user => user.chapterBookmarks)
  @JoinColumn({ name: 'userId' })
  user?: User;

  @ManyToOne(() => Chapter, chapter => chapter.chapterBookmarks)
  @JoinColumn({ name: 'chapterId' })
  chapter?: Chapter;

  @ManyToOne(() => Book, book => book.chapterBookmarks)
  @JoinColumn({ name: 'bookId' })
  book?: Book;
}
