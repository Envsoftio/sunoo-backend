/* eslint-disable prettier/prettier */
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Query,
  Param,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Multer } from 'multer';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../auth/guards/superadmin.guard';

@ApiTags('Admin')
@Controller('api/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // User Management
  @Get('getUsers')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async getUsers() {
    return this.adminService.getUsers();
  }

  @Post('deleteUser')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete user (Admin only)' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  async deleteUser(@Body() body: { email: string }) {
    return this.adminService.deleteUser(body.email);
  }


  // Analytics
  @Post('getUserRegistrationsByPeriod')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get user registrations by period (Admin only)' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getUserRegistrationsByPeriod(@Body() body: { period: string }) {
    return this.adminService.getUserRegistrationsByPeriod(body.period);
  }

  @Post('getSubscriptionRegistrationsByPeriod')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get subscription registrations by period (Admin only)',
  })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getSubscriptionRegistrationsByPeriod(@Body() body: { period: string }) {
    return this.adminService.getSubscriptionRegistrationsByPeriod(body.period);
  }

  // Feedback Management
  @Get('getFeedbackCount')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get feedback count (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Feedback count retrieved successfully',
  })
  async getFeedbackCount() {
    return this.adminService.getFeedbackCount();
  }

  @Get('getAllFeedbacks')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all feedbacks (Admin only)' })
  @ApiResponse({ status: 200, description: 'Feedbacks retrieved successfully' })
  async getAllFeedbacks() {
    return this.adminService.getAllFeedbacks();
  }




  @Get('getUserBookLikes')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user book likes (Admin only)' })
  @ApiResponse({ status: 200, description: 'User book likes retrieved successfully' })
  async getUserBookLikes(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search: string = '',
    @Query('sortBy') sortBy: string = 'created_at',
    @Query('sortOrder') sortOrder: string = 'desc'
  ) {
    return await this.adminService.getUserBookLikes(
      page,
      limit,
      search,
      sortBy,
      sortOrder
    );
  }

  @Post('user-activities')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get user activities (Admin only)' })
  @ApiResponse({ status: 200, description: 'User activities retrieved successfully' })
  async getUserActivities(@Body() body: { startDate?: Date; endDate?: Date }) {
    return await this.adminService.getUserActivities(body.startDate, body.endDate);
  }

  @Get('subscription-counts')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get subscription counts (Admin only)' })
  @ApiResponse({ status: 200, description: 'Subscription counts retrieved successfully' })
  async getSubscriptionCounts() {
    return this.adminService.getSubscriptionCounts();
  }

  @Get('story-casts')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get story casts (Admin only)' })
  @ApiResponse({ status: 200, description: 'Story casts retrieved successfully' })
  getStoryCasts(@Query('story_id') storyId: string) {
    return this.adminService.getStoryCasts(storyId);
  }


  @Post('story-casts')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save story casts (Admin only)' })
  @ApiResponse({ status: 200, description: 'Story casts saved successfully' })
  saveStoryCasts(@Body() body: { story_id: string; casts: any[] }) {
    return this.adminService.saveStoryCasts(body.story_id, body.casts);
  }

  @Get('cast-members')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get cast members (Admin only)' })
  @ApiResponse({ status: 200, description: 'Cast members retrieved successfully' })
  async getCastMembers() {
    return this.adminService.getCastMembers();
  }

  @Post('cast-members')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create cast member (Admin only)' })
  @ApiResponse({ status: 200, description: 'Cast member created successfully' })
  async createCastMember(@Body() body: { name: string; bio: string; picture: string }) {
    return await this.adminService.createCastMember(body);
  }

  @Post('cast-members/:id')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update cast member (Admin only)' })
  @ApiResponse({ status: 200, description: 'Cast member updated successfully' })
  async updateCastMember(
    @Param('id') id: string,
    @Body() body: { name: string; bio: string; picture: string }
  ) {
    return await this.adminService.updateCastMember(id, body);
  }

  @Delete('cast-members/:id')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete cast member (Admin only)' })
  @ApiResponse({ status: 200, description: 'Cast member deleted successfully' })
  async deleteCastMember(@Param('id') id: string) {
    return await this.adminService.deleteCastMember(id);
  }

  @Post('cast-members/:id/upload-picture')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload cast member picture (Admin only)' })
  @ApiResponse({ status: 200, description: 'Picture uploaded successfully' })
  async uploadCastPicture(@Param('id') id: string, @Body() body: { picture: string }) {
    return await this.adminService.uploadCastPicture(id, body.picture);
  }

  // Category Management
  @Post('save-category')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save or update category (Admin only)' })
  @ApiResponse({ status: 200, description: 'Category saved successfully' })
  async saveCategory(@Body() body: any) {
    return this.adminService.saveCategory(body);
  }

  @Get('categories')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all categories (Admin only)' })
  @ApiResponse({ status: 200, description: 'Categories retrieved successfully' })
  async getCategories() {
    return this.adminService.getCategories();
  }

  @Delete('categories')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete category (Admin only)' })
  @ApiResponse({ status: 200, description: 'Category deleted successfully' })
  async deleteCategory(@Query('id') id: string) {
    return this.adminService.deleteCategory(id);
  }

  // Dashboard Analytics Endpoints
  @Get('dashboard-stats')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get dashboard statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Dashboard stats retrieved successfully' })
  async getDashboardStats() {
    return await this.adminService.getDashboardStats();
  }

  @Get('user-count')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get total user count (Admin only)' })
  @ApiResponse({ status: 200, description: 'User count retrieved successfully' })
  async getUserCount() {
    return await this.adminService.getUserCount();
  }

  @Get('book-count')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get total book count (Admin only)' })
  @ApiResponse({ status: 200, description: 'Book count retrieved successfully' })
  async getBookCount() {
    return await this.adminService.getBookCount();
  }



  @Get('user-likes-count')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get total user likes count (Admin only)' })
  @ApiResponse({ status: 200, description: 'User likes count retrieved successfully' })
  async getUserLikesCount() {
    return await this.adminService.getUserLikesCount();
  }

  // Story Management APIs
  @Get('stories')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all stories (Admin only)' })
  @ApiResponse({ status: 200, description: 'Stories retrieved successfully' })
  async getStories(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search: string = '',
    @Query('sortBy') sortBy: string = 'created_at',
    @Query('sortOrder') sortOrder: string = 'desc',
    @Query('category') category: string = '',
    @Query('language') language: string = '',
    @Query('isPublished') isPublished: string = ''
  ) {
    return await this.adminService.getStories(
      page,
      limit,
      search,
      sortBy,
      sortOrder,
      category,
      language,
      isPublished
    );
  }

  @Get('stories/:id')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get story by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'Story retrieved successfully' })
  async getStory(@Param('id') id: string) {
    return await this.adminService.getStory(id);
  }

  @Post('stories')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create new story (Admin only)' })
  @ApiResponse({ status: 200, description: 'Story created successfully' })
  async createStory(@Body() body: any) {
    return await this.adminService.createStory(body);
  }

  @Post('stories/:id')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update story (Admin only)' })
  @ApiResponse({ status: 200, description: 'Story updated successfully' })
  async updateStory(@Param('id') id: string, @Body() body: any) {
    return await this.adminService.updateStory(id, body);
  }

  @Delete('stories/:id')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete story (Admin only)' })
  @ApiResponse({ status: 200, description: 'Story deleted successfully' })
  async deleteStory(@Param('id') id: string) {
    return await this.adminService.deleteStory(id);
  }

  @Post('stories/:id/publish')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish/unpublish story (Admin only)' })
  @ApiResponse({ status: 200, description: 'Story publish status updated successfully' })
  async toggleStoryPublish(@Param('id') id: string, @Body() body: { isPublished: boolean }) {
    return await this.adminService.toggleStoryPublish(id, body.isPublished);
  }

  @Post('stories/:id/cover')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update story cover (Admin only)' })
  @ApiResponse({ status: 200, description: 'Story cover updated successfully' })
  async updateStoryCover(@Param('id') id: string, @Body() body: { coverUrl: string }) {
    return await this.adminService.updateStoryCover(id, body.coverUrl);
  }

  // Chapter Management APIs
  @Get('stories/:storyId/chapters')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get story chapters (Admin only)' })
  @ApiResponse({ status: 200, description: 'Chapters retrieved successfully' })
  async getStoryChapters(@Param('storyId') storyId: string) {
    return await this.adminService.getStoryChapters(storyId);
  }

  @Post('stories/:storyId/chapters')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add chapter to story (Admin only)' })
  @ApiResponse({ status: 200, description: 'Chapter added successfully' })
  async addChapter(@Param('storyId') storyId: string, @Body() body: any) {
    return await this.adminService.addChapter(storyId, body);
  }

  @Put('chapters/:id')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update chapter (Admin only)' })
  @ApiResponse({ status: 200, description: 'Chapter updated successfully' })
  async updateChapter(@Param('id') id: string, @Body() body: any) {
    return await this.adminService.updateChapter(id, body);
  }

  @Delete('chapters/:id')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete chapter (Admin only)' })
  @ApiResponse({ status: 200, description: 'Chapter deleted successfully' })
  async deleteChapter(@Param('id') id: string) {
    return await this.adminService.deleteChapter(id);
  }

  @Post('stories/:storyId/chapters/bulk-upload')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk upload chapters (Admin only)' })
  @ApiResponse({ status: 200, description: 'Chapters uploaded successfully' })
  @UseInterceptors(FileInterceptor('file'))
  bulkUploadChapters(@Param('storyId') storyId: string, @UploadedFile() file: Multer.File) {
    return this.adminService.bulkUploadChapters(storyId, file);
  }


  // Story Analytics APIs
  @Get('stories/analytics/overview')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get story analytics overview (Admin only)' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getStoryAnalyticsOverview() {
    return await this.adminService.getStoryAnalyticsOverview();
  }

  @Get('stories/analytics/popular')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get popular stories analytics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Popular stories analytics retrieved successfully' })
  async getPopularStoriesAnalytics(
    @Query('period') period: string = 'week',
    @Query('limit') limit: number = 10
  ) {
    return await this.adminService.getPopularStoriesAnalytics(period, limit);
  }

  @Get('stories/analytics/listeners')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get story listeners analytics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Listeners analytics retrieved successfully' })
  async getStoryListenersAnalytics(
    @Query('storyId') storyId: string,
    @Query('period') period: string = 'week'
  ) {
    return await this.adminService.getStoryListenersAnalytics(storyId, period);
  }

  @Get('stories/analytics/ratings')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get story ratings analytics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Ratings analytics retrieved successfully' })
  async getStoryRatingsAnalytics(
    @Query('storyId') storyId: string
  ) {
    return await this.adminService.getStoryRatingsAnalytics(storyId);
  }

  @Get('stories/analytics/completion-rates')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get story completion rates (Admin only)' })
  @ApiResponse({ status: 200, description: 'Completion rates retrieved successfully' })
  async getStoryCompletionRates() {
    return await this.adminService.getStoryCompletionRates();
  }

}
