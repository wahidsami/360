import { Module } from '@nestjs/common';
import { FindingsController } from './findings.controller';
import { FindingsService } from './findings.service';
import { CommonModule } from '../common/common.module';
import { AutomationModule } from '../automation/automation.module';
import { ActivityModule } from '../activity/activity.module';
import { SlaModule } from '../sla/sla.module';

@Module({
    imports: [CommonModule, AutomationModule, ActivityModule, SlaModule],
    controllers: [FindingsController],
    providers: [FindingsService],
})
export class FindingsModule { }
