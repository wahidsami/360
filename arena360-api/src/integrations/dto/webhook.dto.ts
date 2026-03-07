import { IsString, IsOptional, IsBoolean, IsArray } from 'class-validator';

export class CreateWebhookDto {
  @IsString()
  name!: string;

  @IsString()
  url!: string;

  @IsOptional()
  @IsString()
  secret?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  events?: string[];

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateWebhookDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  secret?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  events?: string[];

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
