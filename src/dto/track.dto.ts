import { IsString, IsNumber, IsUUID, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class TrackListeningDto {
  @ApiProperty({
    description: 'The ID of the user',
    example: '38f4283a-61c6-453f-af44-efdac7cb8721',
  })
  @IsString()
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: 'The ID of the story',
    example: 'bae0d4b4-1234-5678-9abc-def012345678',
  })
  @IsString()
  @IsUUID()
  storyId: string;

  @ApiProperty({
    description: 'The ID of the chapter',
    example: 'de6cec9f-127a-4dc9-9abf-9c8e3b719f55',
  })
  @IsString()
  @IsUUID()
  chapterId: string;

  @ApiProperty({
    description: 'Progress percentage (0-100)',
    example: 45.5,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @Transform(({ value }) => parseFloat(value))
  progress: number;
}
