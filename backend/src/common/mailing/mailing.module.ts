import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailingService } from './mailing.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [MailingService],
  exports: [MailingService],
})
export class MailingModule {}
