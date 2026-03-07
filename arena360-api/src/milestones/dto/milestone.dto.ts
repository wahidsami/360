import { IsString, IsDateString, IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { MilestoneStatus } from '@prisma/client';

export class CreateMilestoneDto {
    @IsString()
    title: string;

    @IsDateString()
    dueDate: string;

    @IsOptional()
    @IsString()
    ownerId?: string;

    @IsOptional()
    @IsEnum(MilestoneStatus)
    status?: MilestoneStatus;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(100)
    percentComplete?: number;

    @IsOptional()
    @IsString()
    description?: string;
}

export class UpdateMilestoneDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsDateString()
    dueDate?: string;

    @IsOptional()
    @IsString()
    ownerId?: string;

    @IsOptional()
    @IsEnum(MilestoneStatus)
    status?: MilestoneStatus;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(100)
    percentComplete?: number;

    @IsOptional()
    @IsString()
    description?: string;
}
