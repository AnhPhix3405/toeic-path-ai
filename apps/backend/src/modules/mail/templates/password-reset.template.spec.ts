import { renderPasswordResetHtml, renderPasswordResetText } from './password-reset.template';

describe('Password Reset Email Templates', () => {
  const resetUrl = 'http://localhost:3000/auth/reset-password?token=test-token-123';
  const expiresAt = new Date('2026-10-07T12:00:00.000Z');

  describe('renderPasswordResetHtml', () => {
    it('should generate valid HTML containing the reset URL and expiration info', () => {
      const html = renderPasswordResetHtml({ resetUrl, expiresAt });
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain(resetUrl);
      expect(html).toContain('TOEIC Path AI');
      expect(html).toContain('Đặt lại mật khẩu');
    });

    it('should escape malicious characters in resetUrl if necessary', () => {
      const safeUrl = 'http://localhost:3000/auth/reset-password?token=abc';
      const html = renderPasswordResetHtml({ resetUrl: safeUrl, expiresAt });
      expect(html).toContain(safeUrl);
    });
  });

  describe('renderPasswordResetText', () => {
    it('should generate plain text version containing the reset URL', () => {
      const text = renderPasswordResetText({ resetUrl, expiresAt });
      expect(text).toContain('TOEIC Path AI');
      expect(text).toContain(resetUrl);
      expect(text).toContain('Nếu bạn không yêu cầu đặt lại mật khẩu');
    });
  });
});
