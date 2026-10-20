import rateLimitConfig from './rate-limit.config';

describe('rateLimitConfig', () => {
  it('should configure questionsReviews policy with ttl 60s, max 60 user requests, max 120 ip requests', () => {
    const config = rateLimitConfig() as any;
    expect(config.questionsReviews).toBeDefined();
    expect(config.questionsReviews.ttl).toBe(60);
    expect(config.questionsReviews.user).toBe(60);
    expect(config.questionsReviews.ip).toBe(120);
  });

  it('should load default rate limit configuration for examsMutate', () => {
    const config = rateLimitConfig() as any;
    expect(config.examsMutate).toEqual({
      ttl: 60,
      user: 30,
      ip: 60,
    });
  });
});
