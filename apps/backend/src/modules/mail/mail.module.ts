import { Module } from '@nestjs/common';
import { ConsoleMailAdapter } from './console-mail.adapter';
import { MAIL_SERVICE } from './mail.service';

@Module({
  providers: [ConsoleMailAdapter, { provide: MAIL_SERVICE, useExisting: ConsoleMailAdapter }],
  exports: [MAIL_SERVICE],
})
export class MailModule {}
