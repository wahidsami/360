import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma.service';
import OpenAI from 'openai';

@Injectable()
export class AiService {
  private client: OpenAI | null = null;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    const key = this.config.get<string>('OPENAI_API_KEY');
    if (key) this.client = new OpenAI({ apiKey: key });
  }

  private get model(): string {
    return this.config.get<string>('OPENAI_MODEL') || 'gpt-4o';
  }

  private async chat(system: string, user: string): Promise<string> {
    if (!this.client) throw new Error('OpenAI is not configured (OPENAI_API_KEY)');
    const res = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      max_tokens: 1024,
    });
    return res.choices[0]?.message?.content?.trim() || '';
  }

  async generateProjectSummary(projectId: string, orgId: string): Promise<string> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, orgId },
      include: {
        client: { select: { name: true } },
        tasks: { where: { deletedAt: null }, take: 50, select: { title: true, status: true } },
        milestones: { where: { deletedAt: null }, select: { title: true, status: true } },
      },
    });
    if (!project) throw new Error('Project not found');
    const text = JSON.stringify({
      name: project.name,
      description: project.description,
      status: project.status,
      health: project.health,
      progress: project.progress,
      client: project.client?.name,
      taskCount: project.tasks.length,
      tasks: project.tasks.map((t) => ({ title: t.title, status: t.status })),
      milestones: project.milestones.map((m) => ({ title: m.title, status: m.status })),
    }, null, 2);
    return this.chat(
      'You are a project analyst. Summarize the project in 2–4 short paragraphs: objectives, current status, and key risks or next steps.',
      `Project data:\n${text}`,
    );
  }

  async suggestTasks(projectId: string, orgId: string): Promise<string> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, orgId },
      include: {
        tasks: { where: { deletedAt: null }, select: { title: true, status: true } },
        milestones: { where: { deletedAt: null }, select: { title: true } },
      },
    });
    if (!project) throw new Error('Project not found');
    const text = JSON.stringify({
      name: project.name,
      description: project.description,
      existingTasks: project.tasks,
      milestones: project.milestones,
    }, null, 2);
    return this.chat(
      'You are a project manager. Suggest 3–6 concrete next tasks as a JSON array of objects with "title" and "description" only. Output only the JSON array, no markdown.',
      `Project:\n${text}`,
    );
  }

  async analyzeFinding(findingId: string, orgId: string): Promise<string> {
    const finding = await this.prisma.finding.findFirst({
      where: { id: findingId, orgId },
      include: { project: { select: { name: true } } },
    });
    if (!finding) throw new Error('Finding not found');
    const text = JSON.stringify({
      title: finding.title,
      description: finding.description,
      severity: finding.severity,
      remediation: finding.remediation,
      impact: finding.impact,
      project: finding.project?.name,
    }, null, 2);
    return this.chat(
      'You are a security/QA analyst. Based on the finding, suggest concise remediation steps and impact assessment. Use bullet points.',
      `Finding:\n${text}`,
    );
  }

  async generateStatusReport(projectId: string, orgId: string): Promise<string> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, orgId },
      include: {
        client: { select: { name: true } },
        tasks: { where: { deletedAt: null }, select: { title: true, status: true } },
        updates: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 5, select: { title: true, content: true, createdAt: true } },
      },
    });
    if (!project) throw new Error('Project not found');
    const text = JSON.stringify({
      name: project.name,
      status: project.status,
      health: project.health,
      progress: project.progress,
      client: project.client?.name,
      tasks: project.tasks,
      recentUpdates: project.updates,
    }, null, 2);
    return this.chat(
      'You are a project manager. Write a short executive status report (3–5 paragraphs) suitable for a client: progress, highlights, and any blockers.',
      `Project data:\n${text}`,
    );
  }

  async chatWithContext(messages: { role: string; content: string }[], context?: { projectId?: string; findingId?: string }, orgId?: string): Promise<string> {
    let system = 'You are a helpful assistant for a project management platform. Be concise and professional.';
    if (context?.projectId && orgId) {
      const project = await this.prisma.project.findFirst({
        where: { id: context.projectId, orgId },
        select: { name: true, description: true, status: true },
      });
      if (project) system += `\nCurrent project context: ${project.name} (${project.status}). ${project.description || ''}`;
    }
    if (context?.findingId && orgId) {
      const finding = await this.prisma.finding.findFirst({
        where: { id: context.findingId, orgId },
        select: { title: true, severity: true },
      });
      if (finding) system += `\nCurrent finding context: ${finding.title} (${finding.severity}).`;
    }
    if (!this.client) throw new Error('OpenAI is not configured (OPENAI_API_KEY)');
    const formatted = messages.map((m) => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content }));
    const res = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'system', content: system }, ...formatted],
      max_tokens: 1024,
    });
    return res.choices[0]?.message?.content?.trim() || '';
  }
}
