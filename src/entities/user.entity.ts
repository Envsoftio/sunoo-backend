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
import { UserSession } from './user-session.entity';
import { SupportTicket } from './support-ticket.entity';

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  password: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  avatar?: string;

  @Column({ nullable: true })
  role: string; // user, narrator, superadmin

  @Column({ nullable: true })
  authId?: string; // For Supabase migration compatibility

  @Column({ nullable: true })
  provider?: string; // google, local, etc.

  @Column({ nullable: true })
  country?: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ nullable: true })
  emailVerificationToken?: string;

  @Column({ nullable: true })
  lastLoginAt?: Date;

  // Supabase schema fields
  @Column({ nullable: true })
  isAuthenticated?: boolean;

  @Column({ nullable: true })
  language?: string;

  @Column({ nullable: true })
  imageURL?: string;

  @Column({ nullable: true })
  bio?: string;

  @Column({ default: false })
  availedTrial: boolean;

  @Column({ default: true })
  email_notifications_enabled: boolean;

  @Column({ default: true })
  marketing_emails_enabled: boolean;

  @Column({ default: true })
  new_content_emails_enabled: boolean;

  @Column({ default: true })
  subscription_emails_enabled: boolean;

  @Column({ nullable: true })
  email_preferences_updated_at?: Date;

  // Push notification preferences
  @Column({ default: true })
  push_notifications_enabled: boolean;

  @Column({ default: true })
  push_subscription_enabled: boolean;

  @Column({ default: true })
  push_engagement_enabled: boolean;

  @Column({ default: true })
  push_marketing_enabled: boolean;

  @Column({ nullable: true })
  push_preferences_updated_at?: Date;

  @Column({ default: false })
  hasDefaultPassword: boolean;

  @Column({ nullable: true })
  passwordResetToken?: string;

  @Column({ nullable: true })
  passwordResetExpires?: Date;

  // Relationships
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

  @OneToMany(() => UserSession, session => session.user)
  sessions: UserSession[];

  @OneToMany(() => SupportTicket, supportTicket => supportTicket.user)
  supportTickets: SupportTicket[];
}
