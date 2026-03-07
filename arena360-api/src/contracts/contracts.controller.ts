import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateContractDto, UpdateContractDto } from './dto/contract.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ContractsController {
    constructor(private readonly contractsService: ContractsService) { }

    @Get('projects/:projectId/contracts')
    findAll(@Request() req: any, @Param('projectId') projectId: string) {
        return this.contractsService.findAll(projectId, req.user);
    }

    @Post('projects/:projectId/contracts')
    create(
        @Request() req: any,
        @Param('projectId') projectId: string,
        @Body() dto: CreateContractDto
    ) {
        return this.contractsService.create(projectId, req.user, dto);
    }

    @Patch('projects/:projectId/contracts/:contractId')
    update(
        @Request() req: any,
        @Param('projectId') projectId: string,
        @Param('contractId') contractId: string,
        @Body() dto: UpdateContractDto
    ) {
        return this.contractsService.update(projectId, contractId, req.user, dto);
    }

    @Delete('projects/:projectId/contracts/:contractId')
    delete(
        @Request() req: any,
        @Param('projectId') projectId: string,
        @Param('contractId') contractId: string
    ) {
        return this.contractsService.delete(projectId, contractId, req.user);
    }
}
