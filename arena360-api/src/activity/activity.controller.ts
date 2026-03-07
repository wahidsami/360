import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('activity')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}
  // Project activity is served via GET /projects/:id/activity in ProjectsController
}
