import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GenreController } from './genre.controller';
import { GenreService } from './genre.service';
import { Category } from '../entities/category.entity';
import { Book } from '../entities/book.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Category, Book])],
  controllers: [GenreController],
  providers: [GenreService],
  exports: [GenreService],
})
export class GenreModule {}
