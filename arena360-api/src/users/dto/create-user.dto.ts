import { IsEmail, IsNotEmpty, IsString, IsEnum, MinLength, IsOptional, IsArray } from 'class-validator';
import { GlobalRole } from '@prisma/client';

export class CreateUserDto {
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsOptional()
    @IsString()
    @MinLength(6)
    password?: string;

    @IsEnum(GlobalRole)
    role: GlobalRole;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    permissions?: string[];

    @IsOptional()
    @IsString()
    avatar?: string;
}
