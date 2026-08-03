import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";

interface ErrorResponse {
  statusCode: number;
  success: false;
  message: string;
  error: string | null;
  timestamp: string;
  path: string;
  correlationId?: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Record<string, unknown>>();

    const httpStatus = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const isHttpException = exception instanceof HttpException;
    const message = isHttpException ? exception.message : "Internal server error";
    const isInternalServerError = httpStatus === 500;

    const path = typeof httpAdapter.getRequestUrl === "function" ? httpAdapter.getRequestUrl(request) as string : "";
    const correlationId = (request["x-correlation-id"] as string | undefined) ?? "-";

    const responseBody: ErrorResponse = {
      statusCode: httpStatus,
      success: false,
      message,
      error: isHttpException && !isInternalServerError ? exception.message : null,
      timestamp: new Date().toISOString(),
      path,
      correlationId,
    };

    if (isInternalServerError) {
      this.logger.error(
        `[${correlationId}] Internal Server Error: ${exception instanceof Error ? exception.message : "Unknown error"}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
