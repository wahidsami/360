import { Module } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { SlackService } from './slack.service';
import { GithubService } from './github.service';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [IntegrationsController],
  providers: [IntegrationsService, SlackService, GithubService],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
