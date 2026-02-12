import { IsUUID, IsNumber, IsBoolean } from 'class-validator';

export class EndSessionDto {
  @IsUUID()
  session_id: string;

  @IsNumber()
  total_duration_seconds: number;

  @IsBoolean()
  completed_naturally: boolean;
}
