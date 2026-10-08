# API

All WordPress routes use `/wp-json/ai-agent/v1` and require an authenticated administrator (`manage_options`). Browser requests also use the WordPress REST nonce.

| Method | Route | Purpose |
|---|---|---|
| GET | `/site` | Redacted site intelligence |
| GET/POST | `/projects` | List/create owned projects |
| GET/POST | `/projects/{id}/messages` | Conversation history |
| POST | `/files/read` | Read a scoped file (1 MB limit) |
| POST | `/files/write` | Atomic reviewed write (2 MB limit) |
| GET | `/changes` | Change history |
| POST | `/changes/{id}/rollback` | Conflict-aware rollback |
| GET/POST | `/tasks` | List/create planning tasks |
| POST | `/tasks/{id}/approve` | Execute a legacy pending task |
| POST | `/attachments` | Upload a project-scoped DOCX or image attachment |
| GET | `/projects/{id}/attachments` | List owned project attachments |
| GET/POST | `/settings` | Non-secret settings and token update |

The backend exposes `GET /health`, `POST /v1/tasks`, `GET /v1/tasks/{id}`, and `POST /v1/tasks/{id}/approve`. Except for health, requests require `X-AIWA-Secret`.

Supported content plans execute automatically after planning. Current actions are `find_posts`, `create_post`, `update_post`, `duplicate_post`, and `trash_post`; mutation actions require the plugin permission level `development`. Task rows return `completed`, `partially_completed`, or `failed` together with progress, results, and errors.

`import_document_draft` creates a draft only. Upload one DOCX and optionally images; one image is used as the featured image automatically, while multiple images require selection in the chat UI.
