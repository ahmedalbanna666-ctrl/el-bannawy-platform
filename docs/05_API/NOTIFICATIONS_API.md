# Notifications API

Version: 2.0.0
Source: `apps/backend/src/notifications/notifications.controller.ts`
Base path: `/api/v1/notifications`

## User Endpoints

`GET /` — List current-user notifications

| Query | Type | Default | Description |
|-------|------|---------|-------------|
| filter | string | — | `unread`, `read`, or empty for all |
| page | number | 1 | Page number |
| limit | number | 20 | Items per page (max 100) |

Response: `paginatedResponse` with `{ id, title, message, type, priority, isRead, createdAt }[]`

---

`GET /preferences` — Read current-user notification preferences

`PATCH /preferences` — Update preferences (all fields optional boolean)

| Field | Description |
|-------|-------------|
| lessonReminders | تذكير بالحصص |
| homeworkReminders | تذكير بالواجبات |
| liveSessionReminders | تذكير بالحصص المباشرة |
| achievementNotifications | إشعارات الإنجازات |
| motivationalMessages | رسائل تحفيزية |
| studyTips | نصائح دراسية |
| teacherAnnouncements | إعلانات المعلم |

---

`PATCH /read-all` — Mark all notifications as read for current user

`GET /:notificationId` — Get single notification

`PATCH /:notificationId/read` — Mark one notification as read

`DELETE /:notificationId` — Soft-delete a notification

---

## Admin Endpoints (ADMINISTRATOR)

`GET /admin/config` — List all notification configs

`PATCH /admin/config/:key` — Update a notification config

| Body | Type | Description |
|------|------|-------------|
| isEnabled | boolean | Enable/disable this notification type |
| channel | string | Channel: `IN_APP`, `WHATSAPP`, `PUSH`, `EMAIL` |

---

`GET /admin/templates` — List all notification templates

`PATCH /admin/templates/:key` — Update a template's title/message

---

`GET /admin/whatsapp` — Get WhatsApp settings (safe fields only)

`PATCH /admin/whatsapp` — Update WhatsApp configuration

| Body | Type | Description |
|------|------|-------------|
| provider | string | `twilio` or custom |
| accountSid | string | Twilio Account SID |
| authToken | string | Twilio Auth Token |
| phoneNumber | string | WhatsApp sender number |
| apiKey | string | API key for custom provider |
| apiUrl | string | API endpoint for custom provider |
| isEnabled | boolean | Enable/disable WhatsApp |

---

`GET /admin/whatsapp/logs` — Get paginated WhatsApp message logs

`POST /admin/whatsapp/test` — Send a test WhatsApp message

| Body | Type | Description |
|------|------|-------------|
| to | string | Recipient phone number |
| message | string | Message text |

---

## Sender Endpoints

`POST /send` — Send notification (TEACHER, SECRETARY, ADMINISTRATOR)

| Body | Type | Description |
|------|------|-------------|
| type | string | Notification type |
| title | string | Notification title |
| message | string | Notification body |
| targetType | string | `all_students`, `grade`, `individual` |
| targetId | string? | Required for `grade` and `individual` |
| channel | string? | `IN_APP` (default), `WHATSAPP` |
| priority | string? | `LOW`, `MEDIUM` (default), `HIGH`, `URGENT` |

---

`POST /schedule` — Schedule notification (TEACHER, ADMINISTRATOR)

Same body as `POST /send` plus:
| Body | Type | Description |
|------|------|-------------|
| scheduledAt | string | ISO date string for scheduled delivery |

The endpoint persists `Notification` rows with `scheduledAt` set and enqueues a delayed BullMQ job on the `scheduled-notifications` queue. A `ScheduledNotificationsProcessor` worker dispatches WhatsApp/Push channels when the job fires and sets `sentAt`. Rows are hidden from the user inbox until `sentAt` is set (delivered). Dispatch is idempotent — already-sent rows are skipped.

---

## Analytics

`GET /analytics` — Notification analytics (ADMINISTRATOR)

Returns: `{ totalSent, totalRead, readRate, deliveryRate, failedCount }`

---

## Response Format

All endpoints return standard `ISuccessResponse`:

```json
{
  "success": true,
  "message": "...",
  "data": null,
  "timestamp": "2026-07-30T..."
}
```

Paginated endpoints return `paginatedResponse`:

```json
{
  "success": true,
  "message": "...",
  "data": [],
  "meta": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 },
  "timestamp": "2026-07-30T..."
}
```

End of Document.
