import { IsString, IsNotEmpty, IsEmail, IsOptional, IsEnum, IsUrl, IsJSON, IsObject } from 'class-validator';
import { ClientStatus } from '@prisma/client';

export class CreateClientDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsOptional()
    @IsEnum(ClientStatus)
    status?: ClientStatus;

    @IsOptional()
    @IsString()
    industry?: string;

    @IsOptional()
    @IsString()
    contactPerson?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsUrl({ require_tld: false })
    website?: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    @IsObject()
    billing?: any;

    @IsOptional()
    @IsString()
    logo?: string;
}
