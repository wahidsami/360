import { Controller, Get, Post, Body, Patch, Param, UseGuards, Request, Delete } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdatePermissionsDto } from './dto/update-permissions.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { GlobalRole } from '@prisma/client';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(GlobalRole.SUPER_ADMIN, GlobalRole.OPS, GlobalRole.PM, GlobalRole.DEV)
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Post()
    create(@Body() createUserDto: CreateUserDto, @Request() req: any) {
        return this.usersService.create(createUserDto, req.user?.orgId, req.user?.id);
    }

    @Get()
    @Roles(GlobalRole.SUPER_ADMIN, GlobalRole.OPS, GlobalRole.PM, GlobalRole.DEV, GlobalRole.QA, GlobalRole.FINANCE)
    findAll(@Request() req: any) {
        return this.usersService.findAll(req.user?.orgId);
    }

    // Explicit @Roles on each PATCH so getAllAndOverride picks them up unambiguously
    @Patch(':id')
    @Roles(GlobalRole.SUPER_ADMIN, GlobalRole.OPS, GlobalRole.PM, GlobalRole.DEV)
    update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
        return this.usersService.update(id, updateUserDto);
    }

    @Patch(':id/permissions')
    @Roles(GlobalRole.SUPER_ADMIN, GlobalRole.OPS, GlobalRole.PM, GlobalRole.DEV)
    updatePermissions(@Param('id') id: string, @Body() dto: UpdatePermissionsDto) {
        return this.usersService.updatePermissions(id, dto.permissions);
    }

    @Post(':id/resend-invite')
    @Roles(GlobalRole.SUPER_ADMIN, GlobalRole.OPS, GlobalRole.PM, GlobalRole.DEV)
    resendInvite(@Param('id') id: string, @Request() req: any) {
        return this.usersService.resendInvite(id, req.user?.orgId, req.user?.id);
    }

    @Delete(':id')
    @Roles(GlobalRole.SUPER_ADMIN)
    remove(@Param('id') id: string, @Request() req: any) {
        return this.usersService.remove(id, req.user?.orgId, req.user?.id);
    }
}
