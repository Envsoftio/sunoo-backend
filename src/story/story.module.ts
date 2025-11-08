import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoryService } from './story.service';
import { StoryController } from './story.controller';
import { EmailModule } from '../email/email.module';
import { ReviewNotificationService } from '../email/review-notification.service';
import { AdminModule } from '../admin/admin.module';
import {
  Book,
  Category,
  Chapter,
  Bookmark,
  BookRating,
  UserProgress,
  AudiobookListener,
  Subscription,
  StoryCast,
  CastMember,
  ChapterBookmark,
  User,
} from '../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Book,
      Category,
      Chapter,
      Bookmark,
      BookRating,
      UserProgress,
      AudiobookListener,
      Subscription,
      StoryCast,
      CastMember,
      ChapterBookmark,
      User,
    ]),
    EmailModule,
    AdminModule,
  ],
  providers: [StoryService, ReviewNotificationService],
  controllers: [StoryController],
  exports: [StoryService],
})
export class StoryModule {}
