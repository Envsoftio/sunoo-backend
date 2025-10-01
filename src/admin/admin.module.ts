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
import { Bookmark } from '../entities/bookmark.entity';
import { Book } from '../entities/book.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Feedback,
      Subscription,
      UserSession,
      Category,
      CastMember,
      Bookmark,
      Book,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
