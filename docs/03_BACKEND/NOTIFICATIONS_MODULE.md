# Notifications Module

Version: 2.2.0
Source: `apps/backend/src/notifications`

## Responsibility

Persists in-app notifications, read state, soft deletion, notification preferences, admin notification configs/templates, device tokens, and WhatsApp delivery. Every persisted notification is also dispatched as an FCM push notification to the target user's registered devices.

## Persisted Models

| Model | Purpose |
|-------|---------|
| `Notification` | User notification with title, message, type, priority, channel, read state |
| `NotificationPreference` | Per-user toggle for each notification type (lesson, homework, live, etc.) |
| `NotificationConfig` | Admin global settings per notification type (isEnabled, channel) |
| `NotificationTemplate` | Pre-defined message templates with placeholders |
| `DeviceToken` | Per-user FCM device registration (token, platform, userAgent) |
| `WhatsAppConfig` | Singleton WhatsApp API configuration (provider, credentials) |
| `WhatsAppMessage` | Log of sent WhatsApp messages with delivery status |

## Current API Behavior

The controller exposes:

### User Endpoints
- `GET /notifications` — paginated list for current user
- `GET /notifications/preferences` — read user preferences
- `PATCH /notifications/preferences` — update user preferences
- `POST /notifications/device-token` — register an FCM device token
- `DELETE /notifications/device-token` — unregister an FCM device token
- `PATCH /notifications/read-all` — mark all as read
- `GET /notifications/:id` — single notification detail
- `PATCH /notifications/:id/read` — mark one as read
- `DELETE /notifications/:id` — soft delete

### Admin Endpoints (`ADMINISTRATOR` role)
- `GET /notifications/admin/config` — list all notification configs
- `PATCH /notifications/admin/config/:key` — toggle or change channel
- `GET /notifications/admin/templates` — list templates
- `PATCH /notifications/admin/templates/:key` — update template
- `GET /notifications/admin/whatsapp` — get WhatsApp settings
- `PATCH /notifications/admin/whatsapp` — update WhatsApp settings
- `GET /notifications/admin/whatsapp/logs` — paginated message logs
- `POST /notifications/admin/whatsapp/test` — send test message
- `POST /notifications/admin/push/test` — send a test FCM push to the caller's own registered devices

### Sender Endpoints (`TEACHER`, `SECRETARY`, `ADMINISTRATOR`)
- `POST /notifications/send` — send notification to target (all_students, grade, individual)
- `POST /notifications/schedule` — schedule notification for later delivery

## Scheduled Notifications (PMS §9.3)

Scheduled notifications use real `scheduledAt`/`sentAt` columns on `Notification`. `POST /notifications/schedule` persists rows with `scheduledAt` set and enqueues a delayed BullMQ job on the `scheduled-notifications` queue. The `ScheduledNotificationsProcessor` (BullMQ worker in `apps/backend/src/notifications/scheduled-notifications.processor.ts`) fires when the job is due, dispatches WhatsApp/Push channels, and sets `sentAt`. Rows are hidden from the inbox until `sentAt` is set (i.e. delivered). Dispatch is idempotent: rows already marked sent are skipped.

### Bulk Scheduling (`scheduleToUserIds`)

`NotificationsService.scheduleToUserIds(senderId, dto, userIds, scheduledAt)` schedules one notification to an **explicit list of users** with a single delayed BullMQ job — no role/grade target resolution. It de-duplicates the user list, applies per-type `NotificationPreference` filtering (users who opted out are dropped), and returns `{ scheduled: false, reason }` when no targets remain. Used by the live module to schedule session-start reminders for a session's subscribers.

### Analytics
- `GET /notifications/analytics` — total sent, read rate, delivery rate

## Delivery Channels

| Channel | Status |
|---------|--------|
| IN_APP (database) | ✅ Active |
| Firebase Push (FCM) | ✅ Active — every notification is pushed regardless of channel |
| WhatsApp | ✅ Architecture ready (Twilio REST API or custom HTTP provider) |
| Email | 🔧 Planned |
| SMS | 🔧 Planned |

## FCM Push (Firebase Cloud Messaging)

The `FcmService` initializes the Firebase Admin SDK from `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, and `NEXT_PUBLIC_FIREBASE_PROJECT_ID`. If those are missing the service logs a warning and push delivery is skipped.

### Behavior

- **Push for every notification** — `sendNotification` and `dispatchScheduled` send an FCM push to every target user who has a registered `DeviceToken`, regardless of the notification's channel. WhatsApp channel delivery still happens in addition.
- **Device tokens** — clients register/unregister tokens via `POST /notifications/device-token` and `DELETE /notifications/device-token`.
- **Invalid token cleanup** — when FCM reports an invalid/not-registered/mismatched token, the row is deleted automatically.
- **Test push** — `POST /notifications/admin/push/test` sends a test push to the calling admin's own devices so FCM can be verified end-to-end.
- **Push disabled gracefully** — if a user has no device tokens, push is skipped without error.

## WhatsApp Service

The `WhatsAppService` supports:
- **Twilio**: Via REST API (`api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json`) — no Twilio npm package needed
- **Custom HTTP provider**: Any API that accepts POST with JSON body `{to, message, phoneNumber}` and Bearer token auth

All sent messages are logged in `WhatsAppMessage` with delivery status tracking.

## Default Configs

The module seeds 7 default `NotificationConfig` entries on startup:
1. `live_session_reminder` — تذكير بالحصص المباشرة
2. `homework_reminder` — تذكير بالواجبات
3. `lesson_reminder` — تذكير بالحصص المسجلة
4. `report_ready` — التقارير الشهرية
5. `payment_receipt` — إيصالات الدفع
6. `achievement` — الإنجازات
7. `teacher_announcement` — إعلانات المعلم

Each has a corresponding `NotificationTemplate` with Arabic placeholders.

## Rules

- Users may access their own notification records.
- Notification operations must not expose secrets or private data.
- Admin endpoints require `ADMINISTRATOR` role.
- WhatsApp credentials are stored encrypted in the database (singleton row).
- List endpoints use pagination with configurable page/limit.

End of Document.
