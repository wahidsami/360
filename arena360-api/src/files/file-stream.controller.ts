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

        // verifyStreamToken decodes the key from the token (base64 first segment)
        const key = this.storageService.verifyStreamToken(token);
        if (!key) {
            throw new ForbiddenException('Invalid or expired token');
        }

        // Look up file metadata for Content-Type and Filename
        const fileAsset = await this.prisma.fileAsset.findFirst({
            where: { storageKey: key }
        });

        const isDownload = download === 'true';
        const disposition = isDownload ? 'attachment' : 'inline';

        if (fileAsset) {
            // Ensure filename has an extension (fix for user report)
            let filename = fileAsset.filename;
            if (key.includes('.') && !filename.includes('.')) {
                const ext = key.split('.').pop();
                filename = `${filename}.${ext}`;
            }

            res.set({
                'Content-Type': fileAsset.mimeType,
                'Content-Disposition': `${disposition}; filename="${filename}"`,
            });
        } else {
            // Fallback for files without records
            res.set({
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': disposition
            });
        }

        const stream = this.storageService.getObjectStream(key);
        return new StreamableFile(stream);
    }
}
