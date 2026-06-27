export function generateTimestamp(): string {
  return new Date().toISOString();
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function paginate(
  page: number,
  limit: number,
  total: number,
): { skip: number; take: number; totalPages: number } {
  const safePage = Math.max(1, page);
  const safeLimit = clamp(limit, 1, 100);
  const totalPages = Math.ceil(total / safeLimit);
  const skip = (safePage - 1) * safeLimit;

  return { skip, take: safeLimit, totalPages };
}

export function isNullOrUndefined(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

export function isEmpty(value: string | unknown[] | null | undefined): boolean {
  if (isNullOrUndefined(value)) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}
