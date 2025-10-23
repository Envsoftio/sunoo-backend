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
  Delete,
  Put,
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

  @Post('getPlanByid')
  @ApiOperation({
    summary: 'Get plan by ID (POST method for frontend compatibility)',
  })
  @ApiResponse({ status: 200, description: 'Plan retrieved successfully' })
  async getPlanByIdPost(@Body('id') id: string) {
    return this.subscriptionService.getPlanById(id);
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
    return this.subscriptionService.updateSubscriptionTrial(
      req.user.id,
      body.id
    );
  }

  // Additional endpoints for frontend compatibility
  @Get('plans')
  @ApiOperation({ summary: 'Get all subscription plans' })
  @ApiResponse({ status: 200, description: 'Plans retrieved successfully' })
  async getPlans() {
    return this.subscriptionService.getAllPlans();
  }

  @Get('user-subscription')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user subscription' })
  @ApiResponse({
    status: 200,
    description: 'User subscription retrieved successfully',
  })
  async getUserSubscription(@Request() req) {
    return this.subscriptionService.getUserSubscription(req.user.id);
  }

  @Get('access-details')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get subscription access details including grace period',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription access details retrieved successfully',
  })
  async getSubscriptionAccessDetails(@Request() req) {
    return this.subscriptionService.getSubscriptionAccessDetails(req.user.id);
  }

  @Post('create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create subscription' })
  @ApiResponse({
    status: 201,
    description: 'Subscription created successfully',
  })
  async createSubscription(@Body() body: any, @Request() req) {
    return this.subscriptionService.createSubscription(req.user.id, body);
  }

  @Delete('cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel subscription' })
  @ApiResponse({
    status: 200,
    description: 'Subscription cancelled successfully',
  })
  async cancelSubscription(
    @Request() req,
    @Body() body: { subscription_id: string }
  ) {
    return this.subscriptionService.cancelSubscription(req.user.id, {
      subscriptionId: body.subscription_id,
    });
  }

  @Put('update')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update subscription' })
  @ApiResponse({
    status: 200,
    description: 'Subscription updated successfully',
  })
  async updateSubscription(@Body() body: any, @Request() req) {
    return this.subscriptionService.updateSubscription(req.user.id, body);
  }

  @Get('events')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get subscription events' })
  @ApiResponse({ status: 200, description: 'Events retrieved successfully' })
  async getSubscriptionEvents(@Request() req) {
    return this.subscriptionService.getSubscriptionEvents(req.user.id);
  }

  // Razorpay integration endpoints
  @Post('create-razorpay-subscription')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Razorpay subscription' })
  @ApiResponse({
    status: 201,
    description: 'Razorpay subscription created successfully',
  })
  async createRazorpaySubscription(@Body() body: any, @Request() req) {
    const userId = req.user?.id;
    return this.subscriptionService.createRazorpaySubscription(body, userId);
  }

  @Post('cancel-razorpay-subscription')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel Razorpay subscription' })
  @ApiResponse({
    status: 200,
    description: 'Razorpay subscription cancelled successfully',
  })
  async cancelRazorpaySubscription(
    @Body() body: { subscription_id: string; cancel_at_cycle_end?: boolean },
    @Request() _req
  ) {
    return this.subscriptionService.cancelRazorpaySubscription(
      body.subscription_id,
      body.cancel_at_cycle_end
    );
  }

  @Get('razorpay-subscription')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Razorpay subscription details' })
  @ApiResponse({
    status: 200,
    description: 'Razorpay subscription retrieved successfully',
  })
  async getRazorpaySubscription(
    @Query('subscription_id') subscriptionId: string,
    @Request() _req
  ) {
    return this.subscriptionService.getRazorpaySubscription(subscriptionId);
  }

  @Get('razorpay-subscription-invoices')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Razorpay subscription invoices' })
  @ApiResponse({
    status: 200,
    description: 'Razorpay subscription invoices retrieved successfully',
  })
  async getRazorpaySubscriptionInvoices(
    @Query('subscription_id') subscriptionId: string,
    @Request() _req
  ) {
    return this.subscriptionService.getRazorpaySubscriptionInvoices(
      subscriptionId
    );
  }

  @Get('get-subscription-invoices-by-user')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get subscription invoices by user ID' })
  @ApiResponse({
    status: 200,
    description: 'Invoices retrieved successfully',
  })
  async getSubscriptionInvoicesByUser(@Request() req) {
    const userId = req.user.id;
    return this.subscriptionService.getUserSubscriptionInvoices(userId);
  }

  @Get('supported-countries')
  @ApiOperation({ summary: 'Get supported countries from plans table' })
  @ApiResponse({
    status: 200,
    description: 'Supported countries retrieved successfully',
  })
  async getSupportedCountries() {
    return this.subscriptionService.getSupportedCountries();
  }

  @Get('ip-providers-health')
  @ApiOperation({ summary: 'Get IP provider health status' })
  @ApiResponse({
    status: 200,
    description: 'IP provider health status retrieved successfully',
  })
  getIpProvidersHealth() {
    return this.subscriptionService.getIpProvidersHealth();
  }

  @Post('resume-halted-subscription')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resume a halted subscription' })
  @ApiResponse({
    status: 200,
    description: 'Subscription resumed successfully',
  })
  async resumeHaltedSubscription(
    @Body() body: { subscriptionId: string },
    @Request() req
  ) {
    return this.subscriptionService.resumeHaltedSubscription(
      req.user.id,
      body.subscriptionId
    );
  }

  @Post('retry-halted-payment')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retry payment for a halted subscription' })
  @ApiResponse({
    status: 200,
    description: 'Payment retry initiated successfully',
  })
  async retryHaltedPayment(
    @Body() body: { subscriptionId: string },
    @Request() req
  ) {
    return this.subscriptionService.retryHaltedPayment(
      req.user.id,
      body.subscriptionId
    );
  }

  @Get('halted-subscription-details')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get details of halted subscription' })
  @ApiResponse({
    status: 200,
    description: 'Halted subscription details retrieved successfully',
  })
  async getHaltedSubscriptionDetails(@Request() req) {
    return this.subscriptionService.getHaltedSubscriptionDetails(req.user.id);
  }
}
