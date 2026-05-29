# Aella Science Dataset Explorer

Interactive visualization and exploration of scientific papers from the Aella open science dataset.

## Local Adaptation: Knowledge Land

This local checkout is being adapted into **Knowledge Land**, an approval-based research knowledge-base visualization site for universities and research groups. The current local direction is V3.0: split the product into a user-facing Knowledge Portal and an admin-facing Admin Console inside the same React + TypeScript + Vite frontend.

The local product mode is an approval-based knowledge base, not a fully automatic AI platform:

- Users upload research materials into a `pending_review` queue.
- Administrators review metadata, save drafts, publish, or reject items.
- Administrators can manually create knowledge nodes without uploading a file.
- The user-facing map only shows `published` knowledge items.
- AI / Agent analysis is optional and default-off. The default workflow runs without AI keys, external agents, VPN, vector databases, or external model services.

V3.0 route groups:

- `/app` - user Knowledge Portal dashboard.
- `/app/map` - published-only two-dimensional knowledge map.
- `/app/search` - user search entry for published knowledge.
- `/app/upload` - upload research materials into `pending_review`.
- `/app/uploads` - user upload status view.
- `/app/kbs` - user-readable knowledge-base list.
- `/admin` - Admin Console dashboard.
- `/admin/review` - review queue for draft, publish, and reject actions.
- `/admin/manual-entry` - administrator manual item creation.
- `/admin/knowledge-bases` - knowledge-base management.
- `/admin/items` - admin item-management entry, currently a V3 placeholder.
- `/admin/tags` - tag / cluster maintenance entry, currently a V3 placeholder.
- `/admin/settings` - system settings entry showing AI default-off, currently a V3 placeholder.

Legacy compatibility paths are kept:

- `/` -> `/app`
- `/upload` -> `/app/upload`
- `/map` -> `/app/map`
- `/review` -> `/admin/review`
- `/manual-entry` -> `/admin/manual-entry`
- `/knowledge-bases` -> `/admin/knowledge-bases`

Original Aella routes are preserved as experimental / legacy views:

- `/embeddings`
- `/force-layout`
- `/distribution-chart`
- `/paper-explorer`
- `/heatmap`
- `/stacked-chart`

Local v1 API additions:

- `GET /api/knowledge-bases`
- `POST /api/knowledge-bases`
- `GET /api/map`
- `GET /api/items/{id}`
- `GET /api/items/{id}/similar`
- `POST /api/uploads`
- `GET /api/review-items`
- `PATCH /api/review-items/{id}`
- `POST /api/review-items/{id}/publish`
- `POST /api/review-items/{id}/reject`
- `POST /api/admin/items`

The v1 tables are created automatically in the configured local SQLite database as `knowledge_bases` and `knowledge_items`. They are separate from the original Aella `papers` data.

Local V3 frontend architecture notes:

- `frontend/src/KnowledgeApp.tsx` acts as a route dispatcher and legacy compatibility layer.
- `frontend/src/app/user/UserAppShell.tsx` owns user navigation.
- `frontend/src/app/admin/AdminAppShell.tsx` owns admin navigation and the mock role guard surface.
- `frontend/src/utils/userKnowledgeApi.ts` exposes user-side API semantics.
- `frontend/src/utils/adminKnowledgeApi.ts` exposes admin-side API semantics.
- Current role separation uses `AppRole = "user" | "admin"` with localStorage. It is not a complete login, JWT, organization, or multi-tenant permission system.
- See `docs/v3-role-split-architecture.md` for the V3 route table and responsibility boundaries.

Next planned local work:

- Replace V3 placeholder admin pages with explicit `AdminItemsPage`, `AdminTagsPage`, and `AdminSettingsPage` modules.
- Move map detail-panel internals into `components/map` if the map surface grows further.
- Improve responsive QA for the map and review workbench.
- Add optional AI suggestion provider abstractions with a default noop provider, without making AI a core dependency.

Local V3 verification commands:

```sh
cd frontend
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/vite build
```

```powershell
Set-Location frontend
.\node_modules\.bin\tsc --noEmit
.\node_modules\.bin\vite build
```

This project is a collaboration between [Inference.net](https://inference.net) and [LAION](https://laion.ai). LAION curated the original dataset which is about ~100m scrapped scientific and research articles and Inference.net fine-tuned a custom model to extract structured summaries from the articles. This repo contains a visual explorer for a small subset of the extracted dataset.

View the live explorer at [https://aella.inference.net](https://aella.inference.net).

## Overview

A web application for exploring scientific papers with semantic embeddings, dimensionality reduction, and clustering visualizations.

## Architecture

- **Frontend**: React + TypeScript + Vite with D3.js for interactive visualizations
- **Backend**: Python FastAPI serving data from SQLite (D1 in production)
- **Storage**: SQLite locally, Cloudflare D1 + R2 in production

## Prerequisites

You'll need the following tools installed:

- **Python 3.11+** - [Download](https://www.python.org/downloads/)
- **uv** - Python dependency management - [Install](https://docs.astral.sh/uv/getting-started/installation/)
- **bun** - JavaScript runtime - [Install](https://bun.sh/)
- **Task** - Task runner - [Install](https://taskfile.dev/installation/)

## Setup

Install all dependencies:

```bash
task setup
```

This will install both backend and frontend dependencies.

## Quick Start

### 1. Get the Database

Download the database from R2:

```bash
task db:setup
```

This will download the SQLite database to `backend/data/db.sqlite`.

### 2. Run the Application

Run the backend and frontend in separate terminals:

**Backend (Terminal 1):**

```bash
task backend:dev
```

**Frontend (Terminal 2):**

```bash
task frontend:dev
```

The application will be available at:

- Frontend: `http://localhost:5173`
- API: `http://localhost:8787`
- API Docs: `http://localhost:8787/docs`

## Data Pipeline

> The code for the data pipeline that we used to construct this dataset is not yet open source, mostly because it was setup for a one-time process and not production-ready.

However, the general process was:

1. Initial data extraction and filtering

- Ran a pipeline to generate the summaries
- Excluded specific non-scientific content and failed summaries
- Compiled results for further processing

2. Semantic Embedding

- Generates 768-dimensional embeddings using SPECTER2 (allenai/specter2_base)
- Processes papers in batches with GPU acceleration support
- Stores embeddings as binary blobs for similarity search

3. Visualization & Clustering

- Reduces embeddings to 2D coordinates using UMAP with cosine distance
- Applies K-Means clustering with automatic optimization (20-60 clusters via silhouette scores)
- Generates initial cluster labels using TF-IDF analysis of titles and fields

4. LLM-Curated Labels

- Applies manually reviewed, domain-specific cluster labels
- Improves interpretability over automated TF-IDF labels

## Deployment

Deploy to Cloudflare:

```bash
task deploy
```

This will prompt you to deploy the backend API and/or frontend.

## Contributing

We welcome contributions to this project! Here's what you should know:

**Bug Fixes & Minor Improvements**

- Bug fixes are always welcome! Please submit a PR with a clear description of the issue and fix.
- Minor improvements to documentation, code quality, or performance are appreciated.

**New Features**

- This project is intentionally scoped as a one-time preview of this dataset.
- We are generally not planning to greatly expand the functionality beyond its current scope.
- If you want to add significant new features, we encourage you to fork the project and build on it!

**Before Submitting a PR**

- Ensure your code passes linting and formatting checks:
  ```bash
  task check
  ```
- Keep changes focused and well-documented.
- Test your changes with sample data when applicable.

## License

MIT License - see [LICENSE](LICENSE) file for details.
