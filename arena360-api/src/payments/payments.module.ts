import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { InvoicesModule } from '../invoices/invoices.module';

@Module({
  imports: [InvoicesModule],
  controllers: [PaymentsController],
})
export class PaymentsModule {}
