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
} from '@nestjs/swagger';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Subscriptions')
@Controller('api/subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('getAllPlans')
  @ApiOperation({ summary: 'Get all subscription plans (Sunoo compatible)' })
  @ApiResponse({ status: 200, description: 'Plans retrieved successfully' })
  async getAllPlans() {
    return this.subscriptionService.getAllPlans();
  }

  @Get('getPlanByid')
  @ApiOperation({ summary: 'Get plan by ID (Sunoo compatible)' })
  @ApiResponse({ status: 200, description: 'Plan retrieved successfully' })
  async getPlanById(@Query('id') id: string) {
    return this.subscriptionService.getPlanById(id);
  }

  @Post('create-subscription')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create subscription (Sunoo compatible)' })
  @ApiResponse({
    status: 201,
    description: 'Subscription created successfully',
  })
  async createSubscription(@Body() body: any, @Request() req) {
    return this.subscriptionService.createSubscription(req.user.id, body);
  }

  @Post('cancel-subscription')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel subscription (Sunoo compatible)' })
  @ApiResponse({
    status: 200,
    description: 'Subscription cancelled successfully',
  })
  async cancelSubscription(@Body() body: any, @Request() req) {
    return this.subscriptionService.cancelSubscription(req.user.id, body);
  }

  @Get('get-subscription-by-id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get subscription by ID (Sunoo compatible)' })
  @ApiResponse({
    status: 200,
    description: 'Subscription retrieved successfully',
  })
  async getSubscriptionById(@Query('id') id: string, @Request() req) {
    return this.subscriptionService.getSubscriptionById(req.user.id, id);
  }

  @Get('get-subscription-invoices')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get subscription invoices (Sunoo compatible)' })
  @ApiResponse({ status: 200, description: 'Invoices retrieved successfully' })
  async getSubscriptionInvoices(@Request() req) {
    return this.subscriptionService.getSubscriptionInvoices(req.user.id);
  }

  @Post('updateSubscriptionTrial')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update subscription trial (Sunoo compatible)' })
  @ApiResponse({ status: 200, description: 'Trial updated successfully' })
  async updateSubscriptionTrial(@Body() body: { id: string }, @Request() req) {
    return this.subscriptionService.updateSubscriptionTrial(req.user.id, body.id);
  }
}
