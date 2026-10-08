import {
  renderOAuthAccountNoticeHtml,
  renderOAuthAccountNoticeText,
} from './oauth-account-notice.template';

describe('OAuth Account Notice Email Templates', () => {
  const provider = 'Google';

  describe('renderOAuthAccountNoticeHtml', () => {
    it('should generate valid HTML containing provider notice and no reset password link', () => {
      const html = renderOAuthAccountNoticeHtml({ provider });
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('TOEIC Path AI');
      expect(html).toContain('Google');
      expect(html).toContain('Đăng nhập bằng Google');
      expect(html).not.toContain('Đặt lại mật khẩu');
    });
  });

  describe('renderOAuthAccountNoticeText', () => {
    it('should generate plain text version containing provider guidance', () => {
      const text = renderOAuthAccountNoticeText({ provider });
      expect(text).toContain('TOEIC Path AI');
      expect(text).toContain('Google');
      expect(text).toContain('Đăng nhập bằng Google');
    });
  });
});
