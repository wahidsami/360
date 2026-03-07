import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import PptxGenJS from 'pptxgenjs';
import PDFDocument from 'pdfkit';
import { createWriteStream } from 'fs';

const UPLOADS_REPORTS = 'uploads/reports';

@Injectable()
export class ReportGeneratorService {
  constructor(private readonly prisma: PrismaService) {}

  private ensureDir() {
    const dir = join(process.cwd(), UPLOADS_REPORTS);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    return dir;
  }

  async generatePpt(projectId: string, reportId: string, orgId: string, title: string): Promise<string> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, orgId },
      include: {
        client: { select: { name: true } },
        tasks: { where: { deletedAt: null }, take: 30, select: { title: true, status: true } },
        milestones: { where: { deletedAt: null }, select: { title: true, status: true } },
      },
    });
    if (!project) throw new Error('Project not found');

    const pptx = new PptxGenJS();
    pptx.title = title;
    pptx.author = 'Arena360';

    pptx.addSlide().addText(title, { x: 0.5, y: 1.5, w: 9, h: 1, fontSize: 28, bold: true });
    pptx.addSlide().addText(`Project: ${project.name}`, { x: 0.5, y: 0.5, w: 9, h: 0.5, fontSize: 18 });
    pptx.addSlide().addText(`Client: ${project.client?.name || '—'}`, { x: 0.5, y: 0.5, w: 9, h: 0.5, fontSize: 14 });
    pptx.addSlide().addText(`Status: ${project.status} | Health: ${project.health} | Progress: ${project.progress}%`, { x: 0.5, y: 0.5, w: 9, h: 0.5, fontSize: 14 });
    const taskRows = [
      [{ text: 'Task', options: { bold: true } }, { text: 'Status', options: { bold: true } }],
      ...project.tasks.slice(0, 15).map((t) => [{ text: t.title }, { text: t.status }]),
    ];
    pptx.addSlide().addTable(taskRows, { x: 0.5, y: 0.5, w: 9, colW: [6, 2], fontSize: 12 });
    const mileRows = [
      [{ text: 'Milestone', options: { bold: true } }, { text: 'Status', options: { bold: true } }],
      ...project.milestones.map((m) => [{ text: m.title }, { text: m.status }]),
    ];
    pptx.addSlide().addTable(mileRows, { x: 0.5, y: 0.5, w: 9, colW: [6, 2], fontSize: 12 });

    const dir = this.ensureDir();
    const filename = `${reportId}.pptx`;
    const filePath = join(dir, filename);
    await pptx.writeFile({ fileName: filePath });
    return `reports/${filename}`;
  }

  async generatePdf(projectId: string, reportId: string, orgId: string, title: string): Promise<string> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, orgId },
      include: {
        client: { select: { name: true } },
        tasks: { where: { deletedAt: null }, take: 30, select: { title: true, status: true } },
        milestones: { where: { deletedAt: null }, select: { title: true, status: true } },
      },
    });
    if (!project) throw new Error('Project not found');

    const dir = this.ensureDir();
    const filename = `${reportId}.pdf`;
    const filePath = join(dir, filename);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const stream = createWriteStream(filePath);
      doc.pipe(stream);
      doc.fontSize(22).text(title, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Project: ${project.name}`, { continued: false });
      doc.text(`Client: ${project.client?.name || '—'}`);
      doc.text(`Status: ${project.status} | Health: ${project.health} | Progress: ${project.progress}%`);
      doc.moveDown();
      doc.fontSize(14).text('Tasks', { underline: true });
      project.tasks.slice(0, 20).forEach((t) => doc.fontSize(10).text(`• ${t.title} [${t.status}]`));
      doc.moveDown();
      doc.fontSize(14).text('Milestones', { underline: true });
      project.milestones.forEach((m) => doc.fontSize(10).text(`• ${m.title} [${m.status}]`));
      doc.end();
      stream.on('finish', () => resolve(`reports/${filename}`));
      stream.on('error', reject);
    });
  }

  getFilePath(generatedFileKey: string): string {
    return join(process.cwd(), 'uploads', generatedFileKey);
  }
}
