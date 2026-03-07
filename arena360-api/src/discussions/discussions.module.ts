import { Module } from '@nestjs/common';
import { DiscussionsService } from './discussions.service';
import { DiscussionsController } from './discussions.controller';
import { CommonModule } from '../common/common.module';

@Module({
    imports: [CommonModule],
    controllers: [DiscussionsController],
    providers: [DiscussionsService],
})
export class DiscussionsModule { }
