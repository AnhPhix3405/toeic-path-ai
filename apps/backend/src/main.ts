import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { DataSource } from 'typeorm';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';

interface DatabaseCheckResult {
  database: string;
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const configService = app.get(ConfigService);
  const bodyLimit = configService.get<string>('app.jsonBodyLimit', '16kb');
  app.use(json({ limit: bodyLimit }));
  app.use(urlencoded({ limit: bodyLimit, extended: true }));
  app.use(cookieParser());
  app.setGlobalPrefix('api/v1');
  const trustProxyHops = configService.get<number>('app.trustProxyHops', 0);
  if (trustProxyHops > 0) {
    const expressApplication = app.getHttpAdapter().getInstance() as {
      set(name: string, value: number): void;
    };
    expressApplication.set('trust proxy', trustProxyHops);
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const allowedOrigins = configService.get<string[]>('app.corsOrigins', ['http://localhost:3000']);

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      // 1. Cho phép Request không có header Origin (như Postman, cURL, Mobile App)
      // 2. Cho phép nếu Origin nằm trong danh sách Whitelist
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true, // Cho phép gửi Cookie / Authorization headers
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  const enableSwagger = configService.get<boolean>('app.enableSwagger', true);

  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('Toeic Path AI API Documentation')
      .setDescription('Tài liệu API hệ thống học tập Toeic Path AI')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Nhập JWT token vào đây',
          in: 'header',
        },
        'JWT-auth', // Tên Security Scheme dùng cho decorator @ApiBearerAuth()
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);

    // Đường dẫn truy cập Swagger UI: http://localhost:3000/api/docs
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true, // Giữ token Authorization khi reload lại trang
      },
    });
  }

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.enableShutdownHooks();

  const dataSource = app.get(DataSource);
  const rows: unknown = await dataSource.query('SELECT current_database() AS database');

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('Database connection check returned no result');
  }

  const [{ database }] = rows as DatabaseCheckResult[];
  Logger.log(`TypeORM connected successfully to PostgreSQL database "${database}"`, 'Database');

  const port = configService.get<number>('app.port') || 3000;
  await app.listen(port);
}
void bootstrap();
