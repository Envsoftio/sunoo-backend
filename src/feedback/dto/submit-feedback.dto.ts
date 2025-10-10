import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum FeedbackType {
  BUG = 'Bug',
  FEATURE_REQUEST = 'Feature Request',
  GENERAL = 'General',
  OTHER = 'Other',
}

export class SubmitFeedbackDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  @Matches(/^[a-zA-Z0-9\s\-'.]+$/, {
    message: 'Name contains invalid characters',
  })
  name?: string;

  @IsEmail({}, { message: 'Invalid email format' })
  @MaxLength(255)
  @Transform(({ value }) => value?.trim().toLowerCase())
  email: string;

  @IsEnum(FeedbackType, { message: 'Invalid feedback type' })
  type: FeedbackType;

  @IsString()
  @MinLength(10, { message: 'Message must be at least 10 characters long' })
  @MaxLength(2000, { message: 'Message cannot exceed 2000 characters' })
  @Transform(({ value }) => value?.trim())
  @Matches(/^[a-zA-Z0-9\s\-'.,!?@#$%^&*()[\]{}|;:"'\\/<>=+\-_`~\s\n\r\t]+$/, {
    message: 'Message contains potentially dangerous characters',
  })
  message: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  @Matches(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/, {
    message: 'Invalid user ID format',
  })
  user_id?: string;
}
