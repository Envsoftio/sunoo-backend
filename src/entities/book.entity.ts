import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Category } from './category.entity';
import { Chapter } from './chapter.entity';
import { Bookmark } from './bookmark.entity';
import { BookRating } from './book-rating.entity';
import { AudiobookListener } from './audiobook-listener.entity';
import { UserProgress } from './user-progress.entity';
import { ChapterBookmark } from './chapter-bookmark.entity';

@Entity('books')
export class Book {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamp with time zone', default: () => 'now()' })
  created_at: Date;

  @Column({ type: 'timestamp with time zone', default: () => 'now()' })
  updated_at: Date;
  @Column()
  title: string;

  @Column({ nullable: true })
  bookCoverUrl?: string;

  @Column({ nullable: true })
  language?: string;

  @Column({ nullable: true })
  bookDescription?: string;

  @Column({ nullable: true })
  duration?: string;

  @Column({ default: false })
  isPublished: boolean;

  @Column({ nullable: true })
  categoryId?: string;

  @Column({ default: false })
  isFree: boolean;

  @Column({ nullable: true })
  contentRating?: string;

  @Column({ nullable: true })
  tags?: string;

  @Column({ unique: true })
  slug: string;

  // Relationships
  @ManyToOne(() => Category)
  @JoinColumn({ name: 'categoryId' })
  category?: Category;

  @OneToMany(() => Chapter, (chapter) => chapter.book)
  chapters: Chapter[];

  @OneToMany(() => Bookmark, (bookmark) => bookmark.book)
  bookmarks: Bookmark[];

  @OneToMany(() => BookRating, (bookRating) => bookRating.book)
  bookRatings: BookRating[];

  @OneToMany(
    () => AudiobookListener,
    (audiobookListener) => audiobookListener.book,
  )
  audiobookListeners: AudiobookListener[];

  @OneToMany(() => UserProgress, (userProgress) => userProgress.book)
  userProgress: UserProgress[];

  @OneToMany(() => ChapterBookmark, (chapterBookmark) => chapterBookmark.book)
  chapterBookmarks: ChapterBookmark[];
}
