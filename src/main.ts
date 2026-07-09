import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { json, Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { ApiExceptionFilter } from './common/api-exception.filter';
import { ConfigService } from './common/config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const config = app.get(ConfigService);

  app.use(json({ limit: config.maxRequestBodySize }));
  app.use((req: Request & { requestId?: string }, res: Response, next: NextFunction) => {
    req.requestId = req.header('x-request-id') ?? randomUUID();
    res.setHeader('x-request-id', req.requestId);
    next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.enableShutdownHooks();
  app.useGlobalFilters(new ApiExceptionFilter());

  if (config.isWorkerOnly) {
    await app.init();
    return;
  }
  await app.listen(config.port);
}
void bootstrap();
