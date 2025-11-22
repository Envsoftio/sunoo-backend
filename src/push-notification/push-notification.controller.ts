import {
  Controller,
  Post,
  Delete,
  Get,
  Patch,
  Body,
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
import { PushNotificationService } from './push-notification.service';
import {
  RegisterDeviceTokenDto,
  UpdatePushPreferencesDto,
} from '../dto/push-notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@ApiTags('Push Notifications')
@Controller('api/push')
export class PushNotificationController {
  constructor(
    private readonly pushNotificationService: PushNotificationService,
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Register or update device token' })
  @ApiResponse({
    status: 200,
    description: 'Device token registered successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async registerDeviceToken(
    @Body() registerDto: RegisterDeviceTokenDto,
    @Request() req?: any
  ) {
    // Get userId from authenticated request if available (optional for anonymous users)
    const userId = req?.user?.id || registerDto.userId;

    const deviceToken = await this.pushNotificationService.registerDeviceToken(
      registerDto.token,
      registerDto.platform,
      userId,
      registerDto.deviceId,
      registerDto.deviceInfo
    );

    return {
      success: true,
      message: 'Device token registered successfully',
      data: {
        id: deviceToken.id,
        platform: deviceToken.platform,
        deviceId: deviceToken.deviceId,
      },
    };
  }

  @Delete('unregister')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unregister device token' })
  @ApiResponse({
    status: 200,
    description: 'Device token unregistered successfully',
  })
  async unregisterDeviceToken(@Body('token') token: string) {
    await this.pushNotificationService.unregisterDeviceToken(token);
    return {
      success: true,
      message: 'Device token unregistered successfully',
    };
  }

  @Get('preferences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user push notification preferences' })
  @ApiResponse({
    status: 200,
    description: 'Preferences retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPreferences(@Request() req: any) {
    const user: User = req.user;

    return {
      success: true,
      data: {
        push_notifications_enabled: user.push_notifications_enabled,
        push_subscription_enabled: user.push_subscription_enabled,
        push_engagement_enabled: user.push_engagement_enabled,
        push_marketing_enabled: user.push_marketing_enabled,
        push_preferences_updated_at: user.push_preferences_updated_at,
        // Note: New story/chapter notifications are always enabled and cannot be disabled
      },
    };
  }

  @Patch('preferences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user push notification preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updatePreferences(
    @Body() updateDto: UpdatePushPreferencesDto,
    @Request() req: any
  ) {
    const user: User = req.user;

    // Update preferences
    if (updateDto.push_notifications_enabled !== undefined) {
      user.push_notifications_enabled = updateDto.push_notifications_enabled;
    }
    if (updateDto.push_subscription_enabled !== undefined) {
      user.push_subscription_enabled = updateDto.push_subscription_enabled;
    }
    if (updateDto.push_engagement_enabled !== undefined) {
      user.push_engagement_enabled = updateDto.push_engagement_enabled;
    }
    if (updateDto.push_marketing_enabled !== undefined) {
      user.push_marketing_enabled = updateDto.push_marketing_enabled;
    }

    user.push_preferences_updated_at = new Date();

    const updatedUser = await this.userRepository.save(user);

    return {
      success: true,
      message: 'Preferences updated successfully',
      data: {
        push_notifications_enabled: updatedUser.push_notifications_enabled,
        push_subscription_enabled: updatedUser.push_subscription_enabled,
        push_engagement_enabled: updatedUser.push_engagement_enabled,
        push_marketing_enabled: updatedUser.push_marketing_enabled,
        push_preferences_updated_at: updatedUser.push_preferences_updated_at,
      },
    };
  }
}
