export interface ISuccessResponse<T> {
  success: boolean;
  message: string;
  data: T;
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
