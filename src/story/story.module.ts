import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoryService } from './story.service';
import { StoryController } from './story.controller';
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
    ]),
  ],
  providers: [StoryService],
  controllers: [StoryController],
  exports: [StoryService],
})
export class StoryModule {}
