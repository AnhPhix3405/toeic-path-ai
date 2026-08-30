import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UserRole } from '../../common/enums/user-role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import { AuthSession } from '../auth/entities/auth-session.entity';
import type { QueryUsersDto } from './dto/query-users.dto';
import { User } from './entities/user.entity';

export interface SafeUser {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedUsers {
  data: SafeUser[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  findByEmail(email: string, includePassword = false): Promise<User | null> {
    const query = this.usersRepository
      .createQueryBuilder('user')
      .where('user.email = :email', { email });

    if (includePassword) {
      query.addSelect('user.passwordHash');
    }

    return query.getOne();
  }

  findById(id: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ id });
  }

  create(email: string, passwordHash: string): Promise<User> {
    return this.usersRepository.save(
      this.usersRepository.create({
        email,
        passwordHash,
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
      }),
    );
  }

  async updateLastLogin(id: string, date: Date): Promise<void> {
    await this.usersRepository.update(id, { lastLoginAt: date });
  }

  async findAll(query: QueryUsersDto): Promise<PaginatedUsers> {
    const builder = this.usersRepository.createQueryBuilder('user');
    if (query.search?.trim()) {
      builder.andWhere('user.email ILIKE :search', { search: `%${query.search.trim()}%` });
    }
    if (query.role) builder.andWhere('user.role = :role', { role: query.role });
    if (query.status) builder.andWhere('user.status = :status', { status: query.status });

    const [users, total] = await builder
      .orderBy('user.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return {
      data: users.map((user) => this.toSafeUser(user)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOneForAdmin(id: string): Promise<SafeUser> {
    const user = await this.findRequired(id);
    return this.toSafeUser(user);
  }

  async updateRole(id: string, role: UserRole, actorId: string): Promise<SafeUser> {
    if (id === actorId) throw new ConflictException('Administrators cannot change their own role');

    return this.dataSource.transaction(async (manager) => {
      await manager.query(`SELECT pg_advisory_xact_lock(hashtext('users-admin-role'))`);
      const repository = manager.getRepository(User);
      const user = await repository.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!user) throw new NotFoundException('User not found');
      if (user.role === role) return this.toSafeUser(user);

      if (user.role === UserRole.ADMIN && role !== UserRole.ADMIN) {
        const adminCount = await repository.count({ where: { role: UserRole.ADMIN } });
        if (adminCount <= 1)
          throw new ConflictException('The last administrator cannot be demoted');
      }
      user.role = role;
      const saved = await repository.save(user);
      await this.revokeActiveSessions(manager.getRepository(AuthSession), id);
      return this.toSafeUser(saved);
    });
  }

  async updateStatus(id: string, status: UserStatus, actorId: string): Promise<SafeUser> {
    if (id === actorId && status === UserStatus.LOCKED) {
      throw new ConflictException('Administrators cannot lock their own account');
    }
    return this.dataSource.transaction(async (manager) => {
      await manager.query(`SELECT pg_advisory_xact_lock(hashtext('users-admin-role'))`);
      const repository = manager.getRepository(User);
      const user = await repository.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!user) throw new NotFoundException('User not found');
      if (user.status === status) return this.toSafeUser(user);

      if (
        user.role === UserRole.ADMIN &&
        status === UserStatus.LOCKED &&
        (await repository.count({
          where: { role: UserRole.ADMIN, status: UserStatus.ACTIVE },
        })) <= 1
      ) {
        throw new ConflictException('The last active administrator cannot be locked');
      }

      user.status = status;
      const saved = await repository.save(user);
      if (status === UserStatus.LOCKED) {
        await this.revokeActiveSessions(manager.getRepository(AuthSession), id);
      }
      return this.toSafeUser(saved);
    });
  }

  private async findRequired(id: string): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private async revokeActiveSessions(repository: Repository<AuthSession>, userId: string) {
    await repository
      .createQueryBuilder()
      .update(AuthSession)
      .set({ revokedAt: new Date() })
      .where('user_id = :userId', { userId })
      .andWhere('revoked_at IS NULL')
      .execute();
  }

  private toSafeUser(user: User): SafeUser {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
