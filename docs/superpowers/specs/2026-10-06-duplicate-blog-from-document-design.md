# Duplicate Blog From Document Design

## Goal

Provide a friendly Add New Blog workflow that creates a WordPress draft from either a document alone or a selected existing blog post. In duplicate mode, the selected source post supplies post-level settings and the DOCX supplies replacement article content and inline images. Featured image selection is separate and never inferred from document images.

## User workflow

The AI Developer workspace exposes an Add New Blog entry point. The user chooses either New draft from document or Duplicate an existing blog.

Duplicate mode shows a searchable list of posts. The user selects one source post, uploads one DOCX, and optionally selects or uploads a separate featured image. The app creates a new draft and returns its WordPress edit link.

The user may leave the featured image unset. Inline images extracted from the DOCX are placed within the article content only and are never automatically assigned as the featured image.

## Copy and replacement rules

The new draft copies allowed post-level fields from the source: post type, categories, tags, author, template, excerpt, and safe post metadata. It never overwrites the selected original post.

The imported document replaces the new draft's title and article body. The document title maps to the post title. Its headings, paragraphs, lists, links, block quotes, tables, and embedded images map to safe Gutenberg-compatible content. Document metadata may populate supported SEO fields only where the relevant SEO plugin is detected and its API is available.

## DOCX media handling

Embedded DOCX images are extracted from `word/media`, uploaded to the WordPress Media Library, and inserted at their original document positions. Word relationships determine image placement; no filesystem path supplied by the document is trusted. Extraction and upload failures record warnings and the recoverable draft edit URL.

## Safety and status

All resulting posts are drafts. The operation accepts one DOCX only, uses attachment IDs scoped to the submitted task, and validates the selected source post, uploaded attachments, and optional featured image in WordPress. It supports no publish action.

Failures before draft creation fail safely. Failures after creation produce `partially_completed` status with the draft edit URL, so the user can recover or delete it deliberately.

## Components

- Add New Blog UI modal/wizard with mode selection, post search, document picker, and independent featured-image picker.
- Post search endpoint scoped to accessible posts.
- DOCX relationship/media parser and safe block renderer.
- `import_document_draft` extension for new/duplicate mode, or a dedicated `duplicate_blog_from_document` registry tool.
- Task result display with draft link, imported inline-media count, selected featured image, and warnings.

## Verification

Tests cover source-search authorization, source immutability, copied taxonomy/template data, draft-only status, inline-image upload and placement, no automatic featured image, optional explicit featured image, corrupt relationship/media failures, and partial completion with a recoverable draft URL.
