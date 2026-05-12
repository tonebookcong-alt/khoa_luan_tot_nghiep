import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    // Trải phẳng response: giữ nguyên object payload (vd ConflictException trả {conversationId})
    // nhưng đảm bảo `message` luôn là string/string[] để frontend render được
    const isObj = typeof message === 'object' && message !== null;
    const extra: Record<string, unknown> = isObj ? { ...(message as object) } : {};
    let messageField: string | string[];
    if (typeof message === 'string') {
      messageField = message;
    } else if (isObj && 'message' in (message as object)) {
      const m = (message as { message: unknown }).message;
      messageField = typeof m === 'string' || Array.isArray(m) ? (m as string | string[]) : JSON.stringify(m);
      delete extra.message;
    } else {
      // Object không có field `message` (vd: { conversationId: 'xxx' })
      // → fallback message generic, vẫn giữ payload trong các field gốc
      messageField = `HTTP ${status}`;
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...extra,
      message: messageField,
    });
  }
}
