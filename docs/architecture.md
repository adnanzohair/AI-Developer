# Architecture

```text
WordPress admin UI
       │ authenticated WP REST + nonce
       ▼
WordPress control plane ── scoped tools / snapshots / audit log
       │ shared-secret HTTPS
       ▼
Agent backend ── provider adapter ── OpenAI or Anthropic
```

The backend may reason and propose tool calls, but WordPress owns authorization and execution. A provider response can never grant itself permissions. Tasks move through `planning → awaiting_approval → executing`; V1 records approval but intentionally has no autonomous execution worker.

Custom tables are created with the site prefix: `aiwa_projects`, `aiwa_messages`, `aiwa_changes`, and `aiwa_tasks`. They isolate project memory, chat history, reversible change manifests, and durable work state.

The file boundary currently permits only `wp-content/plugins/` and `wp-content/themes/`. Canonical paths are checked after resolution to prevent traversal and symlink escapes.
