import { IsString, IsUUID, IsEnum, IsNumber, IsOptional, IsObject } from 'class-validator';
import { AnalyticsEventType } from '../../entities';

export class CreateAnalyticsEventDto {
  @IsUUID()
  session_id: string;

  @IsUUID()
  sound_id: string;

  @IsEnum(AnalyticsEventType)
  event_type: AnalyticsEventType;

  @IsOptional()
  @IsNumber()
  duration_listened_seconds?: number;

  @IsOptional()
  @IsNumber()
  volume_level?: number;

  @IsOptional()
  @IsNumber()
  timer_duration_minutes?: number;

  @IsOptional()
  @IsObject()
  device_info?: any;
}
