export interface ISuccessResponse<T, M = unknown> {
  success: boolean;
  message: string;
  data: T;
  meta?: M;
  timestamp: string;
}

export function successResponse<T>(data: T, message = "Success"): ISuccessResponse<T> {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
}

export function paginatedResponse<T>(
  data: T[],
  meta: { page: number; limit: number; total: number; totalPages: number },
  message = "Success",
): ISuccessResponse<T[], { page: number; limit: number; total: number; totalPages: number }> {
  return {
    success: true,
    message,
    data,
    meta,
    timestamp: new Date().toISOString(),
  };
}
