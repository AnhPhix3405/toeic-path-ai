export const MAIL_SERVICE = Symbol('MAIL_SERVICE');

export interface PasswordResetMailInput {
  recipientEmail: string;
  resetUrl: string;
  expiresAt: Date;
}

export interface MailService {
  sendPasswordResetEmail(input: PasswordResetMailInput): Promise<void>;
}
