import {
  IsString,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  Max,
  Length,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class SaveRatingDto {
  @ApiProperty({
    description: 'The ID of the book to rate',
    example: 'bae0d4b4-1234-5678-9abc-def012345678',
  })
  @IsString()
  @IsUUID()
  bookId: string;

  @ApiProperty({
    description: 'Rating value (1-5)',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({
    description: 'Optional review comment',
    example: 'Great story!',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 1000, { message: 'Review must be between 1 and 1000 characters' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      // Basic XSS prevention - remove script tags and dangerous characters
      return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]*>/g, '') // Remove all HTML tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+\s*=/gi, '') // Remove event handlers
        .trim();
    }
    return value;
  })
  @Matches(/^[a-zA-Z0-9\s.,!?\-_()@#$%&*+=:;'"<>/\\[\]{}|`~]*$/, {
    message: 'Review contains invalid characters',
  })
  review?: string;
}
