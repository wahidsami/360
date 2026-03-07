import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AutomationService } from './automation.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('automation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('automation')
export class AutomationController {
  constructor(private readonly automation: AutomationService) {}

  @Get('rules')
  listRules(@Request() req: { user: { orgId: string } }) {
    return this.automation.listRules(req.user.orgId);
  }

  @Get('rules/:id')
  getRule(@Request() req: { user: { orgId: string } }, @Param('id') id: string) {
    return this.automation.getRule(req.user.orgId, id);
  }

  @Post('rules')
  createRule(@Request() req: { user: { orgId: string } }, @Body() body: any) {
    return this.automation.createRule(req.user.orgId, body);
  }

  @Patch('rules/:id')
  updateRule(@Request() req: { user: { orgId: string } }, @Param('id') id: string, @Body() body: any) {
    return this.automation.updateRule(req.user.orgId, id, body);
  }

  @Delete('rules/:id')
  deleteRule(@Request() req: { user: { orgId: string } }, @Param('id') id: string) {
    return this.automation.deleteRule(req.user.orgId, id);
  }
}
