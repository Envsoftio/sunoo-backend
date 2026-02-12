import { IsString, IsOptional, IsBoolean, IsNumber, IsUUID, IsArray } from 'class-validator';

export class CreateSoundDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  audio_url: string;

  @IsOptional()
  @IsNumber()
  duration_seconds?: number;

  @IsOptional()
  @IsNumber()
  file_size_bytes?: number;

  @IsOptional()
  @IsString()
  mime_type?: string;

  @IsUUID()
  category_id: string;

  @IsOptional()
  @IsNumber()
  priority?: number;

  @IsOptional()
  @IsBoolean()
  is_published?: boolean;

  @IsOptional()
  @IsBoolean()
  is_premium?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  mood?: string;

  @IsOptional()
  @IsString()
  intensity?: string;
}
