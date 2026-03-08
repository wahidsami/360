import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { PrismaService } from '../common/prisma.service';
import { AutomationModule } from '../automation/automation.module';

@Module({
    imports: [AutomationModule],
    controllers: [InvoicesController],
    providers: [InvoicesService, PrismaService],
    exports: [InvoicesService],
})
export class InvoicesModule { }
