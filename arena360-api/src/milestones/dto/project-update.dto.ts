import { IsString, IsEnum, IsOptional } from 'class-validator';
import { UpdateVisibility } from '@prisma/client';

export class CreateProjectUpdateDto {
    @IsString()
    title: string;

    @IsString()
    content: string;

    @IsOptional()
    @IsEnum(UpdateVisibility)
    visibility?: UpdateVisibility;
}
