import { Module } from '@nestjs/common';
import { WikiService } from './wiki.service';
import { WikiController } from './wiki.controller';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [WikiController],
  providers: [WikiService],
  exports: [WikiService],
})
export class WikiModule {}
