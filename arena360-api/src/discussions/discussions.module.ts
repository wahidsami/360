import { Module } from '@nestjs/common';
import { DiscussionsService } from './discussions.service';
import { DiscussionsController } from './discussions.controller';
import { CommonModule } from '../common/common.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [CommonModule, NotificationsModule],
    controllers: [DiscussionsController],
    providers: [DiscussionsService],
})
export class DiscussionsModule { }
