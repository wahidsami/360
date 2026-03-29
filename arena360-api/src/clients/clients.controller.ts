import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request, Delete, Query } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('clients')
export class ClientsController {
    constructor(private readonly clientsService: ClientsService) { }

    @Post()
    create(@Request() req: any, @Body() createClientDto: CreateClientDto) {
        return this.clientsService.create(req.user, createClientDto);
    }

    @Get()
    findAll(@Request() req: any, @Query() query: any) {
        return this.clientsService.findAll(req.user, query);
    }

    @Get(':id')
    findOne(@Request() req: any, @Param('id') id: string) {
        return this.clientsService.findOne(id, req.user);
    }

    @Patch(':id')
    update(@Request() req: any, @Param('id') id: string, @Body() updateClientDto: UpdateClientDto) {
        return this.clientsService.update(id, req.user, updateClientDto);
    }

    @Patch(':id/archive')
    archive(@Request() req: any, @Param('id') id: string) {
        return this.clientsService.archive(id, req.user);
    }

    @Patch(':id/restore')
    restore(@Request() req: any, @Param('id') id: string) {
        return this.clientsService.restore(id, req.user);
    }

    @Delete(':id')
    remove(@Request() req: any, @Param('id') id: string) {
        return this.clientsService.remove(id, req.user);
    }

    // --- Members ---
    @Get(':id/members')
    getMembers(@Param('id') id: string) {
        return this.clientsService.getMembers(id);
    }

    @Post(':id/members')
    addMember(@Param('id') id: string, @Body() body: { userId: string, role: any }) {
        return this.clientsService.addMember(id, body.userId, body.role);
    }

    @Patch(':id/members/:userId')
    updateMember(@Param('id') id: string, @Param('userId') userId: string, @Body() body: { role: any }) {
        return this.clientsService.updateMemberRole(id, userId, body.role);
    }

    @Delete(':id/members/:userId')
    removeMember(@Param('id') id: string, @Param('userId') userId: string) {
        return this.clientsService.removeMember(id, userId);
    }
}
