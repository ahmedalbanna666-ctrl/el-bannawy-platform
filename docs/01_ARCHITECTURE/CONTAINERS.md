# CONTAINERS.md

# El-bannawy Platform
## Containerization Strategy

Version: 1.0.0

---

# Purpose

Defines Docker and container architecture.

---

# Containers

Frontend

Backend

PostgreSQL

Redis

BullMQ Worker

AI Worker

Nginx

Prometheus

Grafana

Loki

---

# Principles

One Service

One Container

Stateless Containers

Persistent Volumes

Immutable Images

---

# Image Rules

Minimal Base Images

Multi-stage Builds

Pinned Versions

No Development Dependencies

---

# Networking

Internal Docker Network

External HTTPS Only

---

# Volumes

Database

Redis

Logs

Uploads

Backups

---

# Restart Policy

Always

Except Development

---

# Health Checks

Every container must expose:

Liveness

Readiness

Startup

---

# Security

Non-root User

Read-only Filesystem

Image Scanning

Signed Images (Future)

---

# Acceptance Criteria

✓ Portable

✓ Secure

✓ Fast

✓ Scalable

---

# Final Rule

Containers must remain immutable, lightweight and independently deployable.

End of Document.