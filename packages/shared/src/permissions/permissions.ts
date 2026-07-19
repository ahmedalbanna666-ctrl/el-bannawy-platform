export const PERMISSIONS = {
  USERS_VIEW: "users.view",
  USERS_CREATE: "users.create",
  USERS_EDIT: "users.edit",
  USERS_DELETE: "users.delete",

  UNITS_VIEW: "units.view",
  UNITS_CREATE: "units.create",
  UNITS_EDIT: "units.edit",
  UNITS_DELETE: "units.delete",

  LESSONS_VIEW: "lessons.view",
  LESSONS_CREATE: "lessons.create",
  LESSONS_EDIT: "lessons.edit",
  LESSONS_DELETE: "lessons.delete",

  VIDEOS_UPLOAD: "videos.upload",
  PDFS_UPLOAD: "pdfs.upload",

  VOCABULARY_MANAGE: "vocabulary.manage",
  HOMEWORK_MANAGE: "homework.manage",
  QUIZZES_MANAGE: "quizzes.manage",

  STORY_VIEW: "story.view",
  STORY_EDIT: "story.edit",
  STORY_PUBLISH: "story.publish",

  FINAL_REVIEW_VIEW: "final_review.view",
  FINAL_REVIEW_EDIT: "final_review.edit",

  LIVE_VIEW: "live.view",
  LIVE_CREATE: "live.create",
  LIVE_EDIT: "live.edit",
  LIVE_DELETE: "live.delete",
  LIVE_CONTROL: "live.control",

  STUDENTS_VIEW: "students.view",
  STUDENTS_CREATE: "students.create",

  AI_MANAGE: "ai.manage",

  REPORTS_VIEW: "reports.view",
  REPORTS_EXPORT: "reports.export",

  NOTIFICATIONS_SEND: "notifications.send",

  SETTINGS_MANAGE: "settings.manage",

  SUPPORT_ANSWER: "support.answer",

  LEARNING_ACCESS: "learning.access",

  MISTAKES_VIEW: "mistakes.view",
  MISTAKES_PRACTICE: "mistakes.practice",

  ROLES_MANAGE: "roles.manage",
  PLATFORM_MANAGE: "platform.manage",

  COINS_VIEW: "coins.view",
  COINS_MANAGE: "coins.manage",
  COINS_GRANT: "coins.grant",
  COINS_PURCHASE: "coins.purchase",
  COINS_UNLOCK: "coins.unlock",
  UNLOCK_CODES_MANAGE: "unlock_codes.manage",
  UNLOCK_REQUESTS_MANAGE: "unlock_requests.manage",

  COMPETITION_MANAGE: "competition.manage",
  COMPETITION_VIEW: "competition.view",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
