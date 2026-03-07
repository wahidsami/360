import { IsString, IsEnum, IsBoolean, IsOptional, MinLength, IsArray } from 'class-validator';
import { GlobalRole } from '@prisma/client';

export class UpdateUserDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsEnum(GlobalRole)
    @IsOptional()
    role?: GlobalRole;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @IsString()
    @IsOptional()
    @MinLength(6)
    password?: string;

    @IsString()
    @IsOptional()
    avatar?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    permissions?: string[];
}
