import { IsArray, IsUUID, IsOptional, IsObject } from 'class-validator';

export class StartSessionDto {
  @IsArray()
  @IsUUID('4', { each: true })
  sound_ids: string[];

  /** When user starts playing a curated/predefined mix, send its id so we can increment play_count */
  @IsOptional()
  @IsUUID('4')
  predefined_mix_id?: string;

  @IsOptional()
  @IsObject()
  device_info?: any;
}
