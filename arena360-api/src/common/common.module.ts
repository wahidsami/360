import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { StorageService } from './storage.service';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [PrismaService, StorageService],
  exports: [PrismaService, StorageService],
})
export class CommonModule { }
