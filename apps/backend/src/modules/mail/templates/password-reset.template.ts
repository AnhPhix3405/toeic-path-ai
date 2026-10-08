export interface PasswordResetTemplateInput {
  resetUrl: string;
  expiresAt: Date;
}

export function renderPasswordResetHtml(input: PasswordResetTemplateInput): string {
  const expiresFormatted = input.expiresAt.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  });

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Đặt lại mật khẩu TOEIC Path AI</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 0; }
    .container { max-width: 580px; margin: 30px auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; }
    .header { background: #2563eb; padding: 24px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; }
    .content { padding: 32px 24px; line-height: 1.6; }
    .btn-container { text-align: center; margin: 28px 0; }
    .btn { display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 15px; }
    .link-fallback { word-break: break-all; color: #64748b; font-size: 13px; background: #f1f5f9; padding: 12px; border-radius: 4px; margin-top: 16px; }
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
      <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản TOEIC Path AI của bạn. Hãy nhấp vào nút bên dưới để tiến hành thiết lập mật khẩu mới:</p>
      <div class="btn-container">
        <a href="${input.resetUrl}" class="btn" target="_blank">Đặt lại mật khẩu</a>
      </div>
      <p>Liên kết này sẽ hết hạn vào khoảng <strong>${expiresFormatted} (giờ Việt Nam)</strong>.</p>
      <p>Nếu bạn không thể nhấp vào nút trên, vui lòng sao chép và dán liên kết sau vào trình duyệt:</p>
      <div class="link-fallback">${input.resetUrl}</div>
      <p style="margin-top: 24px; color: #64748b; font-size: 14px;"><em>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này. Tài khoản của bạn vẫn được bảo mật an toàn.</em></p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} TOEIC Path AI. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

export function renderPasswordResetText(input: PasswordResetTemplateInput): string {
  return `[TOEIC Path AI] Yêu cầu đặt lại mật khẩu

Xin chào,

Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản TOEIC Path AI của bạn.

Vui lòng truy cập liên kết sau để thiết lập mật khẩu mới:
${input.resetUrl}

Liên kết này có hiệu lực trong 15 phút.

Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này. Tài khoản của bạn vẫn được bảo mật.

Trân trọng,
Đội ngũ TOEIC Path AI
`;
}
