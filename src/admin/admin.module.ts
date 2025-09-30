import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../entities/user.entity';
import { Feedback } from '../entities/feedback.entity';
import { Subscription } from '../entities/subscription.entity';
import { UserSession } from '../entities/user-session.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Feedback, Subscription, UserSession]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
