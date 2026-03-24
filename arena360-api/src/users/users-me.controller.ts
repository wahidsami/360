import { Controller, Get, Patch, Body, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PrismaService } from '../common/prisma.service';
import * as bcrypt from 'bcrypt';

@Controller('users/me')
@UseGuards(JwtAuthGuard)
export class UsersMeController {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('dashboard-preferences')
  getDashboardPreferences(@Request() req: any) {
    return this.usersService.getDashboardPreferences(req.user?.id ?? req.user?.sub);
  }

  @Patch('dashboard-preferences')
  updateDashboardPreferences(@Request() req: any, @Body() body: { widgets: { id: string; order: number; config?: Record<string, unknown> }[] }) {
    return this.usersService.updateDashboardPreferences(req.user?.id ?? req.user?.sub, body);
  }

  @Patch('password')
  async changePassword(
    @Request() req: any,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    const userId = req.user?.id ?? req.user?.sub;
    if (!body.currentPassword || !body.newPassword) {
      throw new BadRequestException('currentPassword and newPassword are required');
    }
    if (body.newPassword.length < 6) {
      throw new BadRequestException('New password must be at least 6 characters');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) {
      throw new BadRequestException('Password change not supported for SSO-only accounts');
    }

    const isMatch = await bcrypt.compare(body.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('Current password is incorrect');
    }

    const newHash = await bcrypt.hash(body.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return { message: 'Password updated successfully' };
  }
}
