import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class JsonExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        // Preserve the original error response for specific status codes
        if (
          status === HttpStatus.UNAUTHORIZED ||
          status === HttpStatus.CONFLICT ||
          status === HttpStatus.BAD_REQUEST
        ) {
          // Log for debugging EMAIL_NOT_VERIFIED
          if ((exceptionResponse as any)?.code === 'EMAIL_NOT_VERIFIED') {
            console.log('EMAIL_NOT_VERIFIED error being returned:', exceptionResponse);
          }
          return response.status(status).json(exceptionResponse);
        }
        message = (exceptionResponse as any).message || exception.message;
      }
    } else if (exception instanceof SyntaxError) {
      // Handle JSON parsing errors
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid JSON format in request body';
    } else if (exception instanceof Error) {
      // Handle other errors
      if (exception.message.includes('Unexpected token')) {
        status = HttpStatus.BAD_REQUEST;
        message = 'Invalid JSON format in request body';
      } else if (exception.message.includes('JSON')) {
        status = HttpStatus.BAD_REQUEST;
        message = 'Invalid JSON format in request body';
      } else {
        message = exception.message;
      }
    }

    // Log the error for debugging
    console.error('Exception caught by filter:', {
      message: exception instanceof Error ? exception.message : 'Unknown error',
      stack: exception instanceof Error ? exception.stack : undefined,
      url: request.url,
      method: request.method,
      body: request.body,
    });

    // Get appropriate error status text
    const getErrorStatusText = (statusCode: number): string => {
      const statusTexts: Record<number, string> = {
        [HttpStatus.BAD_REQUEST]: 'Bad Request',
        [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
        [HttpStatus.FORBIDDEN]: 'Forbidden',
        [HttpStatus.NOT_FOUND]: 'Not Found',
        [HttpStatus.CONFLICT]: 'Conflict',
        [HttpStatus.TOO_MANY_REQUESTS]: 'Too Many Requests',
        [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
      };
      return statusTexts[statusCode] || 'Internal Server Error';
    };

    response.status(status).json({
      statusCode: status,
      message,
      error: getErrorStatusText(status),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
