import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { json, Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { ApiExceptionFilter } from './common/api-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  app.use(json({ limit: process.env.MAX_REQUEST_BODY_SIZE ?? '256kb' }));
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

  if (process.env.PROCESS_ROLE === 'worker') {
    await app.init();
    return;
  }
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
