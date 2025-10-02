/* eslint-disable prettier/prettier */
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Query,
  Param,
} from '@nestjs/common';
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

  @Post('makeNarrator')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Make user a narrator (Admin only)' })
  @ApiResponse({ status: 200, description: 'User made narrator successfully' })
  async makeNarrator(@Body() body: { email: string }) {
    return this.adminService.makeNarrator(body.email);
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

  @Post('updateNarratorPassword')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update narrator password (Admin only)' })
  @ApiResponse({ status: 200, description: 'Password updated successfully' })
  async updateNarratorPassword(
    @Body() body: { userId: string; new_password: string }
  ) {
    return this.adminService.updateNarratorPassword(
      body.userId,
      body.new_password
    );
  }

  // Additional admin endpoints for frontend compatibility
  @Get('getAllNarrator')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all narrators (Admin only)' })
  @ApiResponse({ status: 200, description: 'Narrators retrieved successfully' })
  async getAllNarrators() {
    return this.adminService.getAllNarrators();
  }

  @Get('getNarrator')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get narrator (Admin only)' })
  @ApiResponse({ status: 200, description: 'Narrator retrieved successfully' })
  async getNarrator(@Query('id') id: string) {
    return this.adminService.getNarrator(id);
  }

  @Post('addNarrator')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add narrator (Admin only)' })
  @ApiResponse({ status: 200, description: 'Narrator added successfully' })
  async addNarrator(@Body() body: any) {
    return this.adminService.addNarrator(body);
  }

  @Post('editNarrator')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Edit narrator (Admin only)' })
  @ApiResponse({ status: 200, description: 'Narrator edited successfully' })
  async editNarrator(@Body() body: { payload: any; id: string }) {
    return this.adminService.editNarrator(body.payload, body.id);
  }

  @Post('deleteNarrator')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete narrator (Admin only)' })
  @ApiResponse({ status: 200, description: 'Narrator deleted successfully' })
  async deleteNarrator(@Body() body: { email: string }) {
    return this.adminService.deleteNarrator(body.email);
  }

  @Post('updateNarratorProfile')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update narrator profile (Admin only)' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateNarratorProfile(@Body() body: { userId: string }) {
    return this.adminService.updateNarratorProfile(body.userId);
  }

  @Post('updateNarratorName')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update narrator name (Admin only)' })
  @ApiResponse({ status: 200, description: 'Name updated successfully' })
  async updateNarratorName(@Body() body: { userId: string; name: string }) {
    return this.adminService.updateNarratorName(body.userId, body.name);
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

  @Get('author-count')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get total author count (Admin only)' })
  @ApiResponse({ status: 200, description: 'Author count retrieved successfully' })
  async getAuthorCount() {
    return await this.adminService.getAuthorCount();
  }

  @Get('narrator-count')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get total narrator count (Admin only)' })
  @ApiResponse({ status: 200, description: 'Narrator count retrieved successfully' })
  async getNarratorCount() {
    return await this.adminService.getNarratorCount();
  }

  @Get('user-likes-count')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get total user likes count (Admin only)' })
  @ApiResponse({ status: 200, description: 'User likes count retrieved successfully' })
  async getUserLikesCount() {
    return await this.adminService.getUserLikesCount();
  }

}
