import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request, Header } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateInvoiceDto, UpdateInvoiceDto } from './dto/invoice.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class InvoicesController {
    constructor(private readonly invoicesService: InvoicesService) { }

    @Get('projects/:projectId/invoices')
    findAll(@Request() req: any, @Param('projectId') projectId: string) {
        return this.invoicesService.findAll(projectId, req.user);
    }

    @Get('projects/:projectId/invoices/:invoiceId')
    findOne(
        @Request() req: any,
        @Param('projectId') projectId: string,
        @Param('invoiceId') invoiceId: string,
    ) {
        return this.invoicesService.findOne(projectId, invoiceId, req.user);
    }

    @Post('projects/:projectId/invoices/:invoiceId/create-payment-intent')
    createPaymentIntent(
        @Request() req: any,
        @Param('projectId') projectId: string,
        @Param('invoiceId') invoiceId: string,
    ) {
        return this.invoicesService.createPaymentIntent(projectId, invoiceId, req.user);
    }

    @Get('projects/:projectId/invoices/export')
    @Header('Content-Type', 'text/csv')
    @Header('Content-Disposition', 'attachment; filename="invoices.csv"')
    async exportCsv(@Request() req: any, @Param('projectId') projectId: string) {
        return this.invoicesService.exportCsv(projectId, req.user);
    }

    @Post('projects/:projectId/invoices')
    create(
        @Request() req: any,
        @Param('projectId') projectId: string,
        @Body() dto: CreateInvoiceDto
    ) {
        return this.invoicesService.create(projectId, req.user, dto);
    }

    @Patch('projects/:projectId/invoices/:invoiceId')
    update(
        @Request() req: any,
        @Param('projectId') projectId: string,
        @Param('invoiceId') invoiceId: string,
        @Body() dto: UpdateInvoiceDto
    ) {
        return this.invoicesService.update(projectId, invoiceId, req.user, dto);
    }

    @Delete('projects/:projectId/invoices/:invoiceId')
    delete(
        @Request() req: any,
        @Param('projectId') projectId: string,
        @Param('invoiceId') invoiceId: string
    ) {
        return this.invoicesService.delete(projectId, invoiceId, req.user);
    }

    @Get('dashboard/financial-stats')
    getFinancialStats(@Request() req: any) {
        return this.invoicesService.getFinancialStats(req.user.orgId);
    }
}
