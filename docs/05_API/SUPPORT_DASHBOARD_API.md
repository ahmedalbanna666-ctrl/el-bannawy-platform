# Support API

Version: 2.0.0
Source: `apps/backend/src/support`

## Base And Authorization

Base path: `/api/v1/support`

Routes require JWT and the roles guard. A user can create/read their own tickets. Resolution is explicitly allowed for `ADMINISTRATOR`, `SUPPORT`, and `STAFF`.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/tickets` | List tickets with optional status, priority, category, and assigned-agent filters |
| GET | `/tickets/:ticketId` | Read ticket and messages |
| POST | `/tickets` | Create ticket: subject, description, optional category/priority |
| POST | `/tickets/:ticketId/messages` | Add user/agent message; internal flag is service-controlled |
| PATCH | `/tickets/:ticketId` | Update status, priority, or assignment |
| POST | `/tickets/:ticketId/resolve` | Resolve with resolution text; ADMINISTRATOR/SUPPORT/STAFF |
| POST | `/tickets/:ticketId/close` | Close ticket |

## Grade Support Contacts

The separate base path `/api/v1/grade-support` exposes grade contact management. Verify `grade-support-contact.controller.ts` before adding a client route.

## Not Current API

The original dashboard proposal paths for incidents, knowledge base, user search, analytics, reports, profile, and ticket assignment are not exposed by the current controller.

End of Document.
