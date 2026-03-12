import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString, IsUUID, IsNumber } from 'class-validator';
import { TaskStatus, TaskPriority } from '@prisma/client';

export class CreateTaskDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    status?: string;

    @IsOptional()
    @IsString()
    priority?: string;

    @IsOptional()
    @IsDateString()
    dueDate?: string;

    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsString()
    assigneeId?: string;

    @IsOptional()
    @IsString()
    milestoneId?: string;

    @IsOptional()
    @IsString()
    sprintId?: string;

    @IsOptional()
    @IsNumber()
    storyPoints?: number;

    @IsOptional()
    @IsString({ each: true })
    labels?: string[];

    // System fields (allowed for frontend compatibility, ignored in service)
    @IsOptional()
    id?: any;

    @IsOptional()
    projectId?: any;

    @IsOptional()
    createdAt?: any;

    @IsOptional()
    updatedAt?: any;

    @IsOptional()
    deletedAt?: any;

    @IsOptional()
    assignee?: any;

    @IsOptional()
    milestone?: any;

    @IsOptional()
    sprint?: any;

    @IsOptional()
    _count?: any;

    @IsOptional()
    project?: any;

    @IsOptional()
    reportedBy?: any;

    @IsOptional()
    assignedTo?: any;
}
