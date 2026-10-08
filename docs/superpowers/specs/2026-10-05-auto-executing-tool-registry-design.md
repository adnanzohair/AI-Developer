# Auto-Executing Tool Registry — Design

## Goal

Turn AI WordPress Agent from a plan-only foundation into an owner-operated developer agent. A request from an authenticated site administrator is planned, validated, and executed automatically when it maps to supported tools. The system must produce a durable result instead of leaving tasks in `executing`.

## Authority and safety model

The AI provider proposes structured tool actions but never receives authority to execute them directly. WordPress owns tool registration, argument validation, capability checks, execution, audit data, and task-state changes.

Auto-execution is enabled for supported operations, subject to the configured plugin permission level and WordPress administrator capability. Unsupported, malformed, or disallowed actions fail the task with a clear error. The executor will not support arbitrary shell commands, raw SQL, arbitrary PHP execution, WordPress-core edits, or secret disclosure.

## Execution flow

1. The backend creates a strict plan with `actions`, rather than prose-only steps.
2. The plugin stores the plan and starts it automatically after planning succeeds.
3. A WordPress-side executor processes actions in sequence.
4. For each action, it resolves a named registered tool; validates its schema; checks the required permission; runs its WordPress API implementation; and records its result.
5. The task reaches `completed`, `partially_completed`, or `failed`, including progress, result data, and an actionable error when applicable.

Approval remains accepted by the API for compatibility, but will execute an old pending task rather than merely relabel it `executing`.

## Initial registry: content tools

The first delivery exposes these action names only:

- `find_posts`: Search posts by ID, title, slug, or limited text query.
- `create_post`: Create a post with a validated title, content, status, excerpt, and supported taxonomy IDs.
- `update_post`: Update explicitly supplied allowed post fields.
- `duplicate_post`: Resolve exactly one source post, duplicate its allowed fields and taxonomies, then apply an optional new title, content, or appended explanation.
- `trash_post`: Move a resolved post to Trash. It never permanently deletes a post.

`duplicate_post` uses native WordPress APIs (`get_post`, `wp_insert_post`, and taxonomy APIs) and returns the created post ID, edit URL, and title. An ambiguous title is an error rather than an arbitrary selection.

## Backend plan contract

The backend schema is extended so `plan.actions` is an array of:

```json
{
  "tool": "duplicate_post",
  "arguments": {
    "source": { "id": 123 },
    "new_title": "test",
    "append_content": "Explanation text"
  }
}
```

Only known tool names are accepted. The provider instructions require the appropriate action for supported content requests and no fabricated action names. The backend remains responsible for parsing and storing provider output; WordPress revalidates all tool names and arguments at execution time.

## Plugin components

- `AIWA_Tool_Registry`: Registers allowed tools with permission requirements and callbacks.
- `AIWA_Content_Tools`: Implements the initial content actions using WordPress APIs.
- `AIWA_Task_Executor`: Runs a task's actions, records progress/results/errors, and safely transitions state.
- `AIWA_REST_Controller`: Starts execution after task creation and during approval of legacy pending tasks, and exposes returned task details.

The registry pattern is intentionally extensible: later design, media, menu, settings, and existing file tools can register through the same validation/execution interface without changing task flow.

## Audit and rollback

Task data stores a structured execution result in the existing plan payload or a dedicated result field if a lightweight schema migration is needed. Every content mutation reports IDs and edit URLs. Existing file writes continue to use snapshot manifests and conflict-aware rollback. Post actions are audit-visible; content deletion is reversible through WordPress Trash.

## UI behavior

The Tasks view displays status, progress, individual action results, and errors. It should not show an approval control for new auto-executing tasks. Completed content actions link to the corresponding WordPress edit screen when available.

## Testing and verification

Backend tests cover the strict action-plan parse contract and malformed action failure. PHP tests or focused WordPress-level test harnesses cover registry validation, permission denial, duplicate success, ambiguous source failure, and state transitions. The existing TypeScript suite, typecheck, PHP syntax validation, and plugin installation smoke check must pass before release.
