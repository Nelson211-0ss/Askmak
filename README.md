# AskMak — how to run

Intelligent chatbot for Makerere University student support. This document lists the steps to run it locally.

**Layout:** API and jobs live under `backend/` (Express `server.js`, routes, services, `db/`, `scripts/`). Static HTML/CSS/JS are served from `frontend/public/`. The repo root keeps `package.json`, `.env`, and `docker-compose.yml`.

## Prerequisites

- **Node.js** and npm
- **Docker** and **Docker Compose** (for PostgreSQL with pgvector and MinIO)

## 1. Install dependencies

From the project root:

```bash
npm install
```

## 2. Configure environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and set at least:

| Variable | Notes |
|----------|--------|
| `OPENAI_API_KEY` | Required for the language model |
| `JWT_SECRET` | Use a long random string |
| `COOKIE_SECRET` | Use a different long random string |
| `ADMIN_PASSWORD` | Change if you use the admin UI |

The defaults in `.env.example` match the Docker services: Postgres on `localhost:5434`, MinIO on `localhost:9000`.

## 3. Start backing services (Postgres + MinIO)

**Option A — two commands**

```bash
docker compose up -d
npm run setup-minio
```

**Option B — one command** (starts Docker and creates MinIO buckets)

```bash
npm run setup
```

Service ports (from `docker-compose.yml`):

- PostgreSQL: **5434** (host) → 5432 (container)
- MinIO API: **9000**
- MinIO console: **9001**

## 4. Run the application

**Normal start**

```bash
npm start
```

**Development** (auto-restart on file changes)

```bash
npm run dev
```

The server prints a URL such as `http://localhost:3000/` (or the port set by `PORT` in `.env`). It listens on **127.0.0.1**, so open it from the same machine.

## 5. Optional — ingest documents

If you use the document ingestion pipeline:

```bash
npm run ingest
```

## npm scripts reference

| Script | Command | Purpose |
|--------|---------|---------|
| `start` | `node backend/server.js` | Run the server |
| `dev` | `nodemon backend/server.js` | Run with file watching |
| `setup` | `docker compose up -d && node backend/scripts/setup-minio.js` | Infra + MinIO buckets |
| `setup-minio` | `node backend/scripts/setup-minio.js` | Create MinIO buckets only |
| `ingest` | `node backend/scripts/ingest.js` | Run ingestion |

## Troubleshooting

- Ensure Docker containers are healthy before starting the app (`docker compose ps`).
- If MinIO errors appear on upload, run `npm run setup-minio` again after MinIO is up.
- Database connection issues: confirm `DATABASE_URL` in `.env` matches `docker-compose.yml` credentials and port **5434**.
