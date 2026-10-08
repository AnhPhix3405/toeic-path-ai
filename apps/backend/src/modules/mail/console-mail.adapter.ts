import { Injectable, Logger } from '@nestjs/common';
import type {
  MailService,
  PasswordResetMailInput,
  OAuthAccountNoticeMailInput,
} from './mail.service';

@Injectable()
export class ConsoleMailAdapter implements MailService {
  private readonly logger = new Logger(ConsoleMailAdapter.name);

  sendPasswordResetEmail(input: PasswordResetMailInput): Promise<void> {
    void input;
    this.logger.log('Password reset email accepted by development mail adapter');
    return Promise.resolve();
  }

  sendOAuthAccountNoticeEmail(input: OAuthAccountNoticeMailInput): Promise<void> {
    void input;
    this.logger.log('OAuth account notice email accepted by development mail adapter');
    return Promise.resolve();
  }
}
