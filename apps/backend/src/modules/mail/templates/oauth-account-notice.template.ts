export interface OAuthAccountNoticeTemplateInput {
  provider: string;
}

export function renderOAuthAccountNoticeHtml(input: OAuthAccountNoticeTemplateInput): string {
  const providerName = input.provider || 'Google';

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thông báo tài khoản liên kết ${providerName} - TOEIC Path AI</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 0; }
    .container { max-width: 580px; margin: 30px auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; }
    .header { background: #2563eb; padding: 24px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; }
    .content { padding: 32px 24px; line-height: 1.6; }
    .alert-box { background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 4px; margin: 20px 0; }
    .footer { padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>TOEIC Path AI</h1>
    </div>
    <div class="content">
      <p>Xin chào,</p>
      <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản TOEIC Path AI liên kết với email này.</p>
      <div class="alert-box">
        <p style="margin: 0; font-weight: 600; color: #1e40af;">Tài khoản của bạn được đăng ký thông qua ${providerName}</p>
        <p style="margin: 8px 0 0 0; color: #1e3a8a; font-size: 14px;">Tài khoản này không sử dụng mật khẩu riêng của hệ thống. Do đó, bạn không cần phải đặt lại mật khẩu.</p>
      </div>
      <p>Để tiếp tục sử dụng dịch vụ, bạn chỉ cần chọn nút <strong>Đăng nhập bằng ${providerName}</strong> trên trang đăng nhập.</p>
      <p style="margin-top: 24px; color: #64748b; font-size: 14px;"><em>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email. Tài khoản của bạn vẫn được bảo vệ an toàn.</em></p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} TOEIC Path AI. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

export function renderOAuthAccountNoticeText(input: OAuthAccountNoticeTemplateInput): string {
  const providerName = input.provider || 'Google';

  return `[TOEIC Path AI] Thông báo về yêu cầu đặt lại mật khẩu

Xin chào,

Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản TOEIC Path AI liên kết với email này.

Tuy nhiên, tài khoản của bạn được đăng ký thông qua dịch vụ ${providerName} và không sử dụng mật khẩu riêng.

Vui lòng truy cập trang đăng nhập và chọn nút "Đăng nhập bằng ${providerName}" để tiếp tục sử dụng hệ thống.

Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email. Tài khoản của bạn vẫn được bảo mật an toàn.

Trân trọng,
Đội ngũ TOEIC Path AI
`;
}
