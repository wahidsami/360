
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { GlobalRole } from '@prisma/client';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<GlobalRole[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredRoles) {
            return true;
        }

        const { user } = context.switchToHttp().getRequest();
        if (!user) return false;

        // Check if user has any of the required roles
        // For hierarchies, you'd implement checking logic here
        if (requiredRoles.includes(user.role)) {
            return true;
        }

        // Simple Hierarchy Check (Super Admin has all access)
        if (user.role === GlobalRole.SUPER_ADMIN) return true;

        return false;
    }
}
