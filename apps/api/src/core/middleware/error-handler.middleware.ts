import type { ArgumentsHost} from '@nestjs/common';
import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';

@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: any = 'Internal server error';
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      message = typeof response === 'string' ? response : (response as any)?.message || response;
    }

    // Log error (but sanitize sensitive data)
    const isProduction = process.env.NODE_ENV === 'production';
    const sanitizedPath = this.sanitizePath(request.url);
    
    this.logger.error(
      `HTTP ${status} ${request.method} ${sanitizedPath}`,
      isProduction ? undefined : (exception as Error).stack,
    );

    // Don't expose stack traces in production
    const errorResponse: any = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: sanitizedPath,
      message: Array.isArray(message) ? message : [message],
    };

    if (!isProduction && exception.stack) {
      errorResponse.error = exception.message;
    }

    response.status(status).json(errorResponse);
  }

  private sanitizePath(path: string): string {
    // Remove sensitive query params
    try {
      const url = new URL(path, 'http://dummy');
      const sensitiveParams = ['token', 'refreshToken', 'password', 'secret', 'apiKey'];
      sensitiveParams.forEach(param => {
        if (url.searchParams.has(param)) {
          url.searchParams.set(param, '***');
        }
      });
      return url.pathname + url.search;
    } catch {
      return path.split('?')[0]; // Fallback: just return path without query
    }
  }
}