import {
  INestApplication,
  type ExecutionContext,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { UserRole } from '../../common/enums/user-role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PolicyThrottlerGuard } from '../../common/rate-limit/guards/policy-throttler.guard';
import { QuestionStatus } from './enums/question-status.enum';
import { QuestionType } from './enums/question-type.enum';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';
import { QuestionDifficulty } from './enums/question-difficulty.enum';

describe('QuestionsController', () => {
  let app: INestApplication<App>;
  let currentRole = UserRole.TEACHER;
  const id = '10000000-0000-4000-8000-000000000001';
  const teacherId = '20000000-0000-4000-8000-000000000002';
  let currentUserId = teacherId;
  const response = {
    id,
    content: 'Where is the meeting being held?',
    questionType: QuestionType.SINGLE_CHOICE,
    status: QuestionStatus.DRAFT,
    createdAt: new Date('2026-09-15T00:00:00.000Z'),
    updatedAt: new Date('2026-09-15T00:00:00.000Z'),
  };
  const paginatedResponse = {
    data: [response],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };
  const service = {
    create: jest.fn().mockResolvedValue(response),
    findPaginated: jest.fn().mockResolvedValue(paginatedResponse),
    findAll: jest.fn().mockResolvedValue([response]),
    findOne: jest.fn().mockResolvedValue(response),
    update: jest.fn().mockResolvedValue({ ...response, content: 'Updated' }),
    updateClassification: jest.fn().mockResolvedValue(response),
    remove: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [QuestionsController],
      providers: [{ provide: QuestionsService, useValue: service }, JwtAuthGuard, RolesGuard],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext): boolean {
          const req = context.switchToHttp().getRequest<{
            headers: Record<string, string | undefined>;
            user: AuthenticatedUser;
          }>();
          if (req.headers.authorization !== 'Bearer access-token')
            throw new UnauthorizedException();
          req.user = {
            id: currentUserId,
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
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  beforeEach(() => {
    currentRole = UserRole.TEACHER;
    currentUserId = teacherId;
    jest.clearAllMocks();
  });

  it('runs the teacher CRUD flow and derives createdBy from the token', async () => {
    const auth = { Authorization: 'Bearer access-token' };
    await request(app.getHttpServer())
      .post('/api/v1/questions')
      .set(auth)
      .send({ content: `  ${response.content}  `, questionType: QuestionType.SINGLE_CHOICE })
      .expect(201);
    expect(service.create).toHaveBeenCalledWith(
      { content: response.content, questionType: QuestionType.SINGLE_CHOICE },
      teacherId,
    );
    const getRes = await request(app.getHttpServer()).get('/api/v1/questions').set(auth).expect(200);
    expect(getRes.body).toMatchObject({
      data: [{ id, content: response.content }],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    expect(service.findPaginated).toHaveBeenCalledWith({ page: 1, limit: 20 });

    await request(app.getHttpServer()).get(`/api/v1/questions/${id}`).set(auth).expect(200);
    await request(app.getHttpServer())
      .patch(`/api/v1/questions/${id}`)
      .set(auth)
      .send({ content: 'Updated' })
      .expect(200);
    expect(service.update).toHaveBeenCalledWith(id, { content: 'Updated' }, teacherId);
    await request(app.getHttpServer()).delete(`/api/v1/questions/${id}`).set(auth).expect(204);
    expect(service.remove).toHaveBeenCalledWith(id, teacherId);
  });

  it('parses and forwards search, filter, and pagination query params', async () => {
    const auth = { Authorization: 'Bearer access-token' };
    const topicId1 = '50000000-0000-4000-8000-000000000001';
    const topicId2 = '50000000-0000-4000-8000-000000000002';
    const skillId = '60000000-0000-4000-8000-000000000003';
    const partId = '40000000-0000-4000-8000-000000000004';

    await request(app.getHttpServer())
      .get(
        `/api/v1/questions?search=meeting&page=2&limit=10&topicIds=${topicId1},${topicId2}&skillIds=${skillId}&partId=${partId}&difficulty=${QuestionDifficulty.MEDIUM}`,
      )
      .set(auth)
      .expect(200);

    expect(service.findPaginated).toHaveBeenCalledWith({
      search: 'meeting',
      page: 2,
      limit: 10,
      topicIds: [topicId1, topicId2],
      skillIds: [skillId],
      partId,
      difficulty: QuestionDifficulty.MEDIUM,
    });
  });

  it('handles empty array query params gracefully without error', async () => {
    const auth = { Authorization: 'Bearer access-token' };
    await request(app.getHttpServer())
      .get('/api/v1/questions?topicIds=&skillIds=')
      .set(auth)
      .expect(200);

    expect(service.findPaginated).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
    });
  });

  it('rejects invalid query parameters', async () => {
    const auth = { Authorization: 'Bearer access-token' };

    // page < 1
    await request(app.getHttpServer()).get('/api/v1/questions?page=0').set(auth).expect(400);

    // limit > 100
    await request(app.getHttpServer()).get('/api/v1/questions?limit=101').set(auth).expect(400);

    // invalid difficulty enum
    await request(app.getHttpServer())
      .get('/api/v1/questions?difficulty=INVALID_DIFFICULTY')
      .set(auth)
      .expect(400);

    // invalid UUID partId
    await request(app.getHttpServer())
      .get('/api/v1/questions?partId=not-a-uuid')
      .set(auth)
      .expect(400);
  });

  it('allows Admin to read and create questions', async () => {
    currentRole = UserRole.ADMIN;
    currentUserId = '30000000-0000-4000-8000-000000000003';
    const auth = { Authorization: 'Bearer access-token' };

    await request(app.getHttpServer()).get('/api/v1/questions').set(auth).expect(200);
    await request(app.getHttpServer()).get(`/api/v1/questions/${id}`).set(auth).expect(200);
    await request(app.getHttpServer())
      .post('/api/v1/questions')
      .set(auth)
      .send({ content: 'Admin question', questionType: QuestionType.SINGLE_CHOICE })
      .expect(201);
    expect(service.create).toHaveBeenCalledWith(
      { content: 'Admin question', questionType: QuestionType.SINGLE_CHOICE },
      currentUserId,
    );
  });

  it('validates and forwards a complete classification update', async () => {
    const auth = { Authorization: 'Bearer access-token' };
    const classification = {
      partId: '40000000-0000-4000-8000-000000000004',
      topicIds: ['50000000-0000-4000-8000-000000000005'],
      skillIds: ['60000000-0000-4000-8000-000000000006'],
      difficulty: QuestionDifficulty.MEDIUM,
    };

    await request(app.getHttpServer())
      .put(`/api/v1/questions/${id}/classification`)
      .set(auth)
      .send(classification)
      .expect(200);
    expect(service.updateClassification).toHaveBeenCalledWith(id, classification, teacherId);

    await request(app.getHttpServer())
      .put(`/api/v1/questions/${id}/classification`)
      .set(auth)
      .send({
        ...classification,
        topicIds: [classification.topicIds[0], classification.topicIds[0]],
      })
      .expect(400);
  });

  it('rejects guests, students, malformed ids, invalid bodies, and client-managed fields', async () => {
    await request(app.getHttpServer()).get('/api/v1/questions').expect(401);
    currentRole = UserRole.STUDENT;
    await request(app.getHttpServer())
      .get('/api/v1/questions')
      .set('Authorization', 'Bearer access-token')
      .expect(403);
    currentRole = UserRole.TEACHER;
    await request(app.getHttpServer())
      .get('/api/v1/questions/not-a-uuid')
      .set('Authorization', 'Bearer access-token')
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/questions')
      .set('Authorization', 'Bearer access-token')
      .send({ content: '   ', questionType: 'unsupported', createdBy: teacherId })
      .expect(400);
  });

  afterAll(async () => app.close());
});
