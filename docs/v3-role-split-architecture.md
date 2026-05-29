# V3.0 Role Split Architecture

## Scope

V3.0 splits the local Knowledge Land frontend into two product surfaces inside the same React + TypeScript + Vite application:

- `/app/*`: Knowledge Portal for teachers, graduate students, researchers, and research-group members.
- `/admin/*`: Admin Console for administrators and research assistants.
- legacy Aella routes such as `/embeddings`: experimental visualization views kept for reference and exploration.

This is not a rewrite of the backend, the D3 knowledge map, or the original Aella explorer. It is an information-architecture and responsibility-boundary refactor.

## Product Rules

- User uploads enter `pending_review`.
- `draft`, `pending_review`, `reviewing`, and `rejected` items must not appear in the user map, user search results, or public item details.
- Admin approval changes a knowledge item to `published`.
- `/app/map` only renders published knowledge nodes.
- Manual item creation is an admin capability and must not appear in the user navigation.
- AI / Agent analysis is optional, default-off, and cannot be required for local startup or the core workflow.
- The current role guard is a development helper based on `AppRole = "user" | "admin"` and localStorage. It is not a full login, JWT, organization, or multi-tenant permission system.

## Route Table

| Route                                | Surface | Current page              | Responsibility                                                            | Status                   |
| ------------------------------------ | ------- | ------------------------- | ------------------------------------------------------------------------- | ------------------------ |
| `/app`                               | User    | `UserDashboardPage`       | User dashboard, entry to map, upload, upload status, and knowledge bases. | Active                   |
| `/app/map`                           | User    | `UserMapPage`             | Published-only 2D knowledge map, filters, node detail panel.              | Active                   |
| `/app/search`                        | User    | `UserSearchPage`          | Published-only search entry.                                              | Active first-stage entry |
| `/app/upload`                        | User    | `UserUploadPage`          | Upload research materials into `pending_review`.                          | Active                   |
| `/app/uploads`                       | User    | `UserUploadsPage`         | Show user upload review status.                                           | Active first-stage entry |
| `/app/kbs`                           | User    | `UserKnowledgeBasesPage`  | Readable knowledge-base list without admin maintenance actions.           | Active                   |
| `/admin`                             | Admin   | `AdminDashboardPage`      | Admin overview for review and maintenance work.                           | Active                   |
| `/admin/review`                      | Admin   | `AdminReviewPage`         | Review queue, save draft, publish, reject.                                | Active                   |
| `/admin/manual-entry`                | Admin   | `AdminManualEntryPage`    | Manual knowledge-item creation.                                           | Active                   |
| `/admin/knowledge-bases`             | Admin   | `AdminKnowledgeBasesPage` | Knowledge-base management and maintenance metrics.                        | Active                   |
| `/admin/items`                       | Admin   | `AdminPlaceholderPage`    | Published-item management entry.                                          | Placeholder              |
| `/admin/tags`                        | Admin   | `AdminPlaceholderPage`    | Tag and cluster maintenance entry.                                        | Placeholder              |
| `/admin/settings`                    | Admin   | `AdminPlaceholderPage`    | System settings entry, AI default-off.                                    | Placeholder              |
| `/embeddings` and other Aella routes | Legacy  | `LaionApp`                | Original Aella visualization surfaces.                                    | Preserved                |

## Compatibility Paths

The V3 dispatcher keeps old paths usable while steering users into the correct product surface:

| Old path             | Canonical path           |
| -------------------- | ------------------------ |
| `/`                  | `/app`                   |
| `/upload`            | `/app/upload`            |
| `/map`               | `/app/map`               |
| `/review`            | `/admin/review`          |
| `/manual-entry`      | `/admin/manual-entry`    |
| `/knowledge-bases`   | `/admin/knowledge-bases` |
| `/legacy/embeddings` | `/embeddings`            |

Legacy Aella routes stay available, but they are not the primary Knowledge Land product experience.

## Page Responsibilities

### User Portal

User pages may:

- Browse published knowledge nodes.
- Search published knowledge.
- Upload research materials for review.
- View upload status.
- Browse readable knowledge-base summaries.

User pages must not:

- Approve, publish, or reject knowledge items.
- Manually create published knowledge items.
- Configure AI providers or system settings.
- Display pending, rejected, reviewing, or draft items in public map/search/detail surfaces.

### Admin Console

Admin pages may:

- Review pending materials.
- Save review drafts.
- Publish or reject items.
- Manually create knowledge nodes.
- Manage knowledge bases.
- Maintain future item, tag, cluster, and settings surfaces.

Admin pages may link to the user map for inspection, but should not embed user exploration as the main review workflow.

## API Adapter Boundary

The backend can keep the existing endpoints during V3.0. The frontend still separates call intent through adapters:

- `frontend/src/utils/userKnowledgeApi.ts`
  - fetch user-readable knowledge bases
  - fetch published map data
  - fetch published item details
  - fetch similar published items
  - create user uploads
- `frontend/src/utils/adminKnowledgeApi.ts`
  - fetch admin knowledge bases
  - fetch review queue
  - save review drafts
  - publish review items
  - reject review items
  - create manual admin items

This keeps user pages from importing admin review or publish actions even if both adapters temporarily reuse `knowledgeApi.ts`.

## Data State Flow

```text
User upload
  -> pending_review
  -> admin review
      -> rejected
      -> published
  -> published items enter /app/map and /app/search
```

Manual admin creation can create a published node directly, but only from `/admin/manual-entry`.

## Current Limitations

- `/admin/items`, `/admin/tags`, and `/admin/settings` are V3 placeholder entries.
- The role guard is a local development helper, not production authentication.
- `/app/search` is a first-stage search entry and should be expanded into a full published-results view later.
- The user upload-status surface is first-stage and may need a dedicated backend "my uploads" endpoint later.
- AI suggestions are not wired into the core workflow and remain default-off.

## Verification Checklist

After V3 route or shell changes, run:

```sh
cd frontend
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/vite build
```

Then smoke-check:

- `/app`
- `/app/upload`
- `/app/uploads`
- `/app/map`
- `/admin`
- `/admin/review`
- `/admin/manual-entry`
- `/admin/knowledge-bases`
- legacy `/embeddings`
