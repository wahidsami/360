import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateIntegrationDto, UpdateIntegrationDto } from './dto/create-integration.dto';
import { CreateWebhookDto, UpdateWebhookDto } from './dto/webhook.dto';

@UseGuards(JwtAuthGuard)
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly service: IntegrationsService) {}

  @Get()
  listIntegrations(@Request() req: any) {
    return this.service.listIntegrations(req.user.orgId, req.user);
  }

  @Post()
  createIntegration(@Request() req: any, @Body() dto: CreateIntegrationDto) {
    return this.service.createIntegration(req.user.orgId, req.user, dto);
  }

  @Get('webhooks')
  listWebhooks(@Request() req: any) {
    return this.service.listWebhooks(req.user.orgId, req.user);
  }

  @Post('webhooks')
  createWebhook(@Request() req: any, @Body() dto: CreateWebhookDto) {
    return this.service.createWebhook(req.user.orgId, req.user, dto);
  }

  @Patch('webhooks/:id')
  updateWebhook(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateWebhookDto) {
    return this.service.updateWebhook(req.user.orgId, id, req.user, dto);
  }

  @Delete('webhooks/:id')
  deleteWebhook(@Request() req: any, @Param('id') id: string) {
    return this.service.deleteWebhook(req.user.orgId, id, req.user);
  }

  @Patch(':id')
  updateIntegration(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateIntegrationDto) {
    return this.service.updateIntegration(req.user.orgId, id, req.user, dto);
  }

  @Delete(':id')
  deleteIntegration(@Request() req: any, @Param('id') id: string) {
    return this.service.deleteIntegration(req.user.orgId, id, req.user);
  }

  @Post(':id/test-slack')
  testSlack(@Request() req: any, @Param('id') id: string) {
    return this.service.testSlack(req.user.orgId, id, req.user);
  }

  @Post(':id/github-issue')
  createGitHubIssue(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { title: string; body?: string },
  ) {
    return this.service.createGitHubIssue(req.user.orgId, id, req.user, body.title, body.body);
  }
}
