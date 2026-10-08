# AI WordPress Developer Agent Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace static content-task execution with an audited, iterative, controlled WordPress developer-agent run engine and its first real capabilities.

**Architecture:** The backend selects only tools advertised by the plugin capability manifest and advances a run after receiving redacted event results. WordPress remains authoritative for validation, permission/risk enforcement, execution, audit history, verification, and rollback. Capability modules register independently with a central registry.

**Tech Stack:** TypeScript/Fastify/Zod/Vitest; WordPress PHP 8.1 REST APIs; WordPress core APIs; vanilla admin JavaScript.

**Spec:** `docs/superpowers/specs/2026-10-07-wordpress-developer-agent-design.md`

## Global Constraints

- Execute only registered WordPress tools; never provide shell, arbitrary SQL, credentials, or unrestricted filesystem access.
- WordPress/plugin registry is authoritative for tool validation and risk decisions.
- Safe actions auto-run; confirmation actions pause; blocked actions never run.
- Keep existing projects, messages, content/docx flows, scoped file edits, and rollback data working.
- Redact sensitive data before returning tool results to the backend or UI.
- Verify mutations with a follow-up read whenever a capability provides a verifier.

## Review Focus

- Provider output with unknown tool names or extra arguments is rejected by the WordPress registry.
- A run cannot execute a confirmation-gated action before explicit approval.
- Repeated or non-idempotent mutation loops stop at the configured action limit.
- A site inspection redacts secrets from files/logs and omits unrestricted database content.
- A failed verification is reported as unverified rather than success.

---

### Task 1: Define the agent run protocol and backend advance endpoint

**Files:**
- Modify: `backend/src/types.ts`
- Modify: `backend/src/services/agent.ts`
- Modify: `backend/src/server.ts`
- Test: `backend/tests/agent.test.ts`

**Interfaces:**
- Produces `AgentRunInstruction` with `status`, `summary`, `risk`, `steps`, `actions`, `message`, and `requiresConfirmation`.
- Produces `AgentService.startRun(input)` and `AgentService.advanceRun(id, events)`.

- [ ] Add failing Vitest cases for an inspection instruction, a finish instruction, unknown provider action rejection, and action-limit stop.
- [ ] Run `npm test -- --run tests/agent.test.ts` and confirm the new tests fail.
- [ ] Implement Zod protocol schemas and bounded run state in `agent.ts`.
- [ ] Add `POST /v1/runs` and `POST /v1/runs/:id/advance` with request validation in `server.ts`.
- [ ] Run `npm test -- --run tests/agent.test.ts`, `npm test`, and `npm run lint`.

### Task 2: Add WordPress run/event audit storage

**Files:**
- Modify: `wordpress-plugin/ai-wordpress-agent/includes/class-aiwa-storage.php`
- Test: WordPress/stub test harness added under `wordpress-plugin/ai-wordpress-agent/tests/`

**Interfaces:**
- Produces `create_run`, `get_run`, `append_run_event`, `events_for_run`, and `finish_run`.

- [ ] Add a failing storage test for run creation, ordered events, and terminal status update.
- [ ] Implement `aiwa_runs` and `aiwa_run_events` schema upgrades and storage methods.
- [ ] Run PHP lint plus the storage test.

### Task 3: Replace the content-only registry with capability modules and policy

**Files:**
- Create: `wordpress-plugin/ai-wordpress-agent/includes/capabilities/interface-aiwa-capability.php`
- Create: `wordpress-plugin/ai-wordpress-agent/includes/class-aiwa-capability-registry.php`
- Create: `wordpress-plugin/ai-wordpress-agent/includes/class-aiwa-risk-policy.php`
- Modify: `wordpress-plugin/ai-wordpress-agent/includes/class-aiwa-tool-registry.php`
- Modify: `wordpress-plugin/ai-wordpress-agent/includes/class-aiwa-plugin.php`
- Test: `wordpress-plugin/ai-wordpress-agent/tests/test-capability-registry.php`

**Interfaces:**
- Capabilities expose `tools(): array` and callback metadata including name, schema, permission, risk, execute, and verify.
- Registry exposes `manifest()`, `validate_action(array $action)`, and `execute(array $action, array $context)`.

- [ ] Add failing tests for unknown tools, extra arguments, insufficient permission, confirmation risk, and blocked risk.
- [ ] Implement registry/policy and adapt legacy content tools into a content capability module.
- [ ] Run registry tests and PHP lint.

### Task 4: Implement the local iterative run executor and confirmation continuation

**Files:**
- Create: `wordpress-plugin/ai-wordpress-agent/includes/class-aiwa-run-engine.php`
- Modify: `wordpress-plugin/ai-wordpress-agent/includes/class-aiwa-task-executor.php`
- Modify: `wordpress-plugin/ai-wordpress-agent/includes/class-aiwa-rest-controller.php`
- Test: `wordpress-plugin/ai-wordpress-agent/tests/test-run-engine.php`

**Interfaces:**
- `AIWA_Run_Engine::start(int $project_id, string $prompt, array $attachments): array`
- `AIWA_Run_Engine::continue(int $run_id, bool $confirmed): array`

- [ ] Add failing tests for inspect→execute→verify sequence, confirmation pause, provider error, and repeated-action/action-limit termination.
- [ ] Implement backend handoff, result redaction, event recording, verification actions, and terminal reporting.
- [ ] Preserve legacy task reads/approvals by routing new tasks through runs and retaining old task records as history.
- [ ] Run PHP lint and run-engine tests.

### Task 5: Implement site-inspection and diagnostics capabilities

**Files:**
- Create: `wordpress-plugin/ai-wordpress-agent/includes/capabilities/class-aiwa-site-capability.php`
- Create: `wordpress-plugin/ai-wordpress-agent/includes/capabilities/class-aiwa-diagnostics-capability.php`
- Modify: `wordpress-plugin/ai-wordpress-agent/includes/class-aiwa-security.php`
- Test: `wordpress-plugin/ai-wordpress-agent/tests/test-site-capability.php`

**Interfaces:**
- Site tools: `inspect_site`, `inspect_homepage`, `inspect_post`, `inspect_theme`, `inspect_plugins`, `inspect_menus`, `inspect_post_types`, `inspect_integrations`.
- Diagnostics tools: `inspect_error_summary`, `inspect_file_tree`.

- [ ] Add failing tests for homepage resolution, builder/plugin detection, absent WooCommerce, and secret-redacted diagnostic output.
- [ ] Implement safe, compact inspection payloads using core WordPress APIs and scoped paths only.
- [ ] Run PHP lint and capability tests.

### Task 6: Implement initial mutating capabilities

**Files:**
- Create: `wordpress-plugin/ai-wordpress-agent/includes/capabilities/class-aiwa-content-capability.php`
- Create: `wordpress-plugin/ai-wordpress-agent/includes/capabilities/class-aiwa-media-capability.php`
- Create: `wordpress-plugin/ai-wordpress-agent/includes/capabilities/class-aiwa-menu-capability.php`
- Create: `wordpress-plugin/ai-wordpress-agent/includes/capabilities/class-aiwa-settings-capability.php`
- Test: capability tests under `wordpress-plugin/ai-wordpress-agent/tests/`

**Interfaces:**
- Content tools create/update/read pages/posts/custom post types; menu tools inspect/update; media tools inspect/update metadata/featured assignments; settings tools inspect/update allow-listed settings.

- [ ] Add failing tests for creating/publishing a page, adding a menu item, featured media assignment, safe setting update, and mutation verification.
- [ ] Implement tools through WordPress APIs with rollback/change records where reversible.
- [ ] Run capability tests and PHP lint.

### Task 7: Add confirmation-gated developer capabilities

**Files:**
- Create: `wordpress-plugin/ai-wordpress-agent/includes/capabilities/class-aiwa-theme-capability.php`
- Create: `wordpress-plugin/ai-wordpress-agent/includes/capabilities/class-aiwa-plugin-capability.php`
- Create: `wordpress-plugin/ai-wordpress-agent/includes/capabilities/class-aiwa-user-capability.php`
- Modify: `wordpress-plugin/ai-wordpress-agent/includes/class-aiwa-file-tools.php`
- Test: capability tests under `wordpress-plugin/ai-wordpress-agent/tests/`

- [ ] Add failing tests ensuring theme/file/plugin/user mutation actions pause for confirmation and cannot escape allowed paths.
- [ ] Implement inspection plus confirmation-gated file/theme, plugin activation/deactivation, and user/role actions.
- [ ] Ensure file modifications use existing atomic snapshots and rollback.
- [ ] Run capability tests and PHP lint.

### Task 8: Update the backend manifest-aware planner

**Files:**
- Modify: `backend/src/services/agent.ts`
- Modify: `backend/src/types.ts`
- Test: `backend/tests/agent.test.ts`

- [ ] Add failing tests for manifest filtering, inspection-first plans, and unsupported integration response.
- [ ] Include the plugin manifest in run prompts, constrain actions to it, and require verification after mutation tools when a verifier exists.
- [ ] Run backend tests and lint.

### Task 9: Build live run UI and rollback controls

**Files:**
- Modify: `wordpress-plugin/ai-wordpress-agent/admin/build/app.js`
- Modify: `wordpress-plugin/ai-wordpress-agent/admin/build/app.css`
- Modify: `wordpress-plugin/ai-wordpress-agent/includes/class-aiwa-rest-controller.php`

- [ ] Add UI/API tests or browser smoke-test script for run creation, polling, action/event display, confirmation, failure, and rollback link.
- [ ] Replace static task-only rendering with live run status/events while retaining legacy task history.
- [ ] Run browser/manual localhost smoke tests for page creation/menu update, homepage inspection, confirmation-gated file write, rollback, and unsupported builder detection.

### Task 10: Package, verify, and document Phase 1

**Files:**
- Modify: `wordpress-plugin/ai-wordpress-agent/readme.txt`
- Modify: `wordpress-plugin/ai-wordpress-agent/ai-wordpress-agent.php`
- Create: plugin release ZIP

- [ ] Run the complete backend test suite and TypeScript lint.
- [ ] Run PHP lint for all plugin PHP files and all available WordPress capability tests.
- [ ] Perform documented localhost smoke tests and record actual results.
- [ ] Update the readme with supported capabilities, confirmation policy, unsupported-adapter behavior, and setup.
- [ ] Package the plugin ZIP with a version bump.

## Self-Review

- Spec coverage: Tasks 1–4 implement the run protocol, policy, audit trail, confirmation, errors, limits, and verification; Tasks 5–7 deliver first capabilities and adapter-friendly boundaries; Tasks 8–9 make the model and UI use the registry; Task 10 verifies and packages.
- Type consistency: Backend `AgentRunInstruction` maps to plugin actions; plugin registry owns action validation and returns normalized events consumed by `advanceRun`.
- Review focus coverage: Task 3 covers unknown/extra arguments and permissions; Task 4 covers confirmation and limits; Task 5 covers redaction; Task 6 covers verification.
- Scope: WooCommerce, forms, SEO, and builders are adapter modules after Phase 1 detection and capability baseline, not fake generic implementations.
