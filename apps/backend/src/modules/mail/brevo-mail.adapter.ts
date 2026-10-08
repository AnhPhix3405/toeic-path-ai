import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  MailService,
  PasswordResetMailInput,
  OAuthAccountNoticeMailInput,
} from './mail.service';
import {
  renderPasswordResetHtml,
  renderPasswordResetText,
} from './templates/password-reset.template';
import {
  renderOAuthAccountNoticeHtml,
  renderOAuthAccountNoticeText,
} from './templates/oauth-account-notice.template';

@Injectable()
export class BrevoMailAdapter implements MailService {
  private readonly logger = new Logger(BrevoMailAdapter.name);
  private readonly apiKey: string;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly apiUrl = 'https://api.brevo.com/v3/smtp/email';
  private readonly timeoutMs = 5000;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = configService.getOrThrow<string>('mail.brevoApiKey');
    this.fromEmail = configService.get<string>('mail.fromEmail', 'noreply@toeicpath.com');
    this.fromName = configService.get<string>('mail.fromName', 'TOEIC Path AI');
  }

  async sendPasswordResetEmail(input: PasswordResetMailInput): Promise<void> {
    const htmlContent = renderPasswordResetHtml({
      resetUrl: input.resetUrl,
      expiresAt: input.expiresAt,
    });
    const textContent = renderPasswordResetText({
      resetUrl: input.resetUrl,
      expiresAt: input.expiresAt,
    });

    await this.sendMailPayload({
      recipientEmail: input.recipientEmail,
      subject: '[TOEIC Path AI] Đặt lại mật khẩu tài khoản của bạn',
      htmlContent,
      textContent,
      logLabel: 'Password reset email',
    });
  }

  async sendOAuthAccountNoticeEmail(input: OAuthAccountNoticeMailInput): Promise<void> {
    const provider = input.provider || 'Google';
    const htmlContent = renderOAuthAccountNoticeHtml({ provider });
    const textContent = renderOAuthAccountNoticeText({ provider });

    await this.sendMailPayload({
      recipientEmail: input.recipientEmail,
      subject: `[TOEIC Path AI] Thông báo về yêu cầu đặt lại mật khẩu cho tài khoản ${provider}`,
      htmlContent,
      textContent,
      logLabel: 'OAuth account notice email',
    });
  }

  private async sendMailPayload(params: {
    recipientEmail: string;
    subject: string;
    htmlContent: string;
    textContent: string;
    logLabel: string;
  }): Promise<void> {
    const payload = {
      sender: {
        email: this.fromEmail,
        name: this.fromName,
      },
      to: [
        {
          email: params.recipientEmail,
        },
      ],
      subject: params.subject,
      htmlContent: params.htmlContent,
      textContent: params.textContent,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorDetails = '';
        try {
          errorDetails = await response.text();
        } catch {
          errorDetails = response.statusText;
        }

        this.logger.error(
          `Brevo API rejected email to ${params.recipientEmail} with HTTP ${response.status}: ${errorDetails}`,
        );
        throw new Error(`Brevo mail delivery failed (status: ${response.status})`);
      }

      this.logger.log(`${params.logLabel} sent to ${params.recipientEmail} via Brevo`);
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        this.logger.error(
          `Brevo API request timed out after ${this.timeoutMs}ms for recipient ${params.recipientEmail}`,
        );
        throw new Error(`Brevo mail delivery error: Request timed out after ${this.timeoutMs}ms`);
      }

      if (error instanceof Error && error.message.startsWith('Brevo mail delivery failed')) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to send email to ${params.recipientEmail} via Brevo: ${errorMessage}`,
      );
      throw new Error(`Brevo mail delivery error: ${errorMessage}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
