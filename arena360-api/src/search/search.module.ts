import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { PrismaService } from '../common/prisma.service';

@Module({
  controllers: [SearchController],
  providers: [SearchService, PrismaService],
  exports: [SearchService],
})
export class SearchModule {}
