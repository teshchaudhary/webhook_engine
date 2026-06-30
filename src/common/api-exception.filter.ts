import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request & { requestId?: string }>();
    const response = context.getResponse<Response>();
    const prismaCode =
      typeof exception === 'object' &&
      exception !== null &&
      'code' in exception &&
      typeof exception.code === 'string'
        ? exception.code
        : undefined;
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : prismaCode === 'P2002'
          ? HttpStatus.CONFLICT
          : prismaCode === 'P2025'
            ? HttpStatus.NOT_FOUND
            : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = exception instanceof HttpException ? exception.getResponse() : null;
    if (status >= 500) {
      this.logger.error(
        exception instanceof Error ? exception.message : String(exception),
        exception instanceof Error ? exception.stack : undefined,
      );
    }
    const message =
      typeof body === 'string'
        ? body
        : body && typeof body === 'object' && 'message' in body
          ? body.message
          : 'Internal server error';

    response.status(status).json({
      code:
        prismaCode === 'P2002'
          ? 'RESOURCE_ALREADY_EXISTS'
          : prismaCode === 'P2025'
            ? 'RESOURCE_NOT_FOUND'
            : body && typeof body === 'object' && 'error' in body
              ? String(body.error).toUpperCase().replaceAll(' ', '_')
              : status === 500
                ? 'INTERNAL_SERVER_ERROR'
                : `HTTP_${status}`,
      message:
        prismaCode === 'P2002'
          ? 'A resource with these unique values already exists'
          : prismaCode === 'P2025'
            ? 'The requested resource was not found'
            : message,
      requestId: request.requestId,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
