import { IsString, IsOptional, IsBoolean, IsInt, IsIn, IsObject } from 'class-validator';

export class CreateCustomFieldDefDto {
  @IsString()
  @IsIn(['PROJECT', 'TASK', 'CLIENT'])
  entityType!: 'PROJECT' | 'TASK' | 'CLIENT';

  @IsString()
  key!: string;

  @IsString()
  label!: string;

  @IsString()
  @IsIn(['TEXT', 'NUMBER', 'DATE', 'SELECT', 'CHECKBOX'])
  fieldType!: 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'CHECKBOX';

  @IsOptional()
  @IsObject()
  options?: unknown;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateCustomFieldDefDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  @IsIn(['TEXT', 'NUMBER', 'DATE', 'SELECT', 'CHECKBOX'])
  fieldType?: 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'CHECKBOX';

  @IsOptional()
  @IsObject()
  options?: unknown;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class SetCustomFieldValuesDto {
  @IsObject()
  values!: Record<string, string | number | boolean | null>;
}
