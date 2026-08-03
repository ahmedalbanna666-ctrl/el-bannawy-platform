# Support Module

Version: 2.0.0
Source: `apps/backend/src/support`

## Responsibility

Provides user-created support tickets, ticket messages, assignment, status/priority updates, resolution, closure, and grade-level support contacts.

## Persisted Model

`SupportTicket` stores creator, role, category, priority, status, subject, description, assignment, resolution, and timestamps. `SupportMessage` stores sender, role, body, internal flag, and ticket relation.

## Current Workflow

```text
Authenticated user -> create ticket -> messages/update -> staff/admin resolution -> close
```

Users can read their own tickets. Support, staff, and administrators can resolve where the endpoint allows it. Assignment and visibility are enforced in the service; no general support dashboard analytics or incident/knowledge-base persistence exists.

## Grade Support Contacts

The separate grade-support controller/service manages support phone/email/WhatsApp fields attached to `Grade`. This is contact configuration, not an active WhatsApp delivery integration.

## Limitations

- Ticket lists are not paginated.
- User search, incidents, knowledge base, satisfaction analytics, attachments, and external communication are not current module features.
- Exact endpoint authorization remains the source of truth.

End of Document.
