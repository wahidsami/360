import { Controller, Get, Post, Body, Patch, Param, UseGuards, Request } from '@nestjs/common';
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
        // Pass current user's OrgId and UserId to scope new user and invite
        return this.usersService.create(createUserDto, req.user?.orgId, req.user?.id);
    }

    @Get()
    findAll(@Request() req: any) {
        return this.usersService.findAll(req.user?.orgId);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
        return this.usersService.update(id, updateUserDto);
    }

    @Patch(':id/permissions')
    updatePermissions(@Param('id') id: string, @Body() dto: UpdatePermissionsDto) {
        return this.usersService.updatePermissions(id, dto.permissions);
    }
}
