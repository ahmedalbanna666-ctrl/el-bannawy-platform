import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Record<string, unknown>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<Record<string, unknown>> {
    return next.handle().pipe(
      map((data) => {
        if (data === null || data === undefined) {
          return { success: true, message: "Success", data: null, timestamp: new Date().toISOString() };
        }

        if (typeof data !== "object") {
          return { success: true, message: "Success", data, timestamp: new Date().toISOString() };
        }

        const obj = data as Record<string, unknown>;

        if ("success" in obj && "data" in obj && "timestamp" in obj) {
          return obj;
        }

        if ("data" in obj && "meta" in obj) {
          return {
            success: true,
            message: "Success",
            data: obj.data,
            meta: obj.meta,
            timestamp: new Date().toISOString(),
          };
        }

        return { success: true, message: "Success", data: obj, timestamp: new Date().toISOString() };
      }),
    );
  }
}
