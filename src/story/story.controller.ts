import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { StoryService } from './story.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Stories')
@Controller('api/story')
export class StoryController {
  constructor(private readonly storyService: StoryService) {}

  @Get('getAllStories')
  @ApiOperation({ summary: 'Get all stories (Sunoo compatible)' })
  @ApiResponse({ status: 200, description: 'Stories retrieved successfully' })
  async getAllStories(@Query('userId') userId?: string) {
    return this.storyService.getAllStories(userId);
  }

  @Get('getStoryById')
  @ApiOperation({ summary: 'Get story by ID (Sunoo compatible)' })
  @ApiResponse({ status: 200, description: 'Story retrieved successfully' })
  async getStoryById(@Query('id') id: string) {
    return this.storyService.getStoryById(id);
  }

  @Get('getStoryBySlugForShow')
  @ApiOperation({
    summary: 'Get story by slug for show page (Sunoo compatible)',
  })
  @ApiResponse({ status: 200, description: 'Story retrieved successfully' })
  async getStoryBySlugForShow(@Query('slug') slug: string) {
    return this.storyService.getStoryBySlugForShow(slug);
  }

  @Get('getMostPopularStories')
  @ApiOperation({ summary: 'Get most popular stories (Sunoo compatible)' })
  @ApiResponse({
    status: 200,
    description: 'Popular stories retrieved successfully',
  })
  async getMostPopularStories() {
    return this.storyService.getMostPopularStories();
  }

  @Get('getLatestStories')
  @ApiOperation({ summary: 'Get latest stories (Sunoo compatible)' })
  @ApiResponse({
    status: 200,
    description: 'Latest stories retrieved successfully',
  })
  async getLatestStories() {
    return this.storyService.getLatestStories();
  }

  @Get('getStoriesByGenre')
  @ApiOperation({ summary: 'Get stories by genre (Sunoo compatible)' })
  @ApiResponse({
    status: 200,
    description: 'Genre stories retrieved successfully',
  })
  async getStoriesByGenre(@Query('genre') genre: string) {
    return this.storyService.getStoriesByGenre(genre);
  }

  @Get('getStoriesByLanguage')
  @ApiOperation({ summary: 'Get stories by language (Sunoo compatible)' })
  @ApiResponse({
    status: 200,
    description: 'Language stories retrieved successfully',
  })
  async getStoriesByLanguage(@Query('language') language: string) {
    return this.storyService.getStoriesByLanguage(language);
  }

  @Get('getAllCategories')
  @ApiOperation({ summary: 'Get all categories (Sunoo compatible)' })
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved successfully',
  })
  async getAllCategories() {
    return this.storyService.getAllCategories();
  }

  @Get('getAuthors')
  @ApiOperation({ summary: 'Get all authors (Sunoo compatible)' })
  @ApiResponse({ status: 200, description: 'Authors retrieved successfully' })
  async getAuthors() {
    return this.storyService.getAuthors();
  }

  @Get('getChapters')
  @ApiOperation({ summary: 'Get chapters for a story (Sunoo compatible)' })
  @ApiResponse({ status: 200, description: 'Chapters retrieved successfully' })
  async getChapters(@Query('storyId') storyId: string) {
    return this.storyService.getChapters(storyId);
  }

  @Post('createBookmark')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create bookmark (Sunoo compatible)' })
  @ApiResponse({ status: 201, description: 'Bookmark created successfully' })
  async createBookmark(@Body() body: { bookId: string }, @Request() req) {
    return this.storyService.createBookmark(req.user.id, body.bookId);
  }

  @Post('removeBookmark')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove bookmark (Sunoo compatible)' })
  @ApiResponse({ status: 200, description: 'Bookmark removed successfully' })
  async removeBookmark(@Body() body: { bookId: string }, @Request() req) {
    return this.storyService.removeBookmark(req.user.id, body.bookId);
  }

  @Get('getBookmarks')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user bookmarks (Sunoo compatible)' })
  @ApiResponse({ status: 200, description: 'Bookmarks retrieved successfully' })
  async getBookmarks(@Request() req) {
    return this.storyService.getBookmarks(req.user.id);
  }

  @Post('saveProgress')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save user progress (Sunoo compatible)' })
  @ApiResponse({ status: 200, description: 'Progress saved successfully' })
  async saveProgress(@Body() body: any, @Request() req) {
    return this.storyService.saveProgress(req.user.id, body);
  }

  @Get('getProgress')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user progress (Sunoo compatible)' })
  @ApiResponse({ status: 200, description: 'Progress retrieved successfully' })
  async getProgress(@Query('bookId') bookId: string, @Request() req) {
    return this.storyService.getProgress(req.user.id, bookId);
  }

  @Post('saveRating')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save book rating (Sunoo compatible)' })
  @ApiResponse({ status: 200, description: 'Rating saved successfully' })
  async saveRating(
    @Body() body: { bookId: string; rating: number; review?: string },
    @Request() req
  ) {
    return this.storyService.saveRating(req.user.id, body);
  }
}
