import { IsString, IsOptional } from 'class-validator';

export class CreateWikiPageDto {
  @IsString()
  slug!: string;

  @IsString()
  title!: string;

  @IsString()
  body!: string;
}

export class UpdateWikiPageDto {
  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  body?: string;
}
