import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Book } from './book.entity';
import { ChapterBookmark } from './chapter-bookmark.entity';
import { UserProgress } from './user-progress.entity';

@Entity('chapters')
export class Chapter extends BaseEntity {
  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column()
  chapterUrl: string;

  @Column({ default: 0 })
  duration: number; // in seconds

  @Column({ default: 0 })
  order: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  bookId?: string;

  @ManyToOne(() => Book, book => book.chapters)
  @JoinColumn({ name: 'bookId' })
  book?: Book;

  @OneToMany(() => ChapterBookmark, chapterBookmark => chapterBookmark.chapter)
  chapterBookmarks: ChapterBookmark[];

  @OneToMany(() => UserProgress, userProgress => userProgress.chapter)
  userProgress: UserProgress[];
}
