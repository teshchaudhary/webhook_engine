import { Module } from '@nestjs/common';
import { SecurityModule } from '../security/security.module';
import { ENDPOINTS_REPOSITORY } from './application/ports/endpoints.repository';
import { CreateEndpointUseCase } from './application/use-cases/create-endpoint.use-case';
import { DeleteEndpointUseCase } from './application/use-cases/delete-endpoint.use-case';
import { ListEndpointsUseCase } from './application/use-cases/list-endpoints.use-case';
import { RotateEndpointSecretUseCase } from './application/use-cases/rotate-endpoint-secret.use-case';
import { UpdateEndpointUseCase } from './application/use-cases/update-endpoint.use-case';
import { PrismaEndpointsRepository } from './infrastructure/persistence/prisma-endpoints.repository';
import { EndpointsController } from './presentation/http/endpoints.controller';

@Module({
  imports: [SecurityModule],
  controllers: [EndpointsController],
  providers: [
    ListEndpointsUseCase,
    CreateEndpointUseCase,
    UpdateEndpointUseCase,
    DeleteEndpointUseCase,
    RotateEndpointSecretUseCase,
    {
      provide: ENDPOINTS_REPOSITORY,
      useClass: PrismaEndpointsRepository,
    },
  ],
})
export class EndpointsModule {}
