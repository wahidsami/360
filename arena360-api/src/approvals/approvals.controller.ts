import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApprovalsService } from './approvals.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateApprovalRequestDto } from './dto/create-approval-request.dto';
import { ReviewApprovalDto } from './dto/review-approval.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Post()
  create(@Request() req: any, @Body() dto: CreateApprovalRequestDto) {
    return this.approvalsService.create(dto, req.user);
  }

  @Get('entity/:entityType/:entityId')
  findByEntity(
    @Request() req: any,
    @Param('entityType') entityType: 'REPORT' | 'INVOICE' | 'CONTRACT',
    @Param('entityId') entityId: string,
  ) {
    return this.approvalsService.findByEntity(entityType, entityId, req.user);
  }

  @Get('entity/:entityType/:entityId/latest')
  getLatestForEntity(
    @Request() req: any,
    @Param('entityType') entityType: 'REPORT' | 'INVOICE' | 'CONTRACT',
    @Param('entityId') entityId: string,
  ) {
    return this.approvalsService.getLatestForEntity(entityType, entityId, req.user);
  }

  @Get('project/:projectId')
  listByProject(@Request() req: any, @Param('projectId') projectId: string) {
    return this.approvalsService.listByProject(projectId, req.user);
  }

  @Get('pending')
  listPending(@Request() req: any) {
    return this.approvalsService.listPending(req.user);
  }

  @Patch(':id/approve')
  approve(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: ReviewApprovalDto,
  ) {
    return this.approvalsService.approve(id, req.user, dto);
  }

  @Patch(':id/reject')
  reject(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: ReviewApprovalDto,
  ) {
    return this.approvalsService.reject(id, req.user, dto);
  }
}
