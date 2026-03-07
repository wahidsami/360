import { IsString, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { ReportType, ReportStatus, ReportVisibility } from '@prisma/client';

export class CreateReportDto {
    @IsString()
    title: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsEnum(ReportType)
    type?: ReportType;

    @IsOptional()
    @IsEnum(ReportStatus)
    status?: ReportStatus;

    @IsOptional()
    @IsEnum(ReportVisibility)
    visibility?: ReportVisibility;
}

export class UpdateReportDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsEnum(ReportType)
    type?: ReportType;

    @IsOptional()
    @IsEnum(ReportStatus)
    status?: ReportStatus;

    @IsOptional()
    @IsEnum(ReportVisibility)
    visibility?: ReportVisibility;

    @IsOptional()
    @IsDateString()
    publishedAt?: string;
}
