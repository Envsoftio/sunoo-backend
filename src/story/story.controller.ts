import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Delete,
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
import { SaveRatingDto } from '../dto/rating.dto';
import { SaveProgressDto } from '../dto/progress.dto';
import { TrackListeningDto } from '../dto/track.dto';
import { JsonValidationPipe } from '../pipes/json-validation.pipe';

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
  async getStoryBySlugForShow(
    @Query('slug') slug: string,
    @Query('userId') userId?: string
  ) {
    console.log(
      `🔍 getStoryBySlugForShow called with slug: ${slug}, userId: ${userId}`
    );
    return await this.storyService.getStoryBySlugForShow(slug, userId);
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

  @Get('getBookmarks')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user bookmarks (Sunoo compatible)' })
  @ApiResponse({ status: 200, description: 'Bookmarks retrieved successfully' })
  async getBookmarks(@Request() req) {
    return await this.storyService.getBookmarks(req.user.id);
  }

  @Get('getProgress')
  @ApiOperation({ summary: 'Get user progress (Sunoo compatible)' })
  @ApiResponse({ status: 200, description: 'Progress retrieved successfully' })
  async getProgress(
    @Query('bookId') bookId: string,
    @Query('chapterId') chapterId: string,
    @Query('userId') userId: string
  ) {
    return await this.storyService.getProgress(userId, bookId, chapterId);
  }

  @Get('getStoryByIdForShow')
  @ApiOperation({ summary: 'Get story by ID for show page (Sunoo compatible)' })
  @ApiResponse({ status: 200, description: 'Story retrieved successfully' })
  async getStoryByIdForShow(
    @Query('id') id: string,
    @Query('userId') userId?: string
  ) {
    console.log(
      `🔍 getStoryByIdForShow called with ID: ${id}, userId: ${userId}`
    );
    return await this.storyService.getStoryByIdForShow(id, userId);
  }

  @Get('getUsersSavedStories')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user saved stories (Sunoo compatible)' })
  @ApiResponse({
    status: 200,
    description: 'Saved stories retrieved successfully',
  })
  async getUsersSavedStories(@Request() req, @Query('userId') userId?: string) {
    // Use userId from query if provided, otherwise use authenticated user's ID
    const targetUserId = userId || req.user?.id;
    return await this.storyService.getBookmarks(targetUserId);
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

  @Get('getMostPopularStoriesByUniqueListeners')
  @ApiOperation({
    summary: 'Get most popular stories by unique listeners (Sunoo compatible)',
  })
  @ApiResponse({
    status: 200,
    description: 'Popular stories by unique listeners retrieved successfully',
  })
  async getMostPopularStoriesByUniqueListeners(
    @Query('userId') userId: string
  ) {
    return await this.storyService.getMostPopularStoriesByUniqueListeners(
      userId
    );
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

  @Post('deleteChapter')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete chapter (Sunoo compatible)' })
  @ApiResponse({ status: 200, description: 'Chapter deleted successfully' })
  async deleteChapter(@Body() body: { id: string }, @Request() req) {
    return await this.storyService.deleteChapter(body.id, req.user.id);
  }

  // Additional endpoints for frontend compatibility
  @Get('audiobooks')
  @ApiOperation({ summary: 'Get audiobooks' })
  @ApiResponse({
    status: 200,
    description: 'Audiobooks retrieved successfully',
  })
  async getAudiobooks(@Query('userId') userId?: string) {
    return await this.storyService.getAudiobooks(userId);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search stories' })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
  })
  async searchStories(
    @Query('q') query: string,
    @Query('userId') userId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    return await this.storyService.searchStories(query, userId, page, limit);
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured stories' })
  @ApiResponse({
    status: 200,
    description: 'Featured stories retrieved successfully',
  })
  async getFeaturedStories(@Query('userId') userId?: string) {
    return await this.storyService.getFeaturedStories(userId);
  }

  @Get('categories/featured')
  @ApiOperation({ summary: 'Get featured categories' })
  @ApiResponse({
    status: 200,
    description: 'Featured categories retrieved successfully',
  })
  async getFeaturedCategories() {
    return await this.storyService.getFeaturedCategories();
  }

  @Get('categories/stats')
  @ApiOperation({ summary: 'Get category statistics' })
  @ApiResponse({
    status: 200,
    description: 'Category stats retrieved successfully',
  })
  async getCategoryStats() {
    return await this.storyService.getCategoryStats();
  }

  @Get('authors')
  @ApiOperation({ summary: 'Get all authors' })
  @ApiResponse({ status: 200, description: 'Authors retrieved successfully' })
  getAllAuthors(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.storyService.getAllAuthors(page, limit);
  }

  @Get('authors/:id')
  @ApiOperation({ summary: 'Get author by ID' })
  @ApiResponse({ status: 200, description: 'Author retrieved successfully' })
  getAuthorById(@Query('id') id: string) {
    return this.storyService.getAuthorById(id);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get story by slug' })
  @ApiResponse({ status: 200, description: 'Story retrieved successfully' })
  async getStoryBySlug(
    @Param('slug') slug: string,
    @Query('userId') userId?: string
  ) {
    return await this.storyService.getStoryBySlug(slug, userId);
  }

  @Get(':id/ratings')
  @ApiOperation({ summary: 'Get story ratings' })
  @ApiResponse({ status: 200, description: 'Ratings retrieved successfully' })
  async getStoryRatings(
    @Query('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    return await this.storyService.getStoryRatings(id, page, limit);
  }

  @Get('user/:userId/continue')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get continue listening stories' })
  @ApiResponse({
    status: 200,
    description: 'Continue listening stories retrieved successfully',
  })
  async getContinueListeningStories(@Query('userId') userId: string) {
    return await this.storyService.getContinueListeningStories(userId);
  }

  @Post('track')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Track user listening' })
  @ApiResponse({ status: 200, description: 'Listening tracked successfully' })
  async trackUserListening(
    @Body(JsonValidationPipe) body: TrackListeningDto,
    @Request() req
  ) {
    return await this.storyService.trackUserListening(req.user.id, body);
  }

  @Post('listeners')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create listener record' })
  @ApiResponse({
    status: 200,
    description: 'Listener record created successfully',
  })
  async createListener(@Body() body: { bookId: string }, @Request() req) {
    return await this.storyService.createListener(req.user.id, body.bookId);
  }

  @Get('chapter-bookmarks')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get chapter bookmarks' })
  @ApiResponse({
    status: 200,
    description: 'Chapter bookmarks retrieved successfully',
  })
  async getChapterBookmarks(
    @Query('userId') userId: string,
    @Query('bookId') bookId: string,
    @Query('chapterId') chapterId: string
  ) {
    return await this.storyService.getChapterBookmarks(
      userId,
      bookId,
      chapterId
    );
  }

  @Post('chapter-bookmarks')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create chapter bookmark' })
  @ApiResponse({
    status: 200,
    description: 'Chapter bookmark created successfully',
  })
  async createChapterBookmark(@Body() body: any, @Request() req) {
    return await this.storyService.createChapterBookmark(req.user.id, body);
  }

  @Delete('chapter-bookmarks/:bookmarkId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete chapter bookmark' })
  @ApiResponse({
    status: 200,
    description: 'Chapter bookmark deleted successfully',
  })
  async deleteChapterBookmark(
    @Param('bookmarkId') bookmarkId: string,
    @Request() req
  ) {
    return await this.storyService.deleteChapterBookmark(
      req.user.id,
      bookmarkId
    );
  }

  @Post('rating')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save story rating' })
  @ApiResponse({ status: 200, description: 'Rating saved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  async saveRating(
    @Body(new JsonValidationPipe()) body: SaveRatingDto,
    @Request() req
  ) {
    return await this.storyService.saveRating(req.user.id, body);
  }

  @Get('bookmark/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get bookmark status' })
  @ApiResponse({
    status: 200,
    description: 'Bookmark status retrieved successfully',
  })
  async getBookmarkStatus(@Query('storyId') storyId: string, @Request() req) {
    return await this.storyService.getBookmarkStatus(req.user.id, storyId);
  }

  @Get('user/:userId/bookmarks')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user bookmarks' })
  @ApiResponse({ status: 200, description: 'Bookmarks retrieved successfully' })
  async getUserBookmarks(@Query('userId') userId: string) {
    return await this.storyService.getBookmarks(userId);
  }

  @Get('user/:userId/progress')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user progress' })
  @ApiResponse({ status: 200, description: 'Progress retrieved successfully' })
  async getUserProgress(
    @Query('userId') userId: string,
    @Query('storyId') storyId?: string
  ) {
    return await this.storyService.getProgress(userId, storyId);
  }

  @Post('progress')
  @ApiOperation({ summary: 'Save user progress' })
  @ApiResponse({ status: 200, description: 'Progress saved successfully' })
  async saveProgress(
    @Body(JsonValidationPipe) body: SaveProgressDto & { userId: string }
  ) {
    return await this.storyService.saveProgress(body.userId, body);
  }

  @Post('bookmark')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create or remove bookmark' })
  @ApiResponse({
    status: 200,
    description: 'Bookmark operation completed successfully',
  })
  async toggleBookmark(@Body() body: { storyId: string }, @Request() req) {
    return await this.storyService.toggleBookmark(req.user.id, body.storyId);
  }

  @Delete('bookmark')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove bookmark' })
  @ApiResponse({ status: 200, description: 'Bookmark removed successfully' })
  async removeBookmark(@Body() body: { storyId: string }, @Request() req) {
    return await this.storyService.removeBookmark(req.user.id, body.storyId);
  }

  // Admin endpoints
  @Post('admin/add')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add new story (Admin)' })
  @ApiResponse({ status: 200, description: 'Story added successfully' })
  async addStory(@Body() body: any, @Request() req) {
    return await this.storyService.handleAddStories(body, req.user.id);
  }

  @Post('admin/cover')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update story cover (Admin)' })
  @ApiResponse({ status: 200, description: 'Cover updated successfully' })
  async updateStoryCover(@Body() body: { storyId: string }, @Request() req) {
    return await this.storyService.updateStoryCover(body.storyId, req.user.id);
  }

  @Delete('admin/delete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete story (Admin)' })
  @ApiResponse({ status: 200, description: 'Story deleted successfully' })
  async deleteStory(@Body() body: { id: string }, @Request() req) {
    return await this.storyService.deleteStory(body.id, req.user.id);
  }

  @Post('admin/chapter')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add chapter to story (Admin)' })
  @ApiResponse({ status: 200, description: 'Chapter added successfully' })
  async addChapter(@Body() body: any, @Request() req) {
    return await this.storyService.handleAddChapterInStory(
      body.chapters,
      req.user.id
    );
  }

  @Delete('admin/chapter')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete chapter (Admin)' })
  @ApiResponse({ status: 200, description: 'Chapter deleted successfully' })
  async deleteChapterAdmin(
    @Body() body: { chapterId: string },
    @Request() req
  ) {
    return await this.storyService.deleteChapter(body.chapterId, req.user.id);
  }
}
