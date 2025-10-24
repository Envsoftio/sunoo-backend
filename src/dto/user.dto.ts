import { IsEmail, IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'https://example.com/avatar.jpg', required: false })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  password: string;
}

export class UpdateUserDto {
  @ApiProperty({ example: 'user@example.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'John Doe', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'https://example.com/avatar.jpg', required: false })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateEmailPreferencesDto {
  @ApiProperty({
    example: true,
    required: false,
    description: 'Enable general email notifications',
  })
  @IsOptional()
  @IsBoolean()
  email_notifications_enabled?: boolean;

  @ApiProperty({
    example: true,
    required: false,
    description: 'Enable marketing emails',
  })
  @IsOptional()
  @IsBoolean()
  marketing_emails_enabled?: boolean;

  @ApiProperty({
    example: true,
    required: false,
    description: 'Enable new content notifications',
  })
  @IsOptional()
  @IsBoolean()
  new_content_emails_enabled?: boolean;

  @ApiProperty({
    example: true,
    required: false,
    description: 'Enable subscription-related emails',
  })
  @IsOptional()
  @IsBoolean()
  subscription_emails_enabled?: boolean;
}

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  avatar?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  isEmailVerified: boolean;

  @ApiProperty({ description: 'Email notification preferences' })
  email_notifications_enabled: boolean;

  @ApiProperty({ description: 'Marketing email preferences' })
  marketing_emails_enabled: boolean;

  @ApiProperty({ description: 'New content email preferences' })
  new_content_emails_enabled: boolean;

  @ApiProperty({ description: 'Subscription email preferences' })
  subscription_emails_enabled: boolean;

  @ApiProperty({
    required: false,
    description: 'When email preferences were last updated',
  })
  email_preferences_updated_at?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
