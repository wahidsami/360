import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

/**
 * Optional guard: enforce org plan limits (e.g. maxUsers, maxProjects).
 * Use on create-user, create-project etc. when you want to block over-limit.
 */
@Injectable()
export class PlanLimitsGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const orgId = req.user?.orgId;
    if (!orgId) return false;

    const org = await this.prisma.org.findUnique({
      where: { id: orgId },
    });
    if (!org) return false;

    // Example: could check req.route.path and compare current count vs org.maxUsers/maxProjects
    // For now we allow; implement specific checks where this guard is applied.
    return true;
  }
}
