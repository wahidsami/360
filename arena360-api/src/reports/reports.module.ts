import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportGeneratorService } from './report-generator.service';
import { PrismaService } from '../common/prisma.service';

@Module({
    controllers: [ReportsController],
    providers: [ReportsService, ReportGeneratorService, PrismaService]
})
export class ReportsModule { }
