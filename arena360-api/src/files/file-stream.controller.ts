import { Controller, Get, Query, Res, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { StorageService } from '../common/storage.service';
import { PrismaService } from '../common/prisma.service';
import type { Response } from 'express';

@Controller('files')
export class FileStreamController {
    private readonly logger = new Logger(FileStreamController.name);

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

        let fileAsset = await this.prisma.fileAsset.findFirst({
            where: { storageKey: key }
        });

        if (!fileAsset && key.startsWith('temp/')) {
            // Virtual Asset for temp files (which don't have DB records)
            // Format: temp/orgId/timestamp_filename.ext OR temp/orgId/timestamp-random.ext
            const filenameMatch = key.match(/temp\/[^/]+\/\d+[_-](.+)$/);
            const filename = filenameMatch ? filenameMatch[1] : 'file';
            fileAsset = {
                filename,
                mimeType: null, // will be inferred from key extension
                sizeBytes: null, // we don't know it, but browser will handle it
                storageKey: key
            } as any;
        }

        if (!fileAsset) {
            this.logger.error(`FileAsset not found in DB for key: ${key}`);
            throw new NotFoundException('File not found');
        }

        const isDownload = download === 'true';

        // Resolve mime-type: Database -> Key extension mapping -> Fallback
        let mimeType = fileAsset.mimeType || 'application/octet-stream';
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
                'mp3': 'audio/mpeg',
                'html': 'text/html',
                'css': 'text/css',
                'js': 'text/javascript',
                'json': 'application/json'
            };
            if (ext && mimeMap[ext]) mimeType = mimeMap[ext];
        }

        this.logger.log(`📥 Stream request: ${key} | Download: ${isDownload} | MIME: ${mimeType} | Size: ${fileAsset.sizeBytes}`);

        // Set Headers
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
        res.setHeader('X-Content-Type-Options', 'nosniff');

        if (fileAsset.sizeBytes) {
            res.setHeader('Content-Length', fileAsset.sizeBytes.toString());
        }

        let filename = fileAsset.filename;
        if (key.includes('.') && !filename.includes('.')) {
            const ext = key.split('.').pop();
            filename = `${filename}.${ext}`;
        }

        if (isDownload) {
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
        } else {
            // Fix: Strict 'inline' without filename to ensure browser viewing
            res.setHeader('Content-Disposition', 'inline');
        }

        this.logger.log(`📤 Outgoing headers: Content-Type: ${mimeType}, Content-Disposition: ${res.getHeader('Content-Disposition')}`);

        try {
            const stream = this.storageService.getObjectStream(key);

            stream.on('error', (err) => {
                this.logger.error(`Streaming pipe error: ${key}`, err.stack);
                if (!res.headersSent) {
                    res.status(500).send('Error streaming file content');
                }
            });

            stream.pipe(res);
        } catch (error) {
            this.logger.error(`Failed to get object stream: ${key}`, error.stack);
            if (!res.headersSent) {
                res.status(404).send('File content not found in storage');
            }
        }
    }
}
