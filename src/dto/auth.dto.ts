import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  password: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'https://example.com/avatar.jpg', required: false })
  @IsOptional()
  @IsString()
  avatar?: string;
}

export class AuthResponseDto {
  @ApiProperty({ required: false })
  accessToken?: string | null;

  @ApiProperty({ required: false })
  refreshToken?: string | null;

  @ApiProperty({ required: false })
  expiresAt?: Date | null;

  @ApiProperty()
  user: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
  };

  @ApiProperty({ required: false })
  message?: string;

  @ApiProperty({ required: false })
  requiresEmailVerification?: boolean;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'reset-token-here' })
  @IsString()
  token: string;

  @ApiProperty({ example: 'newpassword123' })
  @IsString()
  @MinLength(6)
  newPassword: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'currentpassword123' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: 'newpassword123' })
  @IsString()
  @MinLength(6)
  newPassword: string;
}
