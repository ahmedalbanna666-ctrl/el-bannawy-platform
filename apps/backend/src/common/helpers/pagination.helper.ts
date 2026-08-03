export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function getPaginationParams(params: PaginationParams): { skip: number; take: number } {
  const page = Math.max(1, params.page ?? 1);
  const take = Math.min(100, Math.max(1, params.limit ?? 20));
  const skip = (page - 1) * take;
  return { skip, take };
}

export function paginatedResult<T>(data: T[], total: number, params: PaginationParams): PaginatedResult<T> {
  const page = Math.max(1, params.page ?? 1);
  const take = Math.min(100, Math.max(1, params.limit ?? 20));
  return {
    data,
    meta: {
      page,
      limit: take,
      total,
      totalPages: Math.ceil(total / take),
    },
  };
}
