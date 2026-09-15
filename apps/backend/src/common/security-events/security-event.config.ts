import { registerAs } from '@nestjs/config';

export default registerAs('securityEvents', () => ({
  enabled: process.env.SECURITY_EVENT_LOGGING_ENABLED !== 'false',
  level: process.env.SECURITY_EVENT_LOG_LEVEL ?? 'info',
  hmacKey: process.env.SECURITY_EVENT_HMAC_KEY,
  userAgentMaxLength: Number(process.env.SECURITY_EVENT_USER_AGENT_MAX_LENGTH ?? 500),
  includeIp: process.env.SECURITY_EVENT_INCLUDE_IP !== 'false',
  loginFailureSampleRate: Number(process.env.SECURITY_EVENT_LOGIN_FAILURE_SAMPLE_RATE ?? 1),
}));
