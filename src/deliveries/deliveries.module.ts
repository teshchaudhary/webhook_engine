import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { DELIVERIES_REPOSITORY } from './application/ports/deliveries.repository';
import { GetDeliveryUseCase } from './application/use-cases/get-delivery.use-case';
import { ListDeliveriesUseCase } from './application/use-cases/list-deliveries.use-case';
import { ReplayDeliveryUseCase } from './application/use-cases/replay-delivery.use-case';
import { PrismaDeliveriesRepository } from './infrastructure/persistence/prisma-deliveries.repository';
import { DeliveriesController } from './presentation/http/deliveries.controller';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [
    PrismaModule,
    SecurityModule,
  ],
  controllers: [DeliveriesController],
  providers: [
    ListDeliveriesUseCase,
    GetDeliveryUseCase,
    ReplayDeliveryUseCase,
    {
      provide: DELIVERIES_REPOSITORY,
      useClass: PrismaDeliveriesRepository,
    },
  ],
})
export class DeliveriesModule {}
