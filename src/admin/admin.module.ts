import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../entities/user.entity';
import { Feedback } from '../entities/feedback.entity';
import { Subscription } from '../entities/subscription.entity';
import { UserSession } from '../entities/user-session.entity';
import { Category } from '../entities/category.entity';
import { CastMember } from '../entities/cast-member.entity';
import { StoryCast } from '../entities/story-cast.entity';
import { Bookmark } from '../entities/bookmark.entity';
import { Book } from '../entities/book.entity';
import { UserProgress } from '../entities/user-progress.entity';
import { Chapter } from '../entities/chapter.entity';
import { BookRating } from '../entities/book-rating.entity';
import { AudiobookListener } from '../entities/audiobook-listener.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Feedback,
      Subscription,
      UserSession,
      Category,
      CastMember,
      StoryCast,
      Bookmark,
      Book,
      UserProgress,
      Chapter,
      BookRating,
      AudiobookListener,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
