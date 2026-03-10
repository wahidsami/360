import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GlobalRole } from '@prisma/client';
import { PERMISSIONS_KEY } from './permissions.decorator';

const ROLE_DEFAULT_PERMISSIONS: Record<GlobalRole, string[]> = {
  [GlobalRole.SUPER_ADMIN]: ['VIEW_DASHBOARD', 'VIEW_CLIENTS', 'MANAGE_CLIENTS', 'MANAGE_PROJECTS', 'MANAGE_TASKS', 'MANAGE_TEAM', 'VIEW_FINANCIALS', 'MANAGE_USERS', 'VIEW_ADMIN'],
  [GlobalRole.OPS]: ['VIEW_DASHBOARD', 'VIEW_CLIENTS', 'MANAGE_CLIENTS', 'MANAGE_PROJECTS', 'MANAGE_TASKS', 'MANAGE_TEAM', 'VIEW_FINANCIALS'],
  [GlobalRole.PM]: ['VIEW_DASHBOARD', 'VIEW_CLIENTS', 'MANAGE_PROJECTS', 'MANAGE_TASKS', 'MANAGE_TEAM'],
  [GlobalRole.DEV]: ['VIEW_DASHBOARD', 'VIEW_CLIENTS', 'MANAGE_TASKS'],
  [GlobalRole.QA]: ['VIEW_DASHBOARD', 'VIEW_CLIENTS', 'MANAGE_TASKS'],
  [GlobalRole.FINANCE]: ['VIEW_DASHBOARD', 'VIEW_CLIENTS', 'VIEW_FINANCIALS'],
  [GlobalRole.CLIENT_OWNER]: ['VIEW_DASHBOARD', 'VIEW_CLIENTS', 'VIEW_FINANCIALS'],
  [GlobalRole.CLIENT_MANAGER]: ['VIEW_DASHBOARD', 'VIEW_CLIENTS'],
  [GlobalRole.CLIENT_MEMBER]: ['VIEW_DASHBOARD'],
  [GlobalRole.VIEWER]: ['VIEW_DASHBOARD'],
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions?.length) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;

    if (user.role === GlobalRole.SUPER_ADMIN) return true;

    const rolePerms = ROLE_DEFAULT_PERMISSIONS[user.role as GlobalRole] ?? [];
    const customPerms = Array.isArray(user.customPermissions) ? user.customPermissions : [];

    const has = (perm: string) =>
      rolePerms.includes(perm) || customPerms.includes(perm);

    return requiredPermissions.some((p) => has(p));
  }
}
