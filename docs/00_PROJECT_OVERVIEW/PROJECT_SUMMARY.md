# Project Summary

El-bannawy is an English-learning platform for Arabic-speaking students. Its current release is a modular monolith with a web dashboard, an early Expo mobile client, a NestJS API, and a Prisma/PostgreSQL data layer.

## Current User Experience

Students can authenticate, select academic context, learn through units and lessons, watch provider-hosted videos, answer interactive activities, study structured vocabulary, complete homework/quizzes/assessments, review mistakes, use games, join competitions and live classes, track XP/achievements, use coins to unlock content, open support tickets, and chat with the AI assistant.

Teachers and administrators can manage curriculum, lesson content, DOCX imports, stories, final reviews, assessments, live sessions, reports, competitions, coins, activation codes, unlock requests, support contacts, and role-scoped permissions. Staff access is delegated by a managing teacher and constrained by both the staff capability ceiling and the teacher's effective permissions.

## Core Technical Flows

### Learning Content

```text
Academic context -> Grade -> Unit -> Lesson
                              |
                              +-> Videos -> Timeline events -> Activities
                              +-> Structured vocabulary
                              +-> Lesson document
                              +-> Homework / quiz / assessment
```

### Content Import

```text
DOCX upload -> extraction -> semantic table parsing -> preview/edit -> persistence
```

The import pipeline currently supports structured vocabulary and question preview/persistence. It does not mean every arbitrary DOCX layout is supported.

### Paid Access

```text
Coin package -> pending payment -> verification -> wallet credit
Student wallet -> lesson/unit unlock, or activation code -> content unlock
```

## Current Limitations

- The mobile app is an initial client, not a feature-complete parity client.
- AI uses a configurable OpenAI-compatible endpoint and rule-based fallback; RAG, embeddings, and pgvector retrieval are not wired.
- Redis and BullMQ are present in local infrastructure configuration but are not used by the application runtime.
- Notification persistence is implemented; external push/email/WhatsApp delivery is not a complete integration.
- Operational hardening and production observability remain open work.

End of Document.
