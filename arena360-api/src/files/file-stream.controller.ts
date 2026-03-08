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
        @Res({ passthrough: true }) res: Response
    ): Promise<StreamableFile> {
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
        const disposition = isDownload ? 'attachment' : 'inline';

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

        if (fileAsset) {
            let filename = fileAsset.filename;
            if (key.includes('.') && !filename.includes('.')) {
                const ext = key.split('.').pop();
                filename = `${filename}.${ext}`;
            }

            const headers: Record<string, string> = {
                'Content-Type': mimeType,
            };

            // For inline viewing, some browsers handle 'inline' better than 'inline; filename=...'
            // We only add the filename if it's explicitly a download to ensure wide compatibility
            if (isDownload) {
                headers['Content-Disposition'] = `attachment; filename="${encodeURIComponent(filename)}"`;
            } else {
                headers['Content-Disposition'] = 'inline';
            }

            res.set(headers);
        } else {
            res.set({
                'Content-Type': mimeType,
                'Content-Disposition': disposition
            });
        }

        const stream = this.storageService.getObjectStream(key);
        return new StreamableFile(stream);
    }
}
