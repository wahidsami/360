import { IsString, IsEnum, IsOptional } from 'class-validator';
import { FindingSeverity, FindingStatus, FindingVisibility } from '@prisma/client';

export class CreateFindingDto {
    @IsString()
    title: string;

    @IsString()
    description: string;

    @IsOptional()
    @IsEnum(FindingSeverity)
    severity?: FindingSeverity;

    @IsOptional()
    @IsEnum(FindingStatus)
    status?: FindingStatus;

    @IsOptional()
    @IsEnum(FindingVisibility)
    visibility?: FindingVisibility;

    @IsOptional()
    @IsString()
    assignedToId?: string;

    @IsOptional()
    @IsString()
    remediation?: string;

    @IsOptional()
    @IsString()
    impact?: string;
}

export class UpdateFindingDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsEnum(FindingSeverity)
    severity?: FindingSeverity;

    @IsOptional()
    @IsEnum(FindingStatus)
    status?: FindingStatus;

    @IsOptional()
    @IsEnum(FindingVisibility)
    visibility?: FindingVisibility;

    @IsOptional()
    @IsString()
    assignedToId?: string;

    @IsOptional()
    @IsString()
    remediation?: string;

    @IsOptional()
    @IsString()
    impact?: string;

    @IsOptional()
    project?: any;

    @IsOptional()
    reportedBy?: any;

    @IsOptional()
    assignedTo?: any;

    @IsOptional()
    evidence?: any;
}
