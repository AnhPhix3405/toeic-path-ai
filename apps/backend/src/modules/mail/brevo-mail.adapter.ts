import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { MailService, PasswordResetMailInput } from './mail.service';
import {
  renderPasswordResetHtml,
  renderPasswordResetText,
} from './templates/password-reset.template';

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

    const payload = {
      sender: {
        email: this.fromEmail,
        name: this.fromName,
      },
      to: [
        {
          email: input.recipientEmail,
        },
      ],
      subject: '[TOEIC Path AI] Đặt lại mật khẩu tài khoản của bạn',
      htmlContent,
      textContent,
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
          `Brevo API rejected email to ${input.recipientEmail} with HTTP ${response.status}: ${errorDetails}`,
        );
        throw new Error(
          `Brevo mail delivery failed (status: ${response.status})`,
        );
      }

      this.logger.log(`Password reset email sent to ${input.recipientEmail} via Brevo`);
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        this.logger.error(
          `Brevo API request timed out after ${this.timeoutMs}ms for recipient ${input.recipientEmail}`,
        );
        throw new Error(`Brevo mail delivery error: Request timed out after ${this.timeoutMs}ms`);
      }

      if (error instanceof Error && error.message.startsWith('Brevo mail delivery failed')) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to send email to ${input.recipientEmail} via Brevo: ${errorMessage}`,
      );
      throw new Error(`Brevo mail delivery error: ${errorMessage}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
