import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('users/me')
@UseGuards(JwtAuthGuard)
export class UsersMeController {
  constructor(private readonly usersService: UsersService) {}

  @Get('dashboard-preferences')
  getDashboardPreferences(@Request() req: any) {
    return this.usersService.getDashboardPreferences(req.user?.id ?? req.user?.sub);
  }

  @Patch('dashboard-preferences')
  updateDashboardPreferences(@Request() req: any, @Body() body: { widgets: { id: string; order: number; config?: Record<string, unknown> }[] }) {
    return this.usersService.updateDashboardPreferences(req.user?.id ?? req.user?.sub, body);
  }
}
