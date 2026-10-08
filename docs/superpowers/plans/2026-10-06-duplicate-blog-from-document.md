# Duplicate Blog From Document Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement task-by-task.

**Goal:** Create draft-only blog copies from a selected source post and DOCX content, with DOCX inline media and independent featured-image selection.

**Architecture:** Add a post-search API and Add New Blog wizard, extend DOCX conversion to track image relationships, and add a validated duplicate/import executor action that copies only safe source settings before replacing title/content.

**Spec:** `docs/superpowers/specs/2026-10-06-duplicate-blog-from-document-design.md`

### Task 1: Source post search and Add New Blog UI
- Add a project-safe source-post search REST endpoint and wizard controls for new/duplicate modes, DOCX, and optional featured image.
- Test authorization and UI attachment selection.

### Task 2: DOCX rich conversion and media extraction
- Extend the DOCX reader to allowlist headings, paragraphs, lists, links, and media relationship references; upload document images through WordPress APIs.
- Test relationship resolution and corrupt-media handling.

### Task 3: Duplicate/import action
- Implement `duplicate_blog_from_document`, copy safe source fields into a new draft, replace content from the DOCX, place imported inline images, and apply only an explicit featured image.
- Test source immutability, draft-only status, copied taxonomies/template, and partial-result recovery.

### Task 4: Verification
- Run backend tests/lint/build, PHP syntax checks, and WordPress upload/import smoke tests.
