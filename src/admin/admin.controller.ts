/* eslint-disable prettier/prettier */
import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Query,
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
  @ApiResponse({
    status: 200,
    description: 'User book likes retrieved successfully',
  })
  getUserBookLikes(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string
  ) {
    return this.adminService.getUserBookLikes(
      page,
      limit,
      search,
      sortBy,
      sortOrder
    );
  }

}
