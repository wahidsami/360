import { IsString, IsInt, IsBoolean, IsOptional, IsEnum, Min } from 'class-validator';

export enum SLAEntityTypeDto {
  TASK = 'TASK',
  FINDING = 'FINDING',
  INVOICE = 'INVOICE',
}

export class CreateSLAPolicyDto {
  @IsString()
  name!: string;

  @IsEnum(SLAEntityTypeDto)
  entityType!: 'TASK' | 'FINDING' | 'INVOICE';

  @IsInt()
  @Min(1)
  targetHours!: number;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateSLAPolicyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  targetHours?: number;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
