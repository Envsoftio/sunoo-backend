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
import { FeedbackService } from './feedback.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../auth/guards/superadmin.guard';

@ApiTags('Feedback')
@Controller('api/feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post('submit')
  @ApiOperation({ summary: 'Submit feedback' })
  @ApiResponse({ status: 201, description: 'Feedback submitted successfully' })
  async submitFeedback(@Body() body: any) {
    return await this.feedbackService.submitFeedback(body);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get feedback statistics (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Feedback stats retrieved successfully',
  })
  async getFeedbackStats() {
    return await this.feedbackService.getFeedbackStats();
  }

  @Get('all')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all feedbacks (Admin only)' })
  @ApiResponse({ status: 200, description: 'Feedbacks retrieved successfully' })
  async getAllFeedbacks(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string
  ) {
    return await this.feedbackService.getAllFeedbacks(page, limit, status);
  }
}
