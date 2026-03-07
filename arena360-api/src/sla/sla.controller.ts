import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SlaService } from './sla.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateSLAPolicyDto, UpdateSLAPolicyDto } from './dto/sla.dto';
import { SLATrackerStatus } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('sla')
export class SlaController {
  constructor(private readonly service: SlaService) {}

  @Get('policies')
  listPolicies(@Request() req: any, @Query('entityType') entityType?: string) {
    return this.service.listPolicies(req.user.orgId, req.user, entityType as any);
  }

  @Post('policies')
  createPolicy(@Request() req: any, @Body() dto: CreateSLAPolicyDto) {
    return this.service.createPolicy(req.user.orgId, req.user, dto);
  }

  @Patch('policies/:id')
  updatePolicy(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateSLAPolicyDto,
  ) {
    return this.service.updatePolicy(req.user.orgId, id, req.user, dto);
  }

  @Delete('policies/:id')
  deletePolicy(@Request() req: any, @Param('id') id: string) {
    return this.service.deletePolicy(req.user.orgId, id, req.user);
  }

  @Get('trackers')
  listTrackers(
    @Request() req: any,
    @Query('policyId') policyId?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('status') status?: SLATrackerStatus,
  ) {
    return this.service.listTrackers(req.user.orgId, req.user, {
      policyId: policyId || undefined,
      entityType: entityType || undefined,
      entityId: entityId || undefined,
      status: status || undefined,
    });
  }

  @Post('check-breaches')
  checkBreaches(@Request() req: any) {
    return this.service.checkBreaches(req.user.orgId);
  }
}
