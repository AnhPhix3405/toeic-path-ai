import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import { validateEnvironment } from './config/environment.validation';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import refreshCookieConfig from './modules/auth/config/refresh-cookie.config';
import authSessionCleanupConfig from './modules/auth/config/auth-session-cleanup.config';
import { UsersModule } from './modules/users/users.module';
import passwordResetConfig from './modules/auth/config/password-reset.config';
import { ProfileModule } from './modules/profile/profile.module';
import avatarConfig from './config/avatar.config';
import storageConfig from './config/storage.config';
import rateLimitConfig from './common/rate-limit/config/rate-limit.config';
import securityEventConfig from './common/security-events/security-event.config';
import { SecurityEventModule } from './common/security-events/security-event.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        databaseConfig,
        jwtConfig,
        refreshCookieConfig,
        authSessionCleanupConfig,
        passwordResetConfig,
        avatarConfig,
        storageConfig,
        rateLimitConfig,
        securityEventConfig,
      ],
      validate: validateEnvironment,
    }),
    ScheduleModule.forRoot(),
    SecurityEventModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.getOrThrow<string>('database.host'),
        port: configService.getOrThrow<number>('database.port'),
        username: configService.getOrThrow<string>('database.username'),
        password: configService.getOrThrow<string>('database.password'),
        database: configService.getOrThrow<string>('database.name'),
        ssl: configService.getOrThrow<boolean>('database.ssl')
          ? { rejectUnauthorized: false }
          : false,
        logging: configService.getOrThrow<boolean>('database.logging'),
        autoLoadEntities: true,
        synchronize: false,
        migrationsRun: false,
      }),
    }),
    HealthModule,
    AuthModule,
    UsersModule,
    ProfileModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
