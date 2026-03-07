import { IsString, IsOptional, IsObject, IsDateString, IsBoolean, IsIn } from 'class-validator';

export class UpdateRecurringTaskDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  priority?: string;

  @IsOptional()
  @IsObject()
  recurrenceRule?: { frequency: string; interval?: number; weekday?: number };

  @IsOptional()
  @IsDateString()
  nextRunAt?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
