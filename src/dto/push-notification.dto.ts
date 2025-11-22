import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsObject,
  IsUUID,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { Platform } from '../entities/device-token.entity';

export enum NotificationType {
  SUBSCRIPTION = 'subscription',
  NEW_CONTENT = 'new_content',
  ENGAGEMENT = 'engagement',
  MARKETING = 'marketing',
  CUSTOM = 'custom',
}

export enum EngagementType {
  BOOKMARK_REMINDER = 'bookmark_reminder',
  CONTINUE_LISTENING = 'continue_listening',
}

export class RegisterDeviceTokenDto {
  @ApiProperty({ description: 'FCM device token' })
  @IsString()
  token: string;

  @ApiProperty({ enum: Platform, description: 'Device platform' })
  @IsEnum(Platform)
  platform: Platform;

  @ApiProperty({ required: false, description: 'Device identifier' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({ required: false, description: 'Device information metadata' })
  @IsOptional()
  @IsObject()
  deviceInfo?: any;

  @ApiProperty({
    required: false,
    description: 'User ID (optional for anonymous users)',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;
}

export class UpdatePushPreferencesDto {
  @ApiProperty({
    required: false,
    description: 'Enable general push notifications',
  })
  @IsOptional()
  @IsBoolean()
  push_notifications_enabled?: boolean;

  @ApiProperty({
    required: false,
    description: 'Enable subscription push notifications',
  })
  @IsOptional()
  @IsBoolean()
  push_subscription_enabled?: boolean;

  @ApiProperty({
    required: false,
    description: 'Enable engagement push notifications',
  })
  @IsOptional()
  @IsBoolean()
  push_engagement_enabled?: boolean;

  @ApiProperty({
    required: false,
    description: 'Enable marketing push notifications',
  })
  @IsOptional()
  @IsBoolean()
  push_marketing_enabled?: boolean;

  // Note: push_new_content_enabled is intentionally excluded - new story/chapter notifications cannot be disabled
}

export class TargetFiltersDto {
  @ApiProperty({ required: false, description: 'Target all users' })
  @IsOptional()
  @IsBoolean()
  allUsers?: boolean;

  @ApiProperty({
    required: false,
    description: 'Target users with active subscriptions',
  })
  @IsOptional()
  @IsBoolean()
  activeSubscriptions?: boolean;

  @ApiProperty({ required: false, description: 'Target users with bookmarks' })
  @IsOptional()
  @IsBoolean()
  withBookmarks?: boolean;

  @ApiProperty({
    required: false,
    description: 'Target users with story progress',
  })
  @IsOptional()
  @IsBoolean()
  withProgress?: boolean;

  @ApiProperty({
    required: false,
    description: 'Target specific user IDs',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  userIds?: string[];

  @ApiProperty({ required: false, description: 'Target anonymous users' })
  @IsOptional()
  @IsBoolean()
  anonymousUsers?: boolean;
}

export class SendNotificationDto {
  @ApiProperty({ description: 'Notification title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Notification message/body' })
  @IsString()
  message: string;

  @ApiProperty({ enum: NotificationType, description: 'Notification type' })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ required: false, description: 'Target audience filters' })
  @IsOptional()
  @ValidateNested()
  @Type(() => TargetFiltersDto)
  targetFilters?: TargetFiltersDto;

  @ApiProperty({ required: false, description: 'Additional data payload' })
  @IsOptional()
  @IsObject()
  data?: any;
}

export class ContentNotificationDto {
  @ApiProperty({ description: 'Story slug (used to lookup story for deep linking)' })
  @IsString()
  storySlug: string;

  @ApiProperty({
    required: false,
    description: 'Chapter ID (optional for deep linking)',
  })
  @IsOptional()
  @IsUUID()
  chapterId?: string;

  @ApiProperty({ description: 'Notification title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Notification message/body' })
  @IsString()
  message: string;

  @ApiProperty({ required: false, description: 'Target audience filters' })
  @IsOptional()
  @ValidateNested()
  @Type(() => TargetFiltersDto)
  targetFilters?: TargetFiltersDto;
}

export class EngagementNotificationDto {
  @ApiProperty({
    enum: EngagementType,
    description: 'Engagement notification type',
  })
  @IsEnum(EngagementType)
  type: EngagementType;

  @ApiProperty({ description: 'Notification title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Notification message/body' })
  @IsString()
  message: string;

  @ApiProperty({ required: false, description: 'Target audience filters' })
  @IsOptional()
  @ValidateNested()
  @Type(() => TargetFiltersDto)
  targetFilters?: TargetFiltersDto;
}

