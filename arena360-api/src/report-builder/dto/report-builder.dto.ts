import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  ProjectReportEntrySeverity,
  ProjectReportEntryStatus,
  ProjectReportStatus,
  ProjectReportVisibility,
  ReportBuilderTemplateCategory,
  ReportBuilderTemplateStatus,
} from '@prisma/client';

export class CreateReportBuilderTemplateDto {
  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ReportBuilderTemplateCategory)
  category?: ReportBuilderTemplateCategory;

  @IsOptional()
  @IsEnum(ReportBuilderTemplateStatus)
  status?: ReportBuilderTemplateStatus;
}

export class UpdateReportBuilderTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ReportBuilderTemplateCategory)
  category?: ReportBuilderTemplateCategory;

  @IsOptional()
  @IsEnum(ReportBuilderTemplateStatus)
  status?: ReportBuilderTemplateStatus;
}

export class CreateReportBuilderTemplateVersionDto {
  @IsObject()
  schemaJson: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  pdfConfigJson?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  aiConfigJson?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  taxonomyJson?: Record<string, unknown>;
}

export class AssignClientReportTemplateDto {
  @IsString()
  templateId: string;

  @IsString()
  templateVersionId: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateClientReportTemplateAssignmentDto {
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateProjectReportDto {
  @IsString()
  templateId: string;

  @IsString()
  templateVersionId: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ProjectReportVisibility)
  visibility?: ProjectReportVisibility;

  @IsOptional()
  @IsString()
  performedById?: string;
}

export class UpdateProjectReportDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ProjectReportStatus)
  status?: ProjectReportStatus;

  @IsOptional()
  @IsEnum(ProjectReportVisibility)
  visibility?: ProjectReportVisibility;

  @IsOptional()
  @IsString()
  performedById?: string;

  @IsOptional()
  @IsObject()
  summaryJson?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  coverSnapshotJson?: Record<string, unknown>;
}

export class CreateProjectReportEntryDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsString()
  serviceName?: string;

  @IsString()
  issueTitle: string;

  @IsString()
  issueDescription: string;

  @IsOptional()
  @IsEnum(ProjectReportEntrySeverity)
  severity?: ProjectReportEntrySeverity;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  subcategory?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsUrl({ require_tld: false }, { message: 'pageUrl must be a valid URL' })
  pageUrl?: string;

  @IsOptional()
  @IsString()
  recommendation?: string;

  @IsOptional()
  @IsEnum(ProjectReportEntryStatus)
  status?: ProjectReportEntryStatus;

  @IsOptional()
  @IsObject()
  rowDataJson?: Record<string, unknown>;
}

export class UpdateProjectReportEntryDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsString()
  serviceName?: string;

  @IsOptional()
  @IsString()
  issueTitle?: string;

  @IsOptional()
  @IsString()
  issueDescription?: string;

  @IsOptional()
  @IsEnum(ProjectReportEntrySeverity)
  severity?: ProjectReportEntrySeverity;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  subcategory?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsUrl({ require_tld: false }, { message: 'pageUrl must be a valid URL' })
  pageUrl?: string;

  @IsOptional()
  @IsString()
  recommendation?: string;

  @IsOptional()
  @IsEnum(ProjectReportEntryStatus)
  status?: ProjectReportEntryStatus;

  @IsOptional()
  @IsObject()
  rowDataJson?: Record<string, unknown>;
}

export class ReorderProjectReportEntriesDto {
  @IsArray()
  items: Array<{ id: string; sortOrder: number }>;
}
