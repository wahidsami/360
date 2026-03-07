import { IsString, IsEnum, IsOptional } from 'class-validator';
import { FileCategory, FileVisibility } from '@prisma/client';

export class UploadFileDto {
    @IsEnum(FileCategory)
    category: FileCategory;

    @IsOptional()
    @IsEnum(FileVisibility)
    visibility?: FileVisibility;

    @IsOptional()
    @IsString()
    displayName?: string;
}
