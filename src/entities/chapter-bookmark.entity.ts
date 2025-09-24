import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Chapter } from './chapter.entity';

@Entity('chapter_bookmarks')
export class ChapterBookmark extends BaseEntity {
  @Column()
  userId: string;

  @Column()
  chapterId: string;

  @Column({ default: 0 })
  timestamp: number; // in seconds

  @Column({ type: 'text', nullable: true })
  note?: string;

  @ManyToOne(() => User, user => user.chapterBookmarks)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Chapter, chapter => chapter.chapterBookmarks)
  @JoinColumn({ name: 'chapterId' })
  chapter: Chapter;
}
