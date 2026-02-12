import { IsString, IsOptional, IsArray, IsUUID, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class MixSoundDto {
  @IsUUID()
  sound_id: string;

  @IsNumber()
  volume: number;
}

export class CreateUserMixDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MixSoundDto)
  sounds: MixSoundDto[];
}
