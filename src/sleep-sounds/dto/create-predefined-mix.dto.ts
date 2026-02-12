import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class MixSoundDto {
  @IsUUID()
  sound_id: string;

  @IsNumber()
  volume: number;
}

export class CreatePredefinedMixDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  cover_image?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MixSoundDto)
  sounds: MixSoundDto[];

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsBoolean()
  is_premium?: boolean;

  @IsOptional()
  @IsNumber()
  priority?: number;

  @IsOptional()
  @IsBoolean()
  is_published?: boolean;
}
