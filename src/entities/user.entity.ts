import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Exclude } from 'class-transformer';
import { Subscription } from './subscription.entity';
import { Bookmark } from './bookmark.entity';
import { BookRating } from './book-rating.entity';
import { AudiobookListener } from './audiobook-listener.entity';
import { UserProgress } from './user-progress.entity';
import { ChapterBookmark } from './chapter-bookmark.entity';
import { Feedback } from './feedback.entity';

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  password: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  avatar?: string;

  @Column({ default: 'user' })
  role: string; // user, narrator, superadmin

  @Column({ nullable: true })
  authId?: string; // For Supabase migration compatibility

  @Column({ nullable: true })
  country?: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ nullable: true })
  lastLoginAt?: Date;

  @OneToMany(() => Subscription, subscription => subscription.user)
  subscriptions: Subscription[];

  @OneToMany(() => Bookmark, bookmark => bookmark.user)
  bookmarks: Bookmark[];

  @OneToMany(() => BookRating, bookRating => bookRating.user)
  bookRatings: BookRating[];

  @OneToMany(
    () => AudiobookListener,
    audiobookListener => audiobookListener.user
  )
  audiobookListeners: AudiobookListener[];

  @OneToMany(() => UserProgress, userProgress => userProgress.user)
  userProgress: UserProgress[];

  @OneToMany(() => ChapterBookmark, chapterBookmark => chapterBookmark.user)
  chapterBookmarks: ChapterBookmark[];

  @OneToMany(() => Feedback, feedback => feedback.user)
  feedbacks: Feedback[];
}
