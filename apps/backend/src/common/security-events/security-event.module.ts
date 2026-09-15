import { Global, MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { SecurityEventService } from './security-event.service';
import { RequestContextMiddleware } from './request-context.middleware';

@Global()
@Module({
  providers: [SecurityEventService, RequestContextMiddleware],
  exports: [SecurityEventService],
})
export class SecurityEventModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
