import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
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
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'User ID for personalized features',
  })
  async getAllStories(@Query('userId') userId?: string) {
    return await this.storyService.getAllStories(userId);
  }

  @Get('getStoryById')
  @ApiOperation({ summary: 'Get story by ID (Sunoo compatible)' })
  @ApiResponse({ status: 200, description: 'Story retrieved successfully' })
  async getStoryById(@Query('id') id: string) {
    return await this.storyService.getStoryById(id);
  }

  @Get('getStoryBySlugForShow')
  @ApiOperation({
    summary: 'Get story by slug for show page (Sunoo compatible)',
  })
  @ApiResponse({ status: 200, description: 'Story retrieved successfully' })
  async getStoryBySlugForShow(@Query('slug') slug: string) {
    return await this.storyService.getStoryBySlugForShow(slug);
  }

  @Get('getMostPopularStories')
  @ApiOperation({ summary: 'Get most popular stories (Sunoo compatible)' })
  @ApiResponse({
    status: 200,
    description: 'Popular stories retrieved successfully',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'User ID for personalized features',
  })
  async getMostPopularStories(@Query('userId') userId?: string) {
    return await this.storyService.getMostPopularStories(userId);
  }

  @Get('getLatestStories')
  @ApiOperation({ summary: 'Get latest stories (Sunoo compatible)' })
  @ApiResponse({
    status: 200,
    description: 'Latest stories retrieved successfully',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'User ID for personalized features',
  })
  async getLatestStories(@Query('userId') userId?: string) {
    return await this.storyService.getLatestStories(userId);
  }

  @Get('getStoriesByGenre')
  @ApiOperation({ summary: 'Get stories by genre (Sunoo compatible)' })
  @ApiResponse({
    status: 200,
    description: 'Genre stories retrieved successfully',
  })
  @ApiQuery({
    name: 'genreSlug',
    required: true,
    description: 'Genre slug to filter stories',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'User ID for personalized features',
  })
  async getStoriesByGenre(
    @Query('genreSlug') genreSlug: string,
    @Query('userId') userId?: string
  ) {
    return await this.storyService.getStoriesByGenre(genreSlug, userId);
  }

  @Get('getStoriesByLanguage')
  @ApiOperation({ summary: 'Get stories by language (Sunoo compatible)' })
  @ApiResponse({
    status: 200,
    description: 'Language stories retrieved successfully',
  })
  @ApiQuery({
    name: 'language',
    required: true,
    description: 'Language to filter stories',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'User ID for personalized features',
  })
  async getStoriesByLanguage(
    @Query('language') language: string,
    @Query('userId') userId?: string
  ) {
    return await this.storyService.getStoriesByLanguage(language, userId);
  }

  @Get('getAllCategories')
  @ApiOperation({ summary: 'Get all categories (Sunoo compatible)' })
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved successfully',
  })
  async getAllCategories() {
    return await this.storyService.getAllCategories();
  }

  @Get('getChapters')
  @ApiOperation({ summary: 'Get chapters for a story (Sunoo compatible)' })
  @ApiResponse({ status: 200, description: 'Chapters retrieved successfully' })
  async getChapters(@Query('storyId') storyId: string) {
    return await this.storyService.getChapters(storyId);
  }

  @Post('createBookmark')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create bookmark (Sunoo compatible)' })
  @ApiResponse({ status: 201, description: 'Bookmark created successfully' })
  async createBookmark(@Body() body: { bookId: string }, @Request() req) {
    return await this.storyService.createBookmark(req.user.id, body.bookId);
  }

  @Post('removeBookmark')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove bookmark (Sunoo compatible)' })
  @ApiResponse({ status: 200, description: 'Bookmark removed successfully' })
  async removeBookmark(@Body() body: { bookId: string }, @Request() req) {
    return await this.storyService.removeBookmark(req.user.id, body.bookId);
  }

  @Get('getBookmarks')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user bookmarks (Sunoo compatible)' })
  @ApiResponse({ status: 200, description: 'Bookmarks retrieved successfully' })
  async getBookmarks(@Request() req) {
    return await this.storyService.getBookmarks(req.user.id);
  }

  @Post('saveProgress')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save user progress (Sunoo compatible)' })
  @ApiResponse({ status: 200, description: 'Progress saved successfully' })
  async saveProgress(@Body() body: any, @Request() req) {
    return await this.storyService.saveProgress(req.user.id, body);
  }

  @Get('getProgress')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user progress (Sunoo compatible)' })
  @ApiResponse({ status: 200, description: 'Progress retrieved successfully' })
  async getProgress(@Query('bookId') bookId: string, @Request() req) {
    return await this.storyService.getProgress(req.user.id, bookId);
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
    return await this.storyService.saveRating(req.user.id, body);
  }

  @Get('getStoryByIdForShow')
  @ApiOperation({ summary: 'Get story by ID for show page (Sunoo compatible)' })
  @ApiResponse({ status: 200, description: 'Story retrieved successfully' })
  async getStoryByIdForShow(
    @Query('id') id: string,
    @Query('userId') userId?: string
  ) {
    return await this.storyService.getStoryByIdForShow(id, userId);
  }

  @Get('getUsersSavedStories')
  @ApiOperation({ summary: 'Get user saved stories (Sunoo compatible)' })
  @ApiResponse({
    status: 200,
    description: 'Saved stories retrieved successfully',
  })
  async getUsersSavedStories(@Query('userId') userId: string) {
    return await this.storyService.getBookmarks(userId);
  }

  @Get('getBookmarkStatus')
  @ApiOperation({
    summary: 'Get bookmark status for a story (Sunoo compatible)',
  })
  @ApiResponse({
    status: 200,
    description: 'Bookmark status retrieved successfully',
  })
  async getBookmarkStatus(
    @Query('userId') userId: string,
    @Query('bookId') bookId: string
  ) {
    return await this.storyService.getBookmarkStatus(userId, bookId);
  }

  @Get('getChapterCount')
  @ApiOperation({ summary: 'Get chapter count for a story (Sunoo compatible)' })
  @ApiResponse({
    status: 200,
    description: 'Chapter count retrieved successfully',
  })
  async getChapterCount(@Query('id') id: string) {
    return await this.storyService.getChapterCount(id);
  }

  @Get('getUniqueLanguages')
  @ApiOperation({ summary: 'Get unique languages (Sunoo compatible)' })
  @ApiResponse({ status: 200, description: 'Languages retrieved successfully' })
  async getUniqueLanguages() {
    return await this.storyService.getUniqueLanguages();
  }

  @Get('getOptimizedStories')
  @ApiOperation({
    summary: 'Get optimized stories for listen page (Sunoo compatible)',
  })
  @ApiResponse({
    status: 200,
    description: 'Optimized stories retrieved successfully',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'User ID for personalized features',
  })
  async getOptimizedStories(@Query('userId') userId?: string) {
    return await this.storyService.getOptimizedStories(userId);
  }

  @Get('getOptimizedLanguageStories')
  @ApiOperation({
    summary: 'Get optimized language stories (Sunoo compatible)',
  })
  @ApiResponse({
    status: 200,
    description: 'Language stories retrieved successfully',
  })
  @ApiQuery({
    name: 'languages',
    required: true,
    description: 'Comma-separated list of languages',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'User ID for personalized features',
  })
  async getOptimizedLanguageStories(
    @Query('languages') languages: string,
    @Query('userId') userId?: string
  ) {
    const languageArray = languages ? languages.split(',') : [];
    return await this.storyService.getOptimizedLanguageStories(
      languageArray,
      userId
    );
  }

  @Get('getContinueListeningStories')
  @ApiOperation({
    summary: 'Get continue listening stories (Sunoo compatible)',
  })
  @ApiResponse({
    status: 200,
    description: 'Continue listening stories retrieved successfully',
  })
  async getContinueListeningStories(@Query('userId') userId: string) {
    return await this.storyService.getContinueListeningStories(userId);
  }

  @Get('getStoriesWithNewEpisodes')
  @ApiOperation({ summary: 'Get stories with new episodes (Sunoo compatible)' })
  @ApiResponse({
    status: 200,
    description: 'Stories with new episodes retrieved successfully',
  })
  async getStoriesWithNewEpisodes(@Query('userId') userId: string) {
    return await this.storyService.getStoriesWithNewEpisodes(userId);
  }

  @Get('getMostPopularStoriesThisWeek')
  @ApiOperation({
    summary: 'Get most popular stories this week (Sunoo compatible)',
  })
  @ApiResponse({
    status: 200,
    description: 'Popular stories this week retrieved successfully',
  })
  async getMostPopularStoriesThisWeek(@Query('userId') userId: string) {
    return await this.storyService.getMostPopularStoriesThisWeek(userId);
  }

  @Get('getGenreStats')
  @ApiOperation({ summary: 'Get genre statistics (Sunoo compatible)' })
  @ApiResponse({
    status: 200,
    description: 'Genre stats retrieved successfully',
  })
  async getGenreStats() {
    return await this.storyService.getGenreStats();
  }

  @Get('getFeaturedGenres')
  @ApiOperation({ summary: 'Get featured genres (Sunoo compatible)' })
  @ApiResponse({
    status: 200,
    description: 'Featured genres retrieved successfully',
  })
  async getFeaturedGenres() {
    return await this.storyService.getFeaturedGenres();
  }

  // Story Management APIs
  @Post('handleAddStories')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add new story (Sunoo compatible)' })
  @ApiResponse({ status: 200, description: 'Story added successfully' })
  async handleAddStories(
    @Body() body: { title: string; language: string; description: string },
    @Request() req
  ) {
    return await this.storyService.handleAddStories(body, req.user.id);
  }

  @Post('handleEditStories')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Edit story (Sunoo compatible)' })
  @ApiResponse({ status: 200, description: 'Story edited successfully' })
  async handleEditStories(
    @Body()
    body: { id: string; title: string; language: string; description: string },
    @Request() req
  ) {
    return await this.storyService.handleEditStories(body, req.user.id);
  }

  @Post('handleAddChapterInStory')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add chapters to story (Sunoo compatible)' })
  @ApiResponse({ status: 200, description: 'Chapters added successfully' })
  async handleAddChapterInStory(
    @Body() body: { chapters: any[] },
    @Request() req
  ) {
    return await this.storyService.handleAddChapterInStory(
      body.chapters,
      req.user.id
    );
  }

  @Post('updateStoryCover')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update story cover (Sunoo compatible)' })
  @ApiResponse({ status: 200, description: 'Cover updated successfully' })
  async updateStoryCover(@Body() body: { storyId: string }, @Request() req) {
    return await this.storyService.updateStoryCover(body.storyId, req.user.id);
  }

  @Post('deleteChapter')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete chapter (Sunoo compatible)' })
  @ApiResponse({ status: 200, description: 'Chapter deleted successfully' })
  async deleteChapter(@Body() body: { id: string }, @Request() req) {
    return await this.storyService.deleteChapter(body.id, req.user.id);
  }
}
