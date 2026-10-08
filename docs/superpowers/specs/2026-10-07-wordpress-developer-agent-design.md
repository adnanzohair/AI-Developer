# AI WordPress Developer Agent: Foundation Design

## Goal

Turn the existing AI WordPress Agent plugin into an owner-operated developer agent. A user writes a normal WordPress-development request; the agent inspects the live site as needed, selects only registered tools, executes safe work automatically, requests confirmation for higher-risk work, verifies outcomes where possible, and records each run and reversible change.

## Existing Components Retained

- WordPress admin chat, projects, messages, attachments, tasks, and settings.
- Backend provider abstraction for Ollama, OpenAI, and Anthropic.
- DOCX post-import workflows.
- Scoped plugin/theme file reads and atomic writes.
- Existing change manifests and conflict-aware file rollback.

## Run Protocol

The plugin owns WordPress execution; the backend never accesses WordPress directly.

1. WordPress creates a run from the user prompt and a compact site summary.
2. Backend returns a bounded `next` instruction: inspect, execute one or more registered actions, request confirmation, or finish.
3. Plugin validates each action against its local registry, executes it, redacts results, records a run event, and returns the result bundle to the backend.
4. Backend decides the next instruction from the prompt, previous events, and results.
5. Plugin ends the run only on `finish`, a confirmation request, an action failure, or a safety/iteration limit.

The loop is `Command -> Inspect -> Decide -> Execute -> Verify -> Report`. The backend receives no raw file contents containing secrets, credentials, arbitrary database rows, or unrestricted logs.

## Shared Action Contract

Each backend action contains a tool name and JSON arguments. The plugin is authoritative: unknown tools, unsupported fields, invalid values, insufficient permissions, and policy violations fail before execution.

Each locally registered tool declares:

- unique name and human description;
- input validation;
- permission requirement (`read`, `development`, or `administrative`);
- risk (`safe`, `confirm`, or `blocked`);
- execute callback;
- result/error shape;
- optional rollback/change manifest.

The backend receives a generated capability manifest containing only metadata and input schemas. It cannot invent executable WordPress operations.

## Risk and Confirmation Policy

`safe` actions execute automatically: inspection, normal content/media/menu edits, and allow-listed settings changes.

`confirm` actions pause the run and display the action, reason, scope, and risk: plugin activation/installation, theme changes, code writes, user or role changes, bulk changes, destructive actions, and production-sensitive updates.

`blocked` actions never execute: shell commands, credentials/secrets, arbitrary SQL, unrestricted filesystem access, or targets outside the allow-listed WordPress scope.

## Phase 1 Modules

### Run and audit storage

Add run and run-event tables. A run stores project/user/prompt/status/summary/risk/final result/timestamps. Events record planning, inspection, action, confirmation, result, verification, and error payloads. Existing `changes` remains the rollback ledger and gains generic change-manifest support.

### Capability registry

Replace the content-only registry with a central registry that registers modules. It exposes a capability manifest, validates action schemas, applies risk policy, executes actions, and returns normalized redacted results.

### Site intelligence

Add on-demand inspection tools for WordPress/PHP/site URLs, active theme and child theme, installed/active plugins, registered post types, front page and page templates, menus, block areas/widgets, users/roles summaries, WooCommerce status, detected builders/forms/SEO plugins, safe error-log summary, and scoped theme/plugin file tree reads.

### First action modules

- Content: pages/posts/custom post types and existing DOCX workflows.
- Media: inspect, upload attachment metadata, assign featured image, update alt text.
- Navigation: inspect menus and add/update menu items.
- Settings: inspect/update allow-listed general and reading settings.
- Themes/files: inspect active theme/template hierarchy and scoped code changes with snapshots.
- Plugins: inspect; activation/deactivation is confirmation-gated. Installation is deferred unless a trusted local package/approved source mechanism is present.
- Users/roles: inspect; writes are confirmation-gated.
- Diagnostics: inspect safe debug/error summaries and plugin/theme source locations; never expose secrets.

## Adapter Model

Optional integrations are capability modules selected only after detection. WooCommerce, form plugins, SEO plugins, and builders report supported/unsupported status. An absent adapter must produce a clear result rather than a fabricated success. Elementor, Contact Form 7, Yoast, Rank Math, and WooCommerce are independent adapters.

## Verification

Mutating tools return a verification descriptor. The run engine automatically performs the descriptor's read action after mutation where available, records its result, and reports verified/unverified explicitly. A successful API call alone is not reported as a verified change.

## UI

The existing chat submits a run and displays status/events live through polling. The run view shows what was understood, inspection steps, executed tools, results, warnings, verification status, confirmation cards, errors, final report, and rollback links.

## Limits and Failure Handling

- Bound a run by action count and wall-clock duration.
- Stop on a registry validation, policy, or execution error; preserve all preceding events.
- Prevent repeated identical actions.
- Never automatically retry non-idempotent mutations.
- Store concise, user-readable errors plus structured internal details.

## Testing

- Backend unit tests for protocol parsing, capability filtering, risk handling, and malformed provider output.
- WordPress tests/stubs for registry validation, inspection tools, mutating tools, confirmation pause, audit recording, and rollback manifests.
- Manual localhost smoke tests for content/page/menu work, site inspection, confirmation flow, file-change rollback, and a known unsupported integration.

## Delivery Sequence

1. Run storage, protocol, registry, policy, events, and live UI state.
2. Site inspection and content/media/menu/settings capabilities.
3. Theme/file/plugin/user/diagnostic capabilities.
4. WooCommerce/forms/SEO/builder adapters, each based on installed-plugin detection.
