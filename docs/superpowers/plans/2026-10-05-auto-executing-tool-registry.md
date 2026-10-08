# Auto-Executing Tool Registry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Execute validated, supported WordPress content actions automatically and leave every task in a durable completed, partially completed, or failed state.

**Architecture:** Extend the backend plan contract with a constrained action list. In the plugin, add a content tool implementation, a registry that owns tool lookup and permission checks, and a task executor that controls state and result persistence. The REST controller delegates automatic and legacy-approved execution to the executor rather than setting `executing` unconditionally.

**Tech Stack:** TypeScript, Fastify, Zod, Vitest, PHP 8.1, WordPress 6.5 REST APIs and post APIs.

**Spec:** `docs/superpowers/specs/2026-10-05-auto-executing-tool-registry-design.md`

## Global Constraints

- Supported actions must execute automatically only for authenticated WordPress administrators.
- WordPress independently validates tool names, arguments, and configured permission level.
- Never execute shell commands, raw SQL, arbitrary PHP, WordPress-core edits, or secret-revealing operations.
- `trash_post` is reversible through WordPress Trash and never permanently deletes content.
- File operations retain their existing snapshot and rollback design.
- Runtime target is WordPress 6.5+ and PHP 8.1+.

## Review Focus

- Ambiguous source-title duplication must fail rather than choose a post; cover in Task 2.
- Unsupported or model-fabricated tool names must fail before execution; cover in Tasks 1 and 3.
- A non-development permission level must deny content mutations; cover in Task 3.
- A failed action after a successful action must report `partially_completed` and prior results; cover in Task 3.
- Legacy awaiting-approval tasks must execute through the same path and never remain `executing`; cover in Task 4.

### Task 1: Structured backend action-plan contract

**Files:**
- Modify: `backend/src/types.ts`
- Modify: `backend/src/services/agent.ts`
- Modify: `backend/tests/agent.test.ts`

**Interfaces:**
- Produces `Plan.actions: PlannedAction[]`, where `PlannedAction` is `{ tool: string; arguments: Record<string, unknown> }`.
- Produces an exported known content-tool list or schema used by the provider-plan parser.
- Consumed by plugin task plans as persisted JSON.

- [ ] **Step 1: Write failing backend tests for valid structured content actions and unknown action rejection**

Add Vitest cases that require a `duplicate_post` action to survive parsing and a fabricated tool name to put the task in `failed` state.

- [ ] **Step 2: Run backend tests to verify the new cases fail**

Run: `npm test -- --run backend/tests/agent.test.ts`

Expected: FAIL because `Plan.actions` and action-name validation do not exist.

- [ ] **Step 3: Add `PlannedAction` and strict action parsing in `backend/src/types.ts` and `backend/src/services/agent.ts`**

Update the provider prompt to request the supported content action names and input shape. Preserve plan-only parsing; do not execute WordPress actions in the backend.

- [ ] **Step 4: Run the focused backend tests to verify they pass**

Run: `npm test -- --run backend/tests/agent.test.ts`

Expected: PASS.

- [ ] **Step 5: Run backend typecheck**

Run: `npm run lint`

Expected: PASS with no TypeScript errors.

### Task 2: WordPress content-tool implementation

**Files:**
- Create: `wordpress-plugin/ai-wordpress-agent/includes/class-aiwa-content-tools.php`
- Modify: `wordpress-plugin/ai-wordpress-agent/ai-wordpress-agent.php`
- Test: `wordpress-plugin/ai-wordpress-agent/tests/test-content-tools.php` (or project-compatible equivalent)

**Interfaces:**
- Produces `AIWA_Content_Tools` methods: `find_posts(array $arguments)`, `create_post(array $arguments)`, `update_post(array $arguments)`, `duplicate_post(array $arguments)`, and `trash_post(array $arguments)`.
- Every method returns a result array or `WP_Error` with a client-safe message and HTTP status.
- Consumed by `AIWA_Tool_Registry` in Task 3.

- [ ] **Step 1: Write failing WordPress tests for duplicate success and ambiguous-source rejection**

Create one source post, duplicate it with `new_title` and `append_content`, then assert the new ID, title, content, taxonomy IDs, and edit URL. Create two matching-title sources and assert a `WP_Error` with conflict status.

- [ ] **Step 2: Run the focused PHP/WordPress test harness to verify the tests fail**

Run the repository’s configured PHP test command, or a bootstrap-based focused command if no suite exists.

Expected: FAIL because `AIWA_Content_Tools` is absent.

- [ ] **Step 3: Implement `AIWA_Content_Tools` in `class-aiwa-content-tools.php`**

Use only WordPress post and taxonomy APIs. Resolve source selectors by ID first; resolve titles only when exactly one post matches. Allow only declared post fields and status values. Use `wp_trash_post` for deletion.

- [ ] **Step 4: Run the focused content-tool tests to verify they pass**

Run the same focused PHP/WordPress test command.

Expected: PASS.

- [ ] **Step 5: Check PHP syntax for the new class**

Run: `php -l wordpress-plugin/ai-wordpress-agent/includes/class-aiwa-content-tools.php`

Expected: `No syntax errors detected`.

### Task 3: Registry, automatic task executor, and durable results

**Files:**
- Create: `wordpress-plugin/ai-wordpress-agent/includes/class-aiwa-tool-registry.php`
- Create: `wordpress-plugin/ai-wordpress-agent/includes/class-aiwa-task-executor.php`
- Modify: `wordpress-plugin/ai-wordpress-agent/includes/class-aiwa-storage.php`
- Modify: `wordpress-plugin/ai-wordpress-agent/includes/class-aiwa-plugin.php`
- Modify: `wordpress-plugin/ai-wordpress-agent/ai-wordpress-agent.php`
- Test: `wordpress-plugin/ai-wordpress-agent/tests/test-task-executor.php` (or project-compatible equivalent)

**Interfaces:**
- `AIWA_Tool_Registry::__construct(AIWA_Security $security, AIWA_Content_Tools $content_tools)` and `execute(string $name, array $arguments): array|WP_Error`.
- `AIWA_Task_Executor::__construct(AIWA_Storage $storage, AIWA_Tool_Registry $registry)` and `execute(object $task): array`.
- Storage exposes task result data through an added `result` column and task reads.
- Consumed by REST controller in Task 4.

- [ ] **Step 1: Write failing executor tests for unsupported tools, denied permission, and partial completion**

Assert an unknown action creates a failed task, an allowed mutation at `read` permission is denied, and a two-action task with one success then one failure reaches `partially_completed` with the first result retained.

- [ ] **Step 2: Run focused executor tests to verify they fail**

Run the PHP/WordPress focused executor test command.

Expected: FAIL because the registry, executor, and result storage do not exist.

- [ ] **Step 3: Implement `AIWA_Tool_Registry` with explicit tool definitions**

Map the five content action names to `AIWA_Content_Tools`, require `development` permission for mutations and `read` for `find_posts`, and return an error for unregistered names.

- [ ] **Step 4: Implement `AIWA_Task_Executor::execute(object $task): array` and storage result migration**

Decode `plan.actions`, execute in order, update progress after each action, persist a JSON result array, and set only `completed`, `partially_completed`, or `failed` after work ends. Never leave a synchronously executed task at `executing`.

- [ ] **Step 5: Run focused executor tests to verify they pass**

Run the PHP/WordPress focused executor test command.

Expected: PASS.

- [ ] **Step 6: Check PHP syntax for registry, executor, and storage**

Run: `php -l wordpress-plugin/ai-wordpress-agent/includes/class-aiwa-tool-registry.php && php -l wordpress-plugin/ai-wordpress-agent/includes/class-aiwa-task-executor.php && php -l wordpress-plugin/ai-wordpress-agent/includes/class-aiwa-storage.php`

Expected: no syntax errors.

### Task 4: REST lifecycle and Tasks UI results

**Files:**
- Modify: `wordpress-plugin/ai-wordpress-agent/includes/class-aiwa-rest-controller.php`
- Modify: `wordpress-plugin/ai-wordpress-agent/includes/class-aiwa-plugin.php`
- Modify: `wordpress-plugin/ai-wordpress-agent/admin/build/app.js`
- Modify: `docs/api.md`
- Modify: `README.md`
- Test: `wordpress-plugin/ai-wordpress-agent/tests/test-task-rest-lifecycle.php` (or project-compatible equivalent)

**Interfaces:**
- REST `create_task()` invokes `AIWA_Task_Executor::execute()` for a valid auto-executing plan.
- REST `approve_task()` invokes the same executor for pre-existing awaiting-approval tasks.
- Task list rows include `result` and terminal status.

- [ ] **Step 1: Write failing REST lifecycle test for automatic execution and legacy approval execution**

Assert a valid new task reaches `completed` without an approval request, and a stored legacy `awaiting_approval` task finishes through the approval endpoint rather than being set to `executing`.

- [ ] **Step 2: Run focused REST lifecycle tests to verify they fail**

Run the PHP/WordPress focused REST test command.

Expected: FAIL because the controller only records an `executing` status.

- [ ] **Step 3: Inject `AIWA_Task_Executor` into the REST controller and delegate both flows to it**

Return task status, progress, result, and errors from execution. Preserve backend approval notification only as compatibility bookkeeping; WordPress execution remains authoritative.

- [ ] **Step 4: Render task action results and terminal states in the admin Tasks view**

Parse the stored JSON result defensively. Replace the approval control for newly generated auto-running tasks with a concise result/error display; retain the control only for legacy pending tasks if needed.

- [ ] **Step 5: Update API and README documentation**

Describe automatic supported-content execution, the five initial tools, permission requirements, result states, and safety boundaries.

- [ ] **Step 6: Run focused lifecycle tests and PHP syntax checks to verify they pass**

Run the focused test command and `php -l wordpress-plugin/ai-wordpress-agent/includes/class-aiwa-rest-controller.php`.

Expected: PASS and no syntax errors.

### Task 5: Whole-feature verification

**Files:**
- Verify only: backend and plugin sources touched in Tasks 1–4

**Interfaces:**
- Consumes the complete automatic execution feature.
- Produces release evidence and any reported environmental limitations.

- [ ] **Step 1: Run all backend tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 2: Run backend typecheck and build**

Run: `npm run lint && npm run build`

Expected: PASS.

- [ ] **Step 3: Syntax-check every plugin PHP file**

Run: `find wordpress-plugin/ai-wordpress-agent -name '*.php' -print0 | xargs -0 -n1 php -l`

Expected: every file reports no syntax errors.

- [ ] **Step 4: Package/install smoke test if a WordPress test environment is available**

Activate the plugin in a disposable WordPress instance and submit a duplicate-post task. Confirm the created post, `completed` task status, persisted result, and edit URL.

- [ ] **Step 5: Record limitations if the repository lacks a WordPress runtime test harness**

State exactly which WordPress-level checks could not be run and why; do not represent static checks as integration coverage.
