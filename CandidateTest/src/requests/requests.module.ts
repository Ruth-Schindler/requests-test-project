import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { AuthenticationMiddleware } from './authentication.middleware';
import { RequestsController } from './requests.controller';
import { RequestRepository } from './request.repository';
import { RequestService } from './request.service';

@Module({
  controllers: [RequestsController],
  providers: [RequestRepository, RequestService],
})
export class RequestsModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(AuthenticationMiddleware)
      .exclude({ path: 'api/requests/test', method: RequestMethod.GET })
      .forRoutes({ path: 'api/requests', method: RequestMethod.GET });
  }
}