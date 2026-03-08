import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { FileStreamController } from './file-stream.controller';
import { FilesService } from './files.service';
import { PrismaService } from '../common/prisma.service';
import { StorageService } from '../common/storage.service';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [ConfigModule],
    controllers: [FilesController, FileStreamController],
    providers: [FilesService, StorageService, PrismaService]
})
export class FilesModule { }
