import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { AdminUsersController } from './admin-users.controller';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthSession } from '../auth/entities/auth-session.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, AuthSession])],
  controllers: [AdminUsersController],
  providers: [UsersService, JwtAuthGuard, RolesGuard],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
