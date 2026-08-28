import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import appConfig from './config/app.config';
import { HealthModule } from './modules/health/health.module';
// import { TypeOrmModule } from '@nestjs/typeorm';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
    }),
    HealthModule,
    // TypeOrmModule.forRoot({
    //   type: 'postgres', // Hoặc 'mysql'
    //   host: 'localhost',
    //   port: 5432,
    //   username: 'postgres',
    //   password: 'yourpassword',
    //   database: 'my_database',
    //   entities: [__dirname + '/**/*.entity{.ts,.js}'],
    //   synchronize: true,
    // })
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
