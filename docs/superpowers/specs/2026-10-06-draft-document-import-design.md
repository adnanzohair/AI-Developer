# Draft Document Import Design

## Goal

Let an authenticated WordPress administrator upload a Word document and optional images in AI Developer chat, then ask the agent to create a reviewable WordPress draft. The uploaded document becomes structured post content and an explicitly referenced attachment can become the featured image.

## User experience

The chat composer accepts one `.docx` document and multiple image attachments. The user does not need to type image filenames. When exactly one image is uploaded with a document, it is selected automatically as the featured image. When several images are uploaded, the attachment UI provides a visible “Featured image” selector; the selected image is used without needing a textual reference.

Every imported post is a WordPress draft. The task result contains its post ID, edit URL, title, and the selected featured-image attachment. The agent never publishes an imported document.

The selected featured image is sent as an attachment ID in the task request. If several images are attached and none is selected, the task fails clearly rather than assigning the wrong image.

## File handling and boundaries

The plugin accepts only `.docx` for source documents and common safe raster image formats (`jpg`, `jpeg`, `png`, `webp`, `gif`). Uploads use the WordPress media/file APIs, nonce-authenticated administrator requests, strict size limits, MIME validation, and project/task ownership. Original document files and images are kept in the WordPress uploads area only as needed for the task audit.

WordPress controls file acceptance and media uploads. The AI backend receives document structure and attachment metadata, never filesystem paths, cookies, WordPress credentials, or provider secrets.

## Document conversion

The server extracts DOCX structure into a constrained intermediate representation: title, headings, paragraphs, ordered/unordered lists, links, block quotes, tables, and embedded media references. It renders this representation as safe Gutenberg-compatible HTML or block markup using WordPress sanitization.

Heading levels map to `<h2>` through `<h6>`; the document title maps to the new draft post title rather than a duplicated in-body heading. Basic emphasis and links are retained. Unsupported formatting is omitted from the draft result summary rather than converted into executable HTML or styles.

## Attachment-aware action contract

The backend receives attachment metadata with opaque attachment IDs, original filenames, MIME types, source-document structure, and the UI-selected featured-image attachment ID. It may plan a `import_document_draft` action only. Its arguments contain the document attachment ID, optional requested draft title, and an optional `featured_image_attachment_id`.

The WordPress registry validates the action and resolves attachments only within the current task/project. It then converts the document, creates a `draft` post, uploads or attaches embedded/document images, resolves the selected featured image, and uses `set_post_thumbnail`.

## Failure behavior

Invalid files, a missing document, an ambiguous featured-image instruction, a corrupt document, conversion errors, media errors, or invalid attachment ownership result in `failed` or `partially_completed` task status with a clear error. A media failure after the draft exists records the draft edit URL for recovery. No imported post is automatically published.

## Components

- Attachment REST endpoints and task-scoped attachment storage.
- Chat UI attachment picker and filename chips.
- DOCX extractor/converter with a constrained, safe representation.
- `import_document_draft` content tool and registry validator.
- Updated backend plan schema/prompt for attachment-aware import actions.
- Task UI result details including edit URL and featured image.

## Verification

Tests cover MIME and size rejection, attachment ownership, heading/list/link conversion, draft-only status, automatic single-image selection, UI-selected featured-image handling, unselected multi-image failure, and failure after draft creation. A WordPress integration smoke test uploads a DOCX and image, creates a draft, verifies the heading structure and post thumbnail, and confirms no post is published.
