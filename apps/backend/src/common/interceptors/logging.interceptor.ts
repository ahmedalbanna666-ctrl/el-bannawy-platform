import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<{
      method: string;
      url: string;
      headers: Record<string, string>;
      user?: { userId?: string; role?: string };
    }>();
    const { method, url } = request;
    const correlationId = request.headers["x-correlation-id"] ?? uuidv4();
    const userId = request.user?.userId ?? "-";
    const role = request.user?.role ?? "-";
    const now = Date.now();

    request.headers["x-correlation-id"] = correlationId;

    return next.handle().pipe(
      tap({
        next: () => {
          const response = http.getResponse<{ statusCode: number }>();
          const duration = Date.now() - now;
          this.logger.log(`[${correlationId}] ${method} ${url} ${response.statusCode} ${duration}ms user=${userId} role=${role}`);
        },
        error: (err: { status?: number; message?: string }) => {
          const duration = Date.now() - now;
          this.logger.warn(`[${correlationId}] ${method} ${url} ${err.status ?? 500} ${duration}ms user=${userId} ${err.message ?? ""}`);
        },
      }),
    );
  }
}
