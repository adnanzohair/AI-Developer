# Security model

- `read`: site intelligence and file reads.
- `development`: scoped file creation/modification with a pre-change snapshot.
- `administrative`: rollback and, in future versions, explicitly approved high-risk actions.

Every request is independently authorized in WordPress. Paths must be relative, must start below an allowed root, are canonicalized, and cannot escape through traversal or symlinks. Files have strict size limits. Secrets matching WordPress salts, database passwords, and common provider keys are redacted before content leaves the tool boundary.

Change rollback verifies the current SHA-256 against the recorded post-write hash. If a human or another task changed the file later, rollback returns HTTP 409 rather than overwriting newer work.

Production deployment must use HTTPS, a unique high-entropy shared secret, an origin allowlist, restricted backend network access, and provider keys held only by the backend. Do not place provider keys in chat, project memory, or WordPress content.

Known V1 limitation: historical snapshots are stored in the WordPress database. A production hardening release should encrypt snapshots at rest and add retention limits.
