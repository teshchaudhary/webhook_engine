import { Module } from '@nestjs/common';
import { SecurityModule } from '../security/security.module';
import { EndpointsService } from './application/endpoints.service';
import { EndpointsController } from './presentation/http/endpoints.controller';

@Module({
  imports: [SecurityModule],
  controllers: [EndpointsController],
  providers: [EndpointsService],
})
export class EndpointsModule {}
