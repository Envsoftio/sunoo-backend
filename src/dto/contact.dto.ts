import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ContactFormDto {
  @ApiProperty({
    description: 'Name of the person submitting the contact form',
    example: 'John Doe',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
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
  @MaxLength(2000)
  message: string;
}
