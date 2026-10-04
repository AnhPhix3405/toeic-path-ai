import { ApiAuthDoc } from './api-auth.decorator';
import { ApiErrorResponsesDoc } from './api-error-responses.decorator';

describe('Swagger Common Composite Decorators', () => {
  it('ApiAuthDoc should return a combined decorator', () => {
    const decorator = ApiAuthDoc({ summaryRoles: 'TEACHER, ADMIN' });
    expect(typeof decorator).toBe('function');
  });

  it('ApiErrorResponsesDoc should return a combined decorator for error statuses', () => {
    const decorator = ApiErrorResponsesDoc([400, 404]);
    expect(typeof decorator).toBe('function');
  });
});
