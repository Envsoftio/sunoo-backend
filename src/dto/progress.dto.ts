import { IsString, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class SaveProgressDto {
  @ApiProperty({
    description: 'The ID of the book',
    example: 'bae0d4b4-1234-5678-9abc-def012345678',
  })
  @IsString()
  @IsUUID()
  bookId: string;

  @ApiProperty({
    description: 'The ID of the chapter',
    example: 'de6cec9f-127a-4dc9-9abf-9c8e3b719f55',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  chapterId?: string;

  @ApiProperty({
    description: 'Progress time in seconds',
    example: 120.5,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  progress: number;

  @ApiProperty({
    description: 'Current time in seconds',
    example: 120.5,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  currentTime: number;

  @ApiProperty({
    description: 'Total time in seconds',
    example: 300.0,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  totalTime: number;
}
