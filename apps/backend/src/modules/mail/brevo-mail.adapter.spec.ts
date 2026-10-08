import { ConfigService } from '@nestjs/config';
import { BrevoMailAdapter } from './brevo-mail.adapter';
import type { PasswordResetMailInput, OAuthAccountNoticeMailInput } from './mail.service';

describe('BrevoMailAdapter', () => {
  let adapter: BrevoMailAdapter;
  let configService: ConfigService;
  let fetchMock: jest.Mock;

  const mockInput: PasswordResetMailInput = {
    recipientEmail: 'student@example.com',
    resetUrl: 'http://localhost:3000/auth/reset-password?token=raw-token-123',
    expiresAt: new Date('2026-10-07T12:00:00.000Z'),
  };

  const mockOAuthInput: OAuthAccountNoticeMailInput = {
    recipientEmail: 'google.user@example.com',
    provider: 'Google',
  };

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string, fallback?: unknown) => {
        if (key === 'mail.brevoApiKey') return 'xkeysib-secret-api-key';
        if (key === 'mail.fromEmail') return 'auth@toeicpath.com';
        if (key === 'mail.fromName') return 'TOEIC Path AI';
        return fallback;
      }),
      getOrThrow: jest.fn((key: string) => {
        if (key === 'mail.brevoApiKey') return 'xkeysib-secret-api-key';
        if (key === 'mail.fromEmail') return 'auth@toeicpath.com';
        if (key === 'mail.fromName') return 'TOEIC Path AI';
        throw new Error(`Missing ${key}`);
      }),
    } as unknown as ConfigService;

    fetchMock = jest.fn();
    global.fetch = fetchMock;

    adapter = new BrevoMailAdapter(configService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should successfully send password reset email via Brevo REST API v3', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ messageId: '<123@brevo.com>' }),
    });

    await expect(adapter.sendPasswordResetEmail(mockInput)).resolves.not.toThrow();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(options.method).toBe('POST');
    expect(options.headers).toMatchObject({
      'api-key': 'xkeysib-secret-api-key',
      'Content-Type': 'application/json',
      accept: 'application/json',
    });

    const parsedBody = JSON.parse(options.body as string) as Record<string, unknown>;
    expect(parsedBody.sender).toEqual({
      email: 'auth@toeicpath.com',
      name: 'TOEIC Path AI',
    });
    expect(parsedBody.to).toEqual([{ email: 'student@example.com' }]);
    expect(parsedBody.subject).toBe('[TOEIC Path AI] Đặt lại mật khẩu tài khoản của bạn');
    expect(parsedBody.htmlContent).toContain(mockInput.resetUrl);
    expect(parsedBody.textContent).toContain(mockInput.resetUrl);
  });

  it('should successfully send OAuth account notice email via Brevo REST API v3', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ messageId: '<456@brevo.com>' }),
    });

    await expect(adapter.sendOAuthAccountNoticeEmail(mockOAuthInput)).resolves.not.toThrow();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(options.method).toBe('POST');

    const parsedBody = JSON.parse(options.body as string) as Record<string, unknown>;
    expect(parsedBody.to).toEqual([{ email: 'google.user@example.com' }]);
    expect(parsedBody.subject).toBe(
      '[TOEIC Path AI] Thông báo về yêu cầu đặt lại mật khẩu cho tài khoản Google',
    );
    expect(parsedBody.htmlContent).toContain('Google');
    expect(parsedBody.htmlContent).toContain('Đăng nhập bằng Google');
    expect(parsedBody.textContent).toContain('Google');
  });

  it('should throw an error when Brevo returns 401 Unauthorized (Invalid API Key)', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: () =>
        Promise.resolve(JSON.stringify({ code: 'unauthorized', message: 'Key not found' })),
    });

    await expect(adapter.sendPasswordResetEmail(mockInput)).rejects.toThrow(
      'Brevo mail delivery failed (status: 401)',
    );
  });

  it('should throw an error when Brevo returns 400 Bad Request', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: () =>
        Promise.resolve(JSON.stringify({ code: 'invalid_parameter', message: 'Invalid email' })),
    });

    await expect(adapter.sendPasswordResetEmail(mockInput)).rejects.toThrow(
      'Brevo mail delivery failed (status: 400)',
    );
  });

  it('should throw an error when Brevo request times out or network fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Connection timeout'));

    await expect(adapter.sendPasswordResetEmail(mockInput)).rejects.toThrow(
      'Brevo mail delivery error: Connection timeout',
    );
  });
});
