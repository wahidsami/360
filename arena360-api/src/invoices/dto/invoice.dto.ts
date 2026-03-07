import { IsString, IsNumber, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { InvoiceStatus } from '@prisma/client';

export class CreateInvoiceDto {
    @IsString()
    invoiceNumber: string;

    @IsNumber()
    amount: number;

    @IsOptional()
    @IsString()
    currency?: string;

    @IsDateString()
    dueDate: string;

    @IsOptional()
    @IsString()
    contractId?: string;

    @IsOptional()
    @IsEnum(InvoiceStatus)
    status?: InvoiceStatus;
}

export class UpdateInvoiceDto {
    @IsOptional()
    @IsString()
    invoiceNumber?: string;

    @IsOptional()
    @IsNumber()
    amount?: number;

    @IsOptional()
    @IsString()
    currency?: string;

    @IsOptional()
    @IsDateString()
    dueDate?: string;

    @IsOptional()
    @IsString()
    contractId?: string;

    @IsOptional()
    @IsEnum(InvoiceStatus)
    status?: InvoiceStatus;

    @IsOptional()
    @IsDateString()
    issuedAt?: string;

    @IsOptional()
    @IsDateString()
    paidAt?: string;
}
