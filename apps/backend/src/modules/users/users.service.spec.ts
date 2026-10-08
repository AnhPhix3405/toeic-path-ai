import type { DataSource, Repository } from 'typeorm';
import { UserRole } from '../../common/enums/user-role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import { SecurityEventType } from '../../common/security-events/enums/security-event.enum';
import type { SecurityEventService } from '../../common/security-events/security-event.service';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

describe('UsersService security events', () => {
  const user = {
    id: '10000000-0000-4000-8000-000000000001',
    email: 'student@example.com',
    role: UserRole.STUDENT,
    status: UserStatus.ACTIVE,
    emailVerifiedAt: null,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;
  const usersRepository = {} as Repository<User>;
  const securityEvents = { warn: jest.fn() };

  beforeEach(() => jest.clearAllMocks());

  it('records actor, target, trace, and old/new role only after commit', async () => {
    const transactionUsers = {
      findOne: jest.fn().mockResolvedValue({ ...user }),
      save: jest.fn((value: User) => Promise.resolve(value)),
    };
    const sessionBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 2 }),
    };
    const dataSource = {
      transaction: jest.fn((work: (manager: unknown) => unknown) =>
        Promise.resolve(
          work({
            query: jest.fn(),
            getRepository: (entity: unknown) =>
              entity === User ? transactionUsers : { createQueryBuilder: () => sessionBuilder },
          }),
        ),
      ),
    };
    const service = new UsersService(
      usersRepository,
      dataSource as unknown as DataSource,
      securityEvents as unknown as SecurityEventService,
    );
    await service.updateRole(user.id, UserRole.TEACHER, 'admin-id', {
      traceId: 'trace-1',
      ipAddress: '127.0.0.1',
    });
    expect(securityEvents.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: SecurityEventType.USER_ROLE_CHANGED,
        actorUserId: 'admin-id',
        targetUserId: user.id,
        traceId: 'trace-1',
        metadata: { oldRole: UserRole.STUDENT, newRole: UserRole.TEACHER },
      }),
    );
  });

  it('does not record a success event when the transaction rolls back', async () => {
    const dataSource = { transaction: jest.fn().mockRejectedValue(new Error('rollback')) };
    const service = new UsersService(
      usersRepository,
      dataSource as unknown as DataSource,
      securityEvents as unknown as SecurityEventService,
    );
    await expect(
      service.updateStatus(user.id, UserStatus.LOCKED, 'admin-id', { traceId: 'trace-2' }),
    ).rejects.toThrow('rollback');
    expect(securityEvents.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: SecurityEventType.USER_ACCOUNT_LOCKED,
        result: 'failure',
        reasonCode: 'DATABASE_ERROR',
      }),
    );
    expect(securityEvents.warn).not.toHaveBeenCalledWith(
      expect.objectContaining({ result: 'success' }),
    );
  });

  describe('findById', () => {
    it('finds user by id without passwordHash by default', async () => {
      const mockRepo = {
        findOneBy: jest.fn().mockResolvedValue(user),
      };
      const service = new UsersService(mockRepo as unknown as Repository<User>, {} as DataSource);
      const result = await service.findById(user.id);
      expect(mockRepo.findOneBy).toHaveBeenCalledWith({ id: user.id });
      expect(result).toEqual(user);
    });

    it('finds user by id with passwordHash using query builder when includePassword is true', async () => {
      const userWithPassword = { ...user, passwordHash: 'hashed-password' };
      const qb = {
        where: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(userWithPassword),
      };
      const mockRepo = {
        createQueryBuilder: jest.fn().mockReturnValue(qb),
      };
      const service = new UsersService(mockRepo as unknown as Repository<User>, {} as DataSource);
      const result = await service.findById(user.id, true);
      expect(mockRepo.createQueryBuilder).toHaveBeenCalledWith('user');
      expect(qb.where).toHaveBeenCalledWith('user.id = :id', { id: user.id });
      expect(qb.addSelect).toHaveBeenCalledWith('user.passwordHash');
      expect(result).toEqual(userWithPassword);
    });
  });
});
