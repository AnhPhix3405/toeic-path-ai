import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpErrorByCode } from '@nestjs/common/utils/http-error-by-code.util';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');

  const configService = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: {
        enableImplicitConversion:true,
      }
    })
  )

  const allowedOrigins = configService.get<string[]>('app.corsOrigins', [
    'http://localhost:3000',
  ]);

  app.enableCors({
      origin: (origin, callback) => {
        // 1. Cho phép Request không có header Origin (như Postman, cURL, Mobile App)
        // 2. Cho phép nếu Origin nằm trong danh sách Whitelist
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`CORS blocked for origin: ${origin}`), false);
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

  const port = configService.get<number>('app.port') || 3000;
  await app.listen(port);
}
bootstrap();
