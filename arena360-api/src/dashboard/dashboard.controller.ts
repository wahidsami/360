import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    @Get('admin')
    getAdminStats(@Request() req: any) {
        return this.dashboardService.getAdminStats(req.user);
    }

    @Get('dev')
    getDevStats(@Request() req: any) {
        return this.dashboardService.getDevStats(req.user);
    }

    @Get('finance')
    getFinanceStats(@Request() req: any) {
        return this.dashboardService.getFinanceStats(req.user);
    }

    @Get('client')
    getClientStats(@Request() req: any) {
        return this.dashboardService.getClientStats(req.user);
    }

    @Get('analytics')
    getAnalytics(@Request() req: any) {
        return this.dashboardService.getAnalytics(req.user);
    }
}
