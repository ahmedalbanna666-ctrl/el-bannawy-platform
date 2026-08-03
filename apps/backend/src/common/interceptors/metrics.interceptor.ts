import { Injectable, type NestInterceptor, type ExecutionContext, type CallHandler } from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { MetricsService } from "../services/metrics.service";

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ method: string; route?: { path: string } }>();
    const method = request.method;
    const route = request.route?.path ?? "unknown";
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse<{ statusCode: number }>();
          this.metrics.recordRequest(method, route, response.statusCode, Date.now() - start);
        },
        error: (err: { status?: number }) => {
          this.metrics.recordRequest(method, route, err.status ?? 500, Date.now() - start);
        },
      }),
    );
  }
}
