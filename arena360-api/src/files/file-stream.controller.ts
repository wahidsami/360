import { Controller, Get, Query, Res, StreamableFile, NotFoundException, ForbiddenException } from '@nestjs/common';
import { StorageService } from '../common/storage.service';
import { PrismaService } from '../common/prisma.service';
import type { Response } from 'express';

@Controller('files')
export class FileStreamController {
    constructor(
        private readonly storageService: StorageService,
        private readonly prisma: PrismaService
    ) { }

    @Get('stream')
    async streamFile(
        @Query('token') token: string,
        @Query('download') download: string,
        @Res() res: Response
    ): Promise<void> {
        if (!token) {
            throw new ForbiddenException('Missing token');
        }

        const key = this.storageService.verifyStreamToken(token);
        if (!key) {
            throw new ForbiddenException('Invalid or expired token');
        }

        const fileAsset = await this.prisma.fileAsset.findFirst({
            where: { storageKey: key }
        });

        const isDownload = download === 'true';

        // Resolve mime-type: Database -> Key extension mapping -> Fallback
        let mimeType = fileAsset?.mimeType || 'application/octet-stream';
        if (mimeType === 'application/octet-stream' && key.includes('.')) {
            const ext = key.split('.').pop()?.toLowerCase();
            const mimeMap: Record<string, string> = {
                'pdf': 'application/pdf',
                'png': 'image/png',
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'gif': 'image/gif',
                'webp': 'image/webp',
                'svg': 'image/svg+xml',
                'txt': 'text/plain',
                'mp4': 'video/mp4',
                'mp3': 'audio/mpeg'
            };
            if (ext && mimeMap[ext]) mimeType = mimeMap[ext];
        }

        // Set Headers
        res.setHeader('Content-Type', mimeType);

        // Security headers that help with inline rendering
        res.setHeader('X-Content-Type-Options', 'nosniff');

        let filename = fileAsset?.filename || 'file';
        if (key.includes('.') && !filename.includes('.')) {
            const ext = key.split('.').pop();
            filename = `${filename}.${ext}`;
        }

        if (isDownload) {
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
        } else {
            // For inline, we only send 'inline' to maximize browser compatibility for viewing
            res.setHeader('Content-Disposition', 'inline');
        }

        const stream = this.storageService.getObjectStream(key);

        stream.on('error', (err) => {
            console.error('Streaming error:', err);
            if (!res.headersSent) {
                res.status(500).send('Error streaming file');
            }
        });

        stream.pipe(res);
    }
}
