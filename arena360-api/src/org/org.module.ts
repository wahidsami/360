import { Module } from '@nestjs/common';
import { OrgService } from './org.service';
import { OrgController } from './org.controller';
import { PublicController } from './public.controller';
import { PrismaService } from '../common/prisma.service';

@Module({
  controllers: [OrgController, PublicController],
  providers: [OrgService, PrismaService],
  exports: [OrgService],
})
export class OrgModule {}
