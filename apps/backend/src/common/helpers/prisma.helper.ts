export type PrismaEnum<T> = T extends string ? T : never;

export function prismaEnum<T>(value: T): PrismaEnum<T> {
  return value as PrismaEnum<T>;
}
