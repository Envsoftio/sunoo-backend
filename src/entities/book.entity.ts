import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Category } from './category.entity';
import { Author } from './author.entity';
import { Chapter } from './chapter.entity';
import { Bookmark } from './bookmark.entity';
import { BookRating } from './book-rating.entity';
import { AudiobookListener } from './audiobook-listener.entity';
import { UserProgress } from './user-progress.entity';

@Entity('books')
export class Book extends BaseEntity {
  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ nullable: true })
  coverImage?: string;

  @Column({ nullable: true })
  slug?: string;

  @Column({ default: false })
  isFeatured: boolean;

  @Column({ default: 0 })
  totalChapters: number;

  @Column({ default: 0 })
  totalDuration: number; // in seconds

  @Column({ nullable: true })
  language?: string;

  @Column({ nullable: true })
  genre?: string;

  @Column({ default: 0 })
  price: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  authorId?: string;

  @Column({ nullable: true })
  categoryId?: string;

  @ManyToOne(() => Category, category => category.books)
  @JoinColumn({ name: 'categoryId' })
  category?: Category;

  @ManyToOne(() => Author, author => author.books)
  @JoinColumn({ name: 'authorId' })
  author?: Author;

  @OneToMany(() => Chapter, chapter => chapter.book)
  chapters: Chapter[];

  @OneToMany(() => Bookmark, bookmark => bookmark.book)
  bookmarks: Bookmark[];

  @OneToMany(() => BookRating, bookRating => bookRating.book)
  bookRatings: BookRating[];

  @OneToMany(
    () => AudiobookListener,
    audiobookListener => audiobookListener.book
  )
  audiobookListeners: AudiobookListener[];

  @OneToMany(() => UserProgress, userProgress => userProgress.book)
  userProgress: UserProgress[];
}
