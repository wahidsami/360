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

        if (fileAsset) {
            res.set({
                'Content-Type': fileAsset.mimeType,
                'Content-Disposition': `attachment; filename="${fileAsset.filename}"`,
            });
        } else {
            res.set({ 'Content-Type': 'application/octet-stream' });
        }

        const stream = this.storageService.getObjectStream(key);
        return new StreamableFile(stream);
    }
}
