import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, IsDateString, Min, Max } from 'class-validator';
import { ProjectStatus, ProjectHealth } from '@prisma/client';

export class CreateProjectDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    clientId: string;

    @IsOptional()
    @IsString()
    status?: string;

    @IsOptional()
    @IsString()
    health?: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(100)
    progress?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    budget?: number;

    @IsOptional()
    @IsString({ each: true })
    tags?: string[];

    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;

    // Frontend compatibility fields (handled in service)
    @IsOptional()
    @IsDateString()
    deadline?: string;

    @IsOptional()
    @IsString()
    description?: string;

    // System fields (allowed for frontend compatibility, ignored in service)
    @IsOptional()
    id?: any;

    @IsOptional()
    client?: any;

    @IsOptional()
    createdAt?: any;

    @IsOptional()
    updatedAt?: any;

    @IsOptional()
    deletedAt?: any;

    @IsOptional()
    members?: any;

    @IsOptional()
    tasks?: any;

    @IsOptional()
    milestones?: any;

    @IsOptional()
    _count?: any;
}
