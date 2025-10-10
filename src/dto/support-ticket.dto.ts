import {
  IsString,
  IsEnum,
  IsOptional,
  IsNotEmpty,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  TicketStatus,
  TicketPriority,
  TicketCategory,
} from '../entities/support-ticket.entity';

export class CreateSupportTicketDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(2000)
  description: string;

  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @IsEnum(TicketCategory)
  @IsOptional()
  category?: TicketCategory;
}

export class UpdateSupportTicketDto {
  @IsString()
  @IsOptional()
  @MinLength(5)
  @MaxLength(200)
  title?: string;

  @IsString()
  @IsOptional()
  @MinLength(10)
  @MaxLength(2000)
  description?: string;

  @IsEnum(TicketStatus)
  @IsOptional()
  status?: TicketStatus;

  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @IsEnum(TicketCategory)
  @IsOptional()
  category?: TicketCategory;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  resolution?: string;

  @IsOptional()
  closedAt?: Date;

  @IsString()
  @IsOptional()
  closedBy?: string;
}

export class CreateSupportTicketMessageDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(2000)
  content: string;

  @IsOptional()
  isInternal?: boolean;

  @IsString()
  @IsOptional()
  attachmentUrl?: string;

  @IsString()
  @IsOptional()
  attachmentName?: string;
}

export class UpdateSupportTicketMessageDto {
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(2000)
  content?: string;

  @IsOptional()
  isInternal?: boolean;
}

export class SupportTicketQueryDto {
  @IsEnum(TicketStatus)
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  status?: TicketStatus;

  @IsEnum(TicketPriority)
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  priority?: TicketPriority;

  @IsEnum(TicketCategory)
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  category?: TicketCategory;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  search?: string;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 10;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? 'created_at' : value))
  sortBy?: string = 'created_at';

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? 'DESC' : value))
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
