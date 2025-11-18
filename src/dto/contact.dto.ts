import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
  Matches,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ContactFormDto {
  @ApiProperty({
    description: 'Name of the person submitting the contact form',
    example: 'John Doe',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(100)
  @Matches(/^[a-zA-Z\s'-]+$/, {
    message: 'Name can only contain letters, spaces, hyphens, and apostrophes',
  })
  name: string;

  @ApiProperty({
    description: 'Email address of the person submitting the contact form',
    example: 'john@example.com',
  })
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({
    description: 'Message content from the contact form',
    example: 'I have a question about your service...',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(10, { message: 'Message must be at least 10 characters long' })
  @MaxLength(2000)
  message: string;

  @ApiPropertyOptional({
    description: 'Honeypot field - should be empty for legitimate submissions',
    example: '',
  })
  @IsOptional()
  @IsString()
  website?: string; // Honeypot field
}
