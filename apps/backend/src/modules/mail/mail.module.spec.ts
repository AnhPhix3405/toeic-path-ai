import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MailModule } from './mail.module';
import { MAIL_SERVICE, type MailService } from './mail.service';
import { ConsoleMailAdapter } from './console-mail.adapter';
import { BrevoMailAdapter } from './brevo-mail.adapter';

describe('MailModule Dynamic Factory Provider', () => {
  it('should provide ConsoleMailAdapter when mail.provider is "console"', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [MailModule],
    })
      .overrideProvider(ConfigService)
      .useValue({
        get: jest.fn((key: string, fallback?: unknown) => {
          if (key === 'mail.provider') return 'console';
          return fallback;
        }),
        getOrThrow: jest.fn((key: string) => {
          if (key === 'mail.brevoApiKey') return 'xkeysib-test-key';
          throw new Error(`Missing ${key}`);
        }),
      })
      .compile();

    const mailService = moduleRef.get<MailService>(MAIL_SERVICE);
    expect(mailService).toBeInstanceOf(ConsoleMailAdapter);
  });

  it('should provide BrevoMailAdapter when mail.provider is "brevo"', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [MailModule],
    })
      .overrideProvider(ConfigService)
      .useValue({
        get: jest.fn((key: string, fallback?: unknown) => {
          if (key === 'mail.provider') return 'brevo';
          if (key === 'mail.brevoApiKey') return 'xkeysib-test-key';
          if (key === 'mail.fromEmail') return 'auth@toeicpath.com';
          if (key === 'mail.fromName') return 'TOEIC Path AI';
          return fallback;
        }),
        getOrThrow: jest.fn((key: string) => {
          if (key === 'mail.brevoApiKey') return 'xkeysib-test-key';
          throw new Error(`Missing ${key}`);
        }),
      })
      .compile();

    const mailService = moduleRef.get<MailService>(MAIL_SERVICE);
    expect(mailService).toBeInstanceOf(BrevoMailAdapter);
  });

  it('should default to ConsoleMailAdapter when mail.provider is not set', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [MailModule],
    })
      .overrideProvider(ConfigService)
      .useValue({
        get: jest.fn((_key: string, fallback?: unknown) => fallback),
        getOrThrow: jest.fn((key: string) => {
          if (key === 'mail.brevoApiKey') return 'xkeysib-test-key';
          throw new Error(`Missing ${key}`);
        }),
      })
      .compile();

    const mailService = moduleRef.get<MailService>(MAIL_SERVICE);
    expect(mailService).toBeInstanceOf(ConsoleMailAdapter);
  });
});
