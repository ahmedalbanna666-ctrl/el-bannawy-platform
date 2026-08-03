import { Injectable } from "@nestjs/common";
import { Counter, Histogram, register } from "prom-client";

@Injectable()
export class MetricsService {
  private readonly httpRequestDuration: Histogram<string>;
  private readonly httpRequestTotal: Counter<string>;
  private readonly httpRequestErrors: Counter<string>;

  constructor() {
    register.clear();

    this.httpRequestDuration = new Histogram({
      name: "http_request_duration_ms",
      help: "HTTP request duration in milliseconds",
      labelNames: ["method", "route", "status"],
      buckets: [5, 10, 25, 50, 100, 200, 300, 500, 1000, 3000],
    });

    this.httpRequestTotal = new Counter({
      name: "http_requests_total",
      help: "Total number of HTTP requests",
      labelNames: ["method", "route"],
    });

    this.httpRequestErrors = new Counter({
      name: "http_request_errors_total",
      help: "Total number of HTTP request errors (5xx)",
      labelNames: ["method", "route"],
    });
  }

  recordRequest(method: string, route: string, statusCode: number, durationMs: number): void {
    this.httpRequestTotal.inc({ method, route });
    this.httpRequestDuration.observe({ method, route, status: String(statusCode) }, durationMs);
    if (statusCode >= 500) {
      this.httpRequestErrors.inc({ method, route });
    }
  }

  async getMetrics(): Promise<string> {
    return register.metrics();
  }
}
