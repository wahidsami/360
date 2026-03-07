import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

export interface SearchResultItem {
  type: 'project' | 'task' | 'client' | 'finding';
  id: string;
  title: string;
  subtitle?: string;
  projectId?: string;
  clientId?: string;
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(orgId: string, q: string, limit = 20): Promise<SearchResultItem[]> {
    const term = (q || '').trim();
    if (!term || term.length < 2) return [];

    const filter = { contains: term, mode: 'insensitive' as const };
    const results: SearchResultItem[] = [];

    const [projects, tasks, clients, findings] = await Promise.all([
      this.prisma.project.findMany({
        where: {
          orgId,
          deletedAt: null,
          OR: [
            { name: filter },
            { description: filter },
            { tags: { has: term } },
          ],
        },
        take: limit,
        select: { id: true, name: true, client: { select: { name: true } } },
      }),
      this.prisma.task.findMany({
        where: {
          project: { orgId, deletedAt: null },
          deletedAt: null,
          OR: [
            { title: filter },
            { description: filter },
            { labels: { has: term } },
          ],
        },
        take: limit,
        select: {
          id: true,
          title: true,
          projectId: true,
          project: { select: { name: true } },
        },
      }),
      this.prisma.client.findMany({
        where: {
          orgId,
          deletedAt: null,
          OR: [
            { name: filter },
            { industry: filter },
            { notes: filter },
            { contactPerson: filter },
          ],
        },
        take: limit,
        select: { id: true, name: true, industry: true },
      }),
      this.prisma.finding.findMany({
        where: {
          orgId,
          deletedAt: null,
          OR: [
            { title: filter },
            { description: filter },
            { remediation: filter },
          ],
        },
        take: limit,
        select: {
          id: true,
          title: true,
          projectId: true,
          project: { select: { name: true } },
        },
      }),
    ]);

    projects.forEach((p) =>
      results.push({
        type: 'project',
        id: p.id,
        title: p.name,
        subtitle: p.client?.name,
      }),
    );
    tasks.forEach((t) =>
      results.push({
        type: 'task',
        id: t.id,
        title: t.title,
        subtitle: t.project?.name,
        projectId: t.projectId,
      }),
    );
    clients.forEach((c) =>
      results.push({
        type: 'client',
        id: c.id,
        title: c.name,
        subtitle: c.industry ?? undefined,
        clientId: c.id,
      }),
    );
    findings.forEach((f) =>
      results.push({
        type: 'finding',
        id: f.id,
        title: f.title,
        subtitle: f.project?.name,
        projectId: f.projectId,
      }),
    );

    return results.slice(0, limit);
  }
}
