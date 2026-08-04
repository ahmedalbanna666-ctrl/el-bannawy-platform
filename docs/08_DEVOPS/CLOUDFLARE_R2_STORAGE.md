# CLOUDFLARE_R2_STORAGE.md

# El-bannawy Platform
## Cloudflare R2 File Storage

Version: 1.0.0

---

# Purpose

Documents how uploaded files (lesson documents, saved documents, certificates, UI images, AI knowledge-base files) are stored in Cloudflare R2.

---

# How It Works

All uploads flow through the `FileStorage` abstraction (`apps/backend/src/common/storage/`):

- `LocalFileStorage` — default backend; writes to `uploads/` on the container filesystem.
- `R2FileStorage` — used when all four `R2_*` environment variables are present.
- `StorageModule` selects the backend at bootstrap time.

The stored `fileUrl` values are identical across backends (`/files/<category>/<name>`), so existing database rows and client URLs keep working unchanged.

Categories:

| Category | Contents |
| --- | --- |
| `documents` | Lesson PDFs / DOCX |
| `saved-documents` | Student-saved lesson documents |
| `certificates` | Generated unit certificates (PDF) |
| `ui` | Admin-uploaded UI images (sidebar/background) |
| `ai-knowledge` | AI knowledge-base uploads |

---

# Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `R2_ACCOUNT_ID` | Yes (to enable R2) | Cloudflare account ID from the R2 dashboard |
| `R2_ACCESS_KEY_ID` | Yes | R2 API token Access Key ID |
| `R2_SECRET_ACCESS_KEY` | Yes | R2 API token Secret Access Key |
| `R2_BUCKET` | Yes | Bucket name (must already exist) |

When any variable is missing, the platform falls back to local disk.

---

# Setting Up

1. In the Cloudflare dashboard, open **R2** → **Create bucket** and note the bucket name.
2. Open **R2** → **Manage R2 API Tokens** → **Create API Token** (Object Read & Write, scoped to the bucket).
3. Copy the Account ID, Access Key ID and Secret Access Key.
4. Set the four `R2_*` variables in the deployed environment (e.g. Railway service variables).
5. Deploy the backend and restart it. The `StorageModule` detects R2 at bootstrap.

---

# Object Keys

R2 object keys mirror the `fileUrl` path without the `/files/` prefix:

```
documents/<id>.pdf
saved-documents/<userId>-<lessonId>.pdf
certificates/<userId>-<unitId>.pdf
ui/<kind>-<timestamp>.png
ai-knowledge/<timestamp>-<random>.pdf
```

---

# Serving Files

`main.ts` registers a `/files/:category/:name` handler that streams stored files through `FileStorage`, so:

- Local backend: files are read from disk under `uploads/`.
- R2 backend: files are fetched from the R2 bucket over the S3 API.

Private routes (`/lessons/:id/document`, `/saved-documents/:id/download`, `/certificates/:id/download`, etc.) read through the same abstraction and are not affected.

---

# Migration From Local Disk

New uploads go to R2 as soon as the env vars are set. Previously uploaded local files are not automatically migrated; to migrate:

1. Upload the local `uploads/*` trees into the corresponding R2 bucket keys.
2. Verify `fileUrl` values in the database already match `/files/<category>/<name>` (they do for local-backed writes).

No code or URL changes are required for existing rows.

---

# Security

- Files are private by default (R2 buckets are not publicly exposed).
- All file access is authenticated through the API endpoints or the same-origin `/files/...` handler.
- API tokens should be scoped to the bucket only (least privilege).

---

# Verification

```powershell
# Backend up
GET /api/v1/home/health   -> {"status":"ok"}

# Upload a lesson document, then:
GET /lessons/{id}/document -> 200 (streamed PDF)

# UI image upload returns /files/ui/<name>; fetch it:
GET /files/ui/<name>       -> 200 (image)
```

Check backend logs for `R2` selection: `StorageModule` logs when R2 is configured.

End of Document.
