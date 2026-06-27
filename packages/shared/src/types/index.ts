export type IUserRole = "student" | "teacher" | "secretary" | "support" | "administrator";

export interface IUser {
  readonly id: string;
  readonly role: IUserRole;
  readonly fullName: string;
  readonly mobileNumber: string;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface IStandardResponse<T = unknown> {
  readonly success: boolean;
  readonly message: string;
  readonly data: T;
  readonly timestamp: string;
}

export interface IErrorResponse {
  readonly success: false;
  readonly message: string;
  readonly error: string;
  readonly statusCode: number;
  readonly timestamp: string;
}

export interface IPaginationParams {
  readonly page: number;
  readonly limit: number;
  readonly sort?: string;
  readonly order?: "asc" | "desc";
  readonly search?: string;
}

export interface IPaginationMeta {
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
}

export interface IPaginatedResponse<T> {
  readonly data: T[];
  readonly meta: IPaginationMeta;
}
