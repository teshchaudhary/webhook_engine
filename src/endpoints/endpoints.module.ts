import { Module } from '@nestjs/common';
import { SecurityModule } from '../security/security.module';
import { ENDPOINTS_REPOSITORY } from './application/ports/endpoints.repository';
import { EndpointsService } from './application/endpoints.service';
import { PrismaEndpointsRepository } from './infrastructure/persistence/prisma-endpoints.repository';
import { EndpointsController } from './presentation/http/endpoints.controller';

@Module({
  imports: [SecurityModule],
  controllers: [EndpointsController],
  providers: [
    EndpointsService,
    {
      provide: ENDPOINTS_REPOSITORY,
      useClass: PrismaEndpointsRepository,
    },
  ],
})
export class EndpointsModule {}
