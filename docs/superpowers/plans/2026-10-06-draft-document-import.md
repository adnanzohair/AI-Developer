# Draft Document Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import a DOCX and attached images from AI Developer chat into a safe WordPress draft, automatically applying the sole image or UI-selected image as the featured image.

**Architecture:** Add task-scoped upload records and media upload endpoints. A native PHP DOCX reader uses `ZipArchive` and WordprocessingML to create constrained safe HTML, while the content registry receives an `import_document_draft` action with attachment IDs. The chat UI uploads attachments first, selects a featured image visually when necessary, then passes their opaque IDs into task planning.

**Tech Stack:** PHP 8.1, WordPress 6.5 media/post APIs, ZipArchive, SimpleXML, TypeScript/Fastify/Zod, vanilla admin JavaScript.

**Spec:** `docs/superpowers/specs/2026-10-06-draft-document-import-design.md`

## Global Constraints

- Only authenticated administrators may upload or import files.
- Accept exactly one `.docx` source document and only JPG, JPEG, PNG, WebP, or GIF image attachments.
- Validate MIME type, extension, size, ownership, and project association in WordPress.
- Imported posts must always have `post_status` of `draft`.
- One image auto-selects as featured; several images require an explicit UI selection.
- Preserve only safe document structure and never execute document-supplied HTML, styles, macros, scripts, paths, or instructions.
- The backend receives opaque attachment IDs and metadata, never filesystem paths or credentials.

## Review Focus

- A renamed executable masquerading as an image must be rejected by MIME validation; cover in Task 1.
- An attachment from another project/user must not be readable or importable; cover in Task 1.
- A DOCX with malicious hyperlink or unexpected XML must render sanitized content only; cover in Task 2.
- Multiple images without a selected featured image must fail without creating a published post; cover in Task 3.
- A partially completed media import must retain the draft edit URL and remain a draft; cover in Task 3.

### Task 1: Task-scoped attachment upload API

**Files:**
- Create: `wordpress-plugin/ai-wordpress-agent/includes/class-aiwa-attachments.php`
- Modify: `wordpress-plugin/ai-wordpress-agent/includes/class-aiwa-storage.php`
- Modify: `wordpress-plugin/ai-wordpress-agent/includes/class-aiwa-rest-controller.php`
- Modify: `wordpress-plugin/ai-wordpress-agent/includes/class-aiwa-plugin.php`
- Modify: `wordpress-plugin/ai-wordpress-agent/ai-wordpress-agent.php`
- Test: WordPress attachment integration tests or bootstrap test script

**Interfaces:**
- `AIWA_Attachments::upload(WP_REST_Request $request): array|WP_Error` stores a validated attachment and returns `{id, filename, mime_type, kind}`.
- `AIWA_Attachments::for_project(int $project_id, int $user_id): array` returns owned attachment metadata.
- Storage creates `aiwa_attachments` with project/user ownership, WordPress media ID, MIME type, kind, and timestamps.

- [ ] **Step 1: Write failing tests for valid DOCX/image uploads, forged image MIME rejection, and cross-project ownership denial**
- [ ] **Step 2: Run the focused WordPress test command and observe failure before implementation**
- [ ] **Step 3: Implement attachment table, WordPress media upload handling, and project-scoped REST endpoints**
- [ ] **Step 4: Run focused attachment tests and PHP syntax checks**

### Task 2: Safe DOCX structure extractor

**Files:**
- Create: `wordpress-plugin/ai-wordpress-agent/includes/class-aiwa-docx-importer.php`
- Test: WordPress/PHP fixture tests with a DOCX fixture

**Interfaces:**
- `AIWA_DOCX_Importer::convert(string $file_path): array|WP_Error` returns `{title, content, embedded_images, warnings}`.
- Generated content contains only WordPress-sanitizable paragraphs, headings, lists, blockquotes, links, and tables.
- Consumed by `AIWA_Content_Tools::import_document_draft()` in Task 3.

- [ ] **Step 1: Create failing fixture tests for heading, paragraph, list, hyperlink, unsafe-link, and embedded-image conversion**
- [ ] **Step 2: Run the focused importer tests and observe failure before implementation**
- [ ] **Step 3: Implement a ZipArchive/WordprocessingML reader with an allowlisted HTML renderer**
- [ ] **Step 4: Run importer tests and PHP syntax checks**

### Task 3: Draft import registry action and featured-image selection

**Files:**
- Modify: `wordpress-plugin/ai-wordpress-agent/includes/class-aiwa-content-tools.php`
- Modify: `wordpress-plugin/ai-wordpress-agent/includes/class-aiwa-tool-registry.php`
- Modify: `wordpress-plugin/ai-wordpress-agent/includes/class-aiwa-plugin.php`
- Modify: `backend/src/types.ts`
- Modify: `backend/src/services/agent.ts`
- Modify: `backend/tests/agent.test.ts`
- Test: WordPress import-action integration tests

**Interfaces:**
- `AIWA_Content_Tools::import_document_draft(array $arguments): array|WP_Error` accepts `document_attachment_id`, optional `title`, and optional `featured_image_attachment_id`.
- The registry maps `import_document_draft` to development permission and validates all IDs as task/project-owned attachments.
- Backend `Plan.actions` allows `import_document_draft` only with opaque IDs sourced from request attachment metadata.

- [ ] **Step 1: Write failing tests for draft-only import, automatic single-image thumbnail, explicit selected thumbnail, and multi-image-without-selection failure**
- [ ] **Step 2: Run focused backend and WordPress tests and observe failure**
- [ ] **Step 3: Implement the content tool, registry validation, backend plan contract, and provider instruction**
- [ ] **Step 4: Run focused tests, backend typecheck, and PHP syntax checks**

### Task 4: Attachment-aware chat UI and task request lifecycle

**Files:**
- Modify: `wordpress-plugin/ai-wordpress-agent/admin/build/app.js`
- Modify: `wordpress-plugin/ai-wordpress-agent/admin/build/app.css`
- Modify: `wordpress-plugin/ai-wordpress-agent/includes/class-aiwa-rest-controller.php`
- Modify: `README.md`
- Modify: `docs/api.md`
- Test: browser/manual acceptance test against a disposable WordPress site

**Interfaces:**
- Chat submits `FormData` to attachment upload routes before it submits the task JSON.
- Task creation receives attachment IDs and includes owned attachment metadata in backend planning context.
- The UI auto-selects exactly one image, exposes a visual selector for several images, and renders draft/featured-image results.

- [ ] **Step 1: Write a failing UI/API test or minimal browser acceptance script for one image auto-selection and multiple-image explicit selection**
- [ ] **Step 2: Run it and observe failure before implementation**
- [ ] **Step 3: Implement attachment picker, visual featured-image selector, upload request flow, and result rendering**
- [ ] **Step 4: Update REST task input, API/README documentation, and run the acceptance test**

### Task 5: Whole-feature verification

**Files:**
- Verify only: all files changed in Tasks 1–4

- [ ] **Step 1: Run `npm test`, `npm run lint`, and `npm run build` in `backend/`**
- [ ] **Step 2: Run PHP syntax checks for all plugin PHP files**
- [ ] **Step 3: In a disposable WordPress site, upload a DOCX and one image, submit an import request, and verify a draft with mapped headings and the featured image**
- [ ] **Step 4: Upload two images, select one in the UI, and verify that selected image becomes the thumbnail**
- [ ] **Step 5: Record any environment-limited verification honestly**
