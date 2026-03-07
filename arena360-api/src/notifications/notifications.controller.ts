import { Controller, Get, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(@Request() req: { user: { id: string } }, @Query('unreadOnly') unreadOnly: string) {
    return this.notificationsService.findAllForUser(req.user.id, unreadOnly === 'true', 50);
  }

  @Get('count')
  async getUnreadCount(@Request() req: { user: { id: string } }) {
    const count = await this.notificationsService.getUnreadCount(req.user.id);
    return { count };
  }

  @Patch('read-all')
  markAllRead(@Request() req: { user: { id: string } }) {
    return this.notificationsService.markAllRead(req.user.id);
  }

  @Patch(':id/read')
  markRead(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.notificationsService.markRead(id, req.user.id);
  }

  @Get('preferences')
  getPreferences(@Request() req: { user: { id: string } }) {
    return this.notificationsService.getPreferences(req.user.id);
  }

  @Patch('preferences')
  updatePreferences(@Request() req: { user: { id: string } }, @Body() body: { emailTasks?: boolean; emailFindings?: boolean; emailInvoices?: boolean; inApp?: boolean }) {
    return this.notificationsService.updatePreferences(req.user.id, body);
  }
}
