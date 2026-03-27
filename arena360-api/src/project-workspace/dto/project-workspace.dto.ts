import { IsArray, IsBoolean, IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { WorkspaceAudienceType, WorkspaceTemplateStatus } from '@prisma/client';

export class CreateProjectWorkspaceTemplateDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(WorkspaceAudienceType)
  audienceType?: WorkspaceAudienceType;

  @IsOptional()
  @IsEnum(WorkspaceTemplateStatus)
  status?: WorkspaceTemplateStatus;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsObject()
  definitionJson: Record<string, unknown>;
}

export class UpdateProjectWorkspaceTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(WorkspaceAudienceType)
  audienceType?: WorkspaceAudienceType;

  @IsOptional()
  @IsEnum(WorkspaceTemplateStatus)
  status?: WorkspaceTemplateStatus;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsObject()
  definitionJson?: Record<string, unknown>;
}

export class AssignClientWorkspaceTemplateDto {
  @IsString()
  templateId: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateClientWorkspaceTemplateAssignmentDto {
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ProjectWorkspaceDefinitionDto {
  @IsArray()
  tabs: Record<string, unknown>[];

  @IsOptional()
  @IsArray()
  overviewSections?: string[];
}
