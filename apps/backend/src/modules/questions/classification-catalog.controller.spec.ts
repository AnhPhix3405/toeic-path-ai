import { INestApplication, type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../common/enums/user-role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PolicyThrottlerGuard } from '../../common/rate-limit/guards/policy-throttler.guard';
import { ClassificationCatalogController } from './classification-catalog.controller';
import { ClassificationCatalogService } from './classification-catalog.service';

describe('ClassificationCatalogController', () => {
  let app: INestApplication<App>;
  let currentRole = UserRole.TEACHER;
  const service = {
    findToeicParts: jest.fn().mockResolvedValue([]),
    findTopics: jest.fn().mockResolvedValue([]),
    findSkills: jest.fn().mockResolvedValue([]),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ClassificationCatalogController],
      providers: [
        { provide: ClassificationCatalogService, useValue: service },
        JwtAuthGuard,
        RolesGuard,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext): boolean {
          const req = context.switchToHttp().getRequest<{
            headers: Record<string, string | undefined>;
            user: AuthenticatedUser;
          }>();
          if (req.headers.authorization !== 'Bearer access-token') {
            throw new UnauthorizedException();
          }
          req.user = {
            id: '20000000-0000-4000-8000-000000000002',
            sessionId: 'session-id',
            email: 'teacher@example.com',
            role: currentRole,
            status: UserStatus.ACTIVE,
          };
          return true;
        },
      })
      .overrideGuard(PolicyThrottlerGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  beforeEach(() => {
    currentRole = UserRole.TEACHER;
    jest.clearAllMocks();
  });

  it('allows Teachers and Admins to read every classification catalog', async () => {
    const auth = { Authorization: 'Bearer access-token' };
    await request(app.getHttpServer()).get('/api/v1/toeic-parts').set(auth).expect(200);
    await request(app.getHttpServer()).get('/api/v1/topics').set(auth).expect(200);
    currentRole = UserRole.ADMIN;
    await request(app.getHttpServer()).get('/api/v1/skills').set(auth).expect(200);
    expect(service.findToeicParts).toHaveBeenCalledTimes(1);
    expect(service.findTopics).toHaveBeenCalledTimes(1);
    expect(service.findSkills).toHaveBeenCalledTimes(1);
  });

  it('rejects unauthenticated users and Students', async () => {
    await request(app.getHttpServer()).get('/api/v1/topics').expect(401);
    currentRole = UserRole.STUDENT;
    await request(app.getHttpServer())
      .get('/api/v1/topics')
      .set('Authorization', 'Bearer access-token')
      .expect(403);
  });

  afterAll(async () => app.close());
});
