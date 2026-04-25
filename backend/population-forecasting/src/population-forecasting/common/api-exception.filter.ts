import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

type RequestWithId = Request & { requestId?: string };

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<RequestWithId>();
    const res = ctx.getResponse<Response>();
    const requestId = req.requestId ?? req.header('x-request-id') ?? 'unknown';

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      let message = exception.message;
      let errorCode = status === HttpStatus.BAD_REQUEST ? 'BAD_REQUEST' : 'HTTP_ERROR';
      let details: unknown;

      if (typeof response === 'string') {
        message = response;
      } else if (response && typeof response === 'object') {
        const record = response as Record<string, unknown>;
        message =
          typeof record.message === 'string'
            ? record.message
            : Array.isArray(record.message)
              ? record.message.join(', ')
              : message;
        errorCode =
          typeof record.errorCode === 'string'
            ? record.errorCode
            : typeof record.error === 'string'
              ? record.error
              : errorCode;
        details = record.details;
      }

      res.status(status).json({
        requestId,
        errorCode,
        message,
        details,
      });
      return;
    }

    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      requestId,
      errorCode: 'INTERNAL_ERROR',
      message: 'Unexpected server error',
    });
  }
}
