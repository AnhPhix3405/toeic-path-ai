import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ConsoleMailAdapter } from './console-mail.adapter';
import { BrevoMailAdapter } from './brevo-mail.adapter';
import { MAIL_SERVICE } from './mail.service';

@Module({
  imports: [ConfigModule],
  providers: [
    ConsoleMailAdapter,
    BrevoMailAdapter,
    {
      provide: MAIL_SERVICE,
      useFactory: (configService: ConfigService) => {
        const provider = configService.get<string>('mail.provider', 'console');
        if (provider === 'brevo') {
          return new BrevoMailAdapter(configService);
        }
        return new ConsoleMailAdapter();
      },
      inject: [ConfigService],
    },
  ],
  exports: [MAIL_SERVICE],
})
export class MailModule {}
