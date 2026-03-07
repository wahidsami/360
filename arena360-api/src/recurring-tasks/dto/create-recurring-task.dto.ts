import { IsString, IsOptional, IsObject, IsDateString, IsIn } from 'class-validator';

export class CreateRecurringTaskDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  priority?: string;

  /** e.g. { frequency: 'WEEKLY', interval: 1, weekday: 1 } (weekday 1=Mon, 7=Sun) */
  @IsObject()
  recurrenceRule: { frequency: string; interval?: number; weekday?: number };

  /** When to run next; defaults to now if not set */
  @IsOptional()
  @IsDateString()
  nextRunAt?: string;
}
