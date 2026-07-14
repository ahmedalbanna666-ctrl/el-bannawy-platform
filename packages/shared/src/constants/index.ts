export const API_VERSION = "v1";

export const API_BASE_URL = "/api/v1";

export const PAGINATION_DEFAULT_LIMIT = 20;

export const PAGINATION_MAX_LIMIT = 100;

export const RATE_LIMIT_AUTH = 10;

export const RATE_LIMIT_GENERAL = 100;

export const PASSWORD_MIN_LENGTH = 8;

export const TOUCH_TARGET_MIN_SIZE = 44;

export const FONT_SIZE_MIN = 14;

export const ANIMATION_DURATION_FAST = 150;

export const ANIMATION_DURATION_NORMAL = 250;

export const ANIMATION_DURATION_SLOW = 300;

export const RESPONSE_TIME_API_MS = 300;

export const RESPONSE_TIME_AI_MS = 3000;

export const RESPONSE_TIME_DASHBOARD_MS = 2000;

export const RESPONSE_TIME_DATABASE_MS = 100;

export enum UserRoleEnum {
  STUDENT = "student",
  TEACHER = "teacher",
  STAFF = "staff",
  SECRETARY = "secretary",
  SUPPORT = "support",
  ADMINISTRATOR = "administrator",
}

export const ROLE_LABELS: Record<string, string> = {
  ADMINISTRATOR: "مدير النظام",
  TEACHER: "معلم",
  STAFF: "موظف",
  STUDENT: "طالب",
  SECRETARY: "سكرتير",
  SUPPORT: "دعم فني",
};

export enum LessonStatusEnum {
  LOCKED = "locked",
  AVAILABLE = "available",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
}

export enum AccountStatusEnum {
  ACTIVE = "active",
  PENDING_VERIFICATION = "pending_verification",
  SUSPENDED = "suspended",
  DELETED = "deleted",
}
