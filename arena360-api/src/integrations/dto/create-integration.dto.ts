import { IsString, IsOptional, IsBoolean, IsObject } from 'class-validator';

export class CreateIntegrationDto {
  @IsString()
  type!: 'SLACK' | 'GITHUB';

  @IsString()
  name!: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsObject()
  config!: Record<string, unknown>;
}

export class UpdateIntegrationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}
