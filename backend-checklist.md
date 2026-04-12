# Backend Task Checklist

## Project Setup
- [ ] Initialize project with `npm init`
- [ ] Install core dependencies: `express`, `pg`, `pgvector`, `dotenv`, `cors`, `cookie-parser`, `helmet`, `bcrypt`, `jsonwebtoken`, `express-rate-limit`, `joi`, `marked`, `dompurify`, `nodemailer`, `cheerio`, `openai`, `pdf-parse`, `uuid`, `node-cron`, `multer`, `sharp`
- [ ] Install MinIO / S3 dependencies: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`
- [ ] Install dev dependencies: `nodemon`
- [ ] Create `server.js` entry point
- [ ] Create `.env` file with placeholders for all config values
- [ ] Create `.env.example` with documented variable names (no secrets)
- [ ] Add `.gitignore` for `node_modules/`, `.env`, and OS files
- [ ] Set up Express app with middleware stack (helmet, cors, cookie-parser, json parser, static files)
- [ ] Create modular route and service directories
- [ ] Set up error handling middleware (catch-all with proper JSON error responses)

## Docker Infrastructure (`docker-compose.yml`)
### Docker Compose Setup
- [ ] Create `docker-compose.yml` in project root
- [ ] Define `db` service using `pgvector/pgvector:pg17` image
- [ ] Map port `5432:5432` for local access from Node.js
- [ ] Mount `pgdata` named volume for persistent database storage
- [ ] Mount `./db/schema.sql` to `/docker-entrypoint-initdb.d/01-schema.sql` for auto-init
- [ ] Mount `./db/seed.sql` to `/docker-entrypoint-initdb.d/02-seed.sql` for initial data
- [ ] Set `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` environment variables
- [ ] Define `minio` service using `minio/minio` image
- [ ] Set MinIO command to `server /data --console-address ":9001"`
- [ ] Map port `9000:9000` for S3 API access
- [ ] Map port `9001:9001` for MinIO web console
- [ ] Mount `minio_data` named volume for persistent object storage
- [ ] Set `MINIO_ROOT_USER` and `MINIO_ROOT_PASSWORD` environment variables
- [ ] Define both named volumes (`pgdata`, `minio_data`)
- [ ] Add `depends_on` if needed for startup ordering
- [ ] Test `docker compose up -d` starts both services cleanly
- [ ] Test `docker compose down` stops services, `docker compose down -v` removes volumes

### MinIO Bucket Setup (`scripts/setup-minio.js`)
- [ ] Create script that runs on first setup to initialize MinIO buckets
- [ ] Connect to MinIO using `@aws-sdk/client-s3` with local endpoint (`http://localhost:9000`)
- [ ] Create `documents` bucket (scraped HTML, PDFs, raw knowledge base files)
- [ ] Create `uploads` bucket (user-uploaded images in chat)
- [ ] Create `exports` bucket (exported chat transcripts)
- [ ] Create `reference` bucket (static reference images: campus maps, org charts, process diagrams)
- [ ] Skip bucket creation if bucket already exists (idempotent)
- [ ] Log success/failure for each bucket
- [ ] Make it runnable as `node scripts/setup-minio.js`
- [ ] Add as npm script: `"setup-minio": "node scripts/setup-minio.js"`

## Environment Variables
- [ ] `PORT` — server port (default 3000)
- [ ] `DATABASE_URL` — PostgreSQL connection string (e.g., `postgresql://askmak:askmak_dev@localhost:5432/askmak`)
- [ ] `JWT_SECRET` — secret for signing JWTs
- [ ] `COOKIE_SECRET` — secret for signed cookies
- [ ] `OPENAI_API_KEY` — OpenAI API key
- [ ] `OPENAI_MODEL` — model name (e.g., gpt-4o)
- [ ] `EMBEDDING_MODEL` — embedding model (e.g., text-embedding-3-small)
- [ ] `MINIO_ENDPOINT` — MinIO S3 API endpoint (default `http://localhost:9000`)
- [ ] `MINIO_ACCESS_KEY` — MinIO access key (matches `MINIO_ROOT_USER`)
- [ ] `MINIO_SECRET_KEY` — MinIO secret key (matches `MINIO_ROOT_PASSWORD`)
- [ ] `MINIO_BUCKET_DOCUMENTS` — documents bucket name (default `documents`)
- [ ] `MINIO_BUCKET_UPLOADS` — uploads bucket name (default `uploads`)
- [ ] `MINIO_BUCKET_EXPORTS` — exports bucket name (default `exports`)
- [ ] `MINIO_BUCKET_REFERENCE` — reference images bucket name (default `reference`)
- [ ] `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` — email config for verification
- [ ] `ADMIN_EMAIL` — default admin account email
- [ ] `ADMIN_PASSWORD` — default admin account password (initial setup only)
- [ ] `NODE_ENV` — development or production

## MinIO / Object Storage Service (`services/storage.js`)
- [ ] Initialize S3 client pointing to MinIO endpoint with credentials
- [ ] `uploadFile(bucket, key, buffer, contentType)` — upload a file to a bucket
- [ ] `getPresignedUrl(bucket, key, expiresIn)` — generate a presigned GET URL (default 1 hour)
- [ ] `deleteFile(bucket, key)` — delete a file from a bucket
- [ ] `listFiles(bucket, prefix)` — list files in a bucket with optional prefix filter
- [ ] `fileExists(bucket, key)` — check if a file exists
- [ ] `getFileStream(bucket, key)` — get a readable stream for proxying files through Express
- [ ] Handle connection errors gracefully with meaningful error messages

## Database (`config/db.js` + `db/schema.sql`)
### Schema Setup
- [ ] Create `pgvector` extension (`CREATE EXTENSION IF NOT EXISTS vector`)
- [ ] Create `users` table: id (UUID, PK), full_name, email (unique), password_hash, role (student/admin), email_verified (boolean), verification_code, created_at, updated_at
- [ ] Create `chats` table: id (UUID, PK), user_id (FK nullable), guest_token (varchar nullable), title, created_at, updated_at
- [ ] Create `messages` table: id (UUID, PK), chat_id (FK), role (user/assistant/system), content (text), tokens_used (int), sources (jsonb nullable), confidence_score (float nullable), image_key (varchar nullable — MinIO object key for attached image), created_at
- [ ] Create `documents` table: id (UUID, PK), source_url, title, content (text), chunk_index (int), embedding (vector(1536)), category (varchar), metadata (jsonb), image_keys (jsonb nullable — array of MinIO keys for images associated with this chunk), indexed_at
- [ ] Create `user_memories` table: id (UUID, PK), user_id (FK), memory_key, memory_value, created_at, updated_at
- [ ] Create `escalations` table: id (UUID, PK), chat_id (FK), message_id (FK), reason (text), status (pending/in_progress/resolved/dismissed), admin_response (text nullable), created_at, resolved_at
- [ ] Create `feedback` table: id (UUID, PK), message_id (FK), user_id (FK nullable), guest_token (varchar nullable), rating (boolean), comment (text nullable), created_at
- [ ] Add indexes: email unique on users, HNSW index on documents.embedding, chat_id index on messages, user_id index on chats, status index on escalations
- [ ] Add full-text search index (tsvector) on documents.content for hybrid search
- [ ] Create database connection pool using `pg` Pool
- [ ] Test connection on server startup with a simple query

## Authentication (`routes/auth.js` + `middleware/auth.js`)
### Signup Flow
- [ ] POST `/api/auth/signup` — validate full_name, email, password
- [ ] Validate email ends with `@students.mak.ac.ug` using `joi`
- [ ] Check email not already registered
- [ ] Hash password with `bcrypt` (12 salt rounds)
- [ ] Generate 6-digit verification code
- [ ] Insert user into database with `email_verified = false`
- [ ] Send verification email with code via `nodemailer`
- [ ] Return success message (do not auto-login until verified)

### Email Verification
- [ ] POST `/api/auth/verify` — accept email and verification code
- [ ] Check code matches and hasn't expired (15 min window)
- [ ] Set `email_verified = true`
- [ ] Generate JWT and set as httpOnly cookie
- [ ] Return user profile data

### Resend Verification
- [ ] POST `/api/auth/resend-verification` — generate new code and send email
- [ ] Rate limit: max 3 resends per hour

### Login
- [ ] POST `/api/auth/login` — validate email and password
- [ ] Check email exists and is verified
- [ ] Compare password with bcrypt
- [ ] Generate JWT (payload: user id, role, email) with 7-day expiry
- [ ] Set JWT as httpOnly, secure, sameSite cookie
- [ ] Return user profile (id, name, email, role)

### Logout
- [ ] POST `/api/auth/logout` — clear the auth cookie

### Auth Middleware
- [ ] Extract JWT from httpOnly cookie
- [ ] Verify and decode token
- [ ] Attach user object to `req.user`
- [ ] Return 401 for invalid/expired tokens
- [ ] Create `optionalAuth` middleware that attaches user if present but doesn't block guests

### Admin Middleware
- [ ] Check `req.user.role === 'admin'`
- [ ] Return 403 for non-admin users

### Guest Identification
- [ ] Middleware to check for guest cookie, generate UUID and set signed cookie if absent
- [ ] Attach `req.guestToken` for guest users

## Rate Limiting (`middleware/rateLimit.js`)
- [ ] Guest rate limit: 20 messages per hour per IP/cookie
- [ ] Authenticated rate limit: 100 messages per hour per user
- [ ] Auth endpoints rate limit: 10 attempts per 15 minutes per IP (prevent brute force)
- [ ] Admin endpoints: 200 requests per hour
- [ ] Upload rate limit: 30 image uploads per hour per user, 10 per hour for guests
- [ ] Return meaningful error messages with retry-after headers

## Image Upload & Processing (`routes/upload.js`)
- [ ] POST `/api/upload/image` — accept image upload via `multer` (memory storage)
- [ ] Validate file type (jpg, png, gif, webp only)
- [ ] Validate file size (max 10MB)
- [ ] Process image with `sharp`: resize to max 2048px on longest side, compress to 80% quality
- [ ] Generate unique key: `uploads/{user_id or guest_token}/{chat_id}/{uuid}.{ext}`
- [ ] Upload processed image to MinIO `uploads` bucket via storage service
- [ ] Save a smaller thumbnail (300px) to MinIO for chat history display
- [ ] Return the MinIO object key (not the presigned URL — generate URLs on demand)
- [ ] GET `/api/upload/url/:key` — generate and return a presigned URL for a stored image
- [ ] Presigned URLs expire after 1 hour, frontend re-fetches if expired

## Chat API (`routes/chat.js`)
### Chat CRUD
- [ ] POST `/api/chats` — create new chat (associate with user_id or guest_token)
- [ ] GET `/api/chats` — list user's chats (or guest's chats by token), ordered by updated_at desc
- [ ] GET `/api/chats/:id` — get single chat with all messages (include presigned URLs for any image_keys)
- [ ] PATCH `/api/chats/:id` — rename chat (update title)
- [ ] DELETE `/api/chats/:id` — delete chat, its messages, and associated uploaded images from MinIO
- [ ] Auto-generate chat title from first user message (use OpenAI to summarize into 4-6 words)

### Messaging
- [ ] POST `/api/chats/:id/messages` — send a message and get AI response
- [ ] Accept optional `image_key` field for messages with attached images
- [ ] Validate message content (non-empty, max 2000 chars) or valid image_key
- [ ] Save user message to database (with image_key if present)
- [ ] If image attached, generate presigned URL and include as `image_url` content block in OpenAI request (multimodal/vision)
- [ ] Build context: system prompt + user memories + recent messages (last 8) + tool definitions for MCP
- [ ] Call OpenAI API with assembled context and tool schemas
- [ ] Handle tool calls: execute MCP handlers, return results to OpenAI for final response
- [ ] Stream final response via SSE (content-type: text/event-stream)
- [ ] Include image presigned URLs in streamed response when the agent returns reference images
- [ ] Save completed assistant message to database with token count and sources
- [ ] Calculate confidence score based on RAG similarity scores
- [ ] If confidence is low, append "I'm not fully sure about this" disclaimer and offer escalation

### Chat Search
- [ ] GET `/api/chats/search?q=` — full-text search across user's message history
- [ ] Return matching chats with highlighted snippets

## MCP Tool Handlers (`services/mcp/`)
### Architecture
- [ ] Define MCP handlers as internal service functions (not separate processes)
- [ ] Create OpenAI tool/function schemas for each MCP tool
- [ ] Build a tool dispatcher that maps tool call names to handler functions
- [ ] Handle tool call results and feed them back to OpenAI for final response generation
- [ ] Log all tool calls and their results for debugging and admin analytics

### Knowledge Base MCP (`services/mcp/knowledge.js`)
- [ ] `search_knowledge_base` tool — performs hybrid vector + keyword search on the documents table
  - [ ] Parameters: query (string), category (optional string), limit (optional int, default 5)
  - [ ] Returns: array of {title, content, source_url, similarity_score, category}
  - [ ] Include image presigned URLs if the document chunk has associated images
- [ ] `get_article` tool — fetch full content of a specific knowledge base article by source URL
  - [ ] Parameters: source_url (string)
  - [ ] Returns: {title, content, source_url, images[]}
- [ ] `list_categories` tool — list available knowledge base categories with document counts
  - [ ] Returns: array of {category, count}
- [ ] `get_recent_articles` tool — get the N most recently indexed articles
  - [ ] Parameters: limit (optional int, default 5)
  - [ ] Returns: array of {title, source_url, indexed_at, category}

### Web Fetch MCP (`services/mcp/web.js`)
- [ ] `fetch_mak_page` tool — fetch and parse a live Makerere University page on demand
  - [ ] Parameters: url (string)
  - [ ] Restrict URLs to `*.mak.ac.ug` domains only (reject all others)
  - [ ] Fetch page using `cheerio`, strip boilerplate, return clean text content
  - [ ] Returns: {title, content, url, fetched_at}
- [ ] `get_upcoming_events` tool — scrape `events.mak.ac.ug` for current/upcoming events
  - [ ] Returns: array of {title, date, location, type, url}
- [ ] `get_latest_news` tool — scrape the news section of `www.mak.ac.ug`
  - [ ] Parameters: limit (optional int, default 5)
  - [ ] Returns: array of {title, date, summary, url}
- [ ] `check_academic_calendar` tool — return current semester info, deadlines, and exam periods
  - [ ] Returns: {current_semester, registration_deadline, exam_period, key_dates[]}
  - [ ] Source: scraped or manually maintained academic calendar data

### File Storage MCP (`services/mcp/files.js`)
- [ ] `get_reference_image` tool — get a presigned URL for a reference image by name/tag
  - [ ] Parameters: name (string) or tag (string)
  - [ ] Search MinIO `reference` bucket metadata for matching images
  - [ ] Returns: {name, url (presigned), description}
  - [ ] Use cases: campus map, building locations, process flowcharts, org charts
- [ ] `list_reference_images` tool — list all available reference images with metadata
  - [ ] Parameters: category (optional string)
  - [ ] Returns: array of {name, category, description, url (presigned)}
- [ ] `get_document_file` tool — retrieve metadata and presigned URL for a stored document
  - [ ] Parameters: document_id or source_url
  - [ ] Returns: {title, url (presigned), content_type, size}

### Database MCP (`services/mcp/database.js`)
- [ ] `get_user_context` tool — retrieve user profile and personalization memories
  - [ ] Parameters: user_id (string)
  - [ ] Returns: {name, program, year, hall, preferences[], other_memories[]}
  - [ ] Only callable when user is authenticated
- [ ] `get_escalation_status` tool — check if a user has a pending escalation
  - [ ] Parameters: user_id or chat_id
  - [ ] Returns: {has_pending, escalation_id, status, created_at}
- [ ] `search_faq` tool — structured keyword search over manually-added FAQ entries
  - [ ] Parameters: query (string)
  - [ ] Returns: array of {question, answer, category}

### OpenAI Tool Schema Registration
- [ ] Define JSON schema for each MCP tool following OpenAI function calling format
- [ ] Register all tools in a central tool registry (`services/mcp/registry.js`)
- [ ] Include clear descriptions in each schema so the model knows when to use each tool
- [ ] Support enabling/disabling individual tools per request (e.g., skip file tools for simple greetings)

## RAG Pipeline (`services/embedding.js`)
### Embedding Service
- [ ] Function to generate embedding for a text string using OpenAI `text-embedding-3-small`
- [ ] Batch embedding function for multiple texts
- [ ] Error handling and retry logic for API failures

### Document Retrieval (used by Knowledge Base MCP)
- [ ] Function to perform vector similarity search (cosine distance) on documents table
- [ ] Function to perform full-text search using PostgreSQL tsvector
- [ ] Hybrid search: combine vector results and full-text results, deduplicate, re-score
- [ ] Accept optional category filter parameter
- [ ] Return top 5 results with content, source URL, title, similarity score, and image keys
- [ ] Format retrieved documents into a structured context block for the LLM prompt
- [ ] Resolve image_keys to presigned URLs when returning results

### Query Processing
- [ ] Detect query intent/category (admissions, fees, IT, academic, general) using keyword matching or a lightweight classifier
- [ ] Expand abbreviations common at Makerere (ACMIS, PRN, CoBAMS, CEDAT, CHS, etc.)
- [ ] Handle greetings and off-topic queries without hitting the RAG pipeline

## OpenAI Integration (`services/openai.js`)
### System Prompt
- [ ] Define base system prompt: identity (AskMak, Makerere University support assistant), tone (friendly, professional, helpful), constraints (only answer Makerere-related queries, cite sources, admit uncertainty)
- [ ] Inject user memories into system prompt for personalized context
- [ ] Include instructions for when to use each MCP tool vs answering from context
- [ ] Include instructions for returning reference images when appropriate (campus map, diagrams)
- [ ] Add anti-prompt-injection instructions

### Agentic Tool Use
- [ ] Send MCP tool schemas as `tools` parameter in the OpenAI API call
- [ ] Detect `tool_calls` in the response
- [ ] Execute each tool call against the corresponding MCP handler
- [ ] Feed tool results back to OpenAI as `tool` role messages
- [ ] Support multi-step tool use (model calls a tool, gets result, calls another tool, then generates final response)
- [ ] Set a max tool call depth (e.g., 3 rounds) to prevent infinite loops

### Multimodal / Vision
- [ ] When a message includes an image_key, build a multimodal content array with both text and image_url blocks
- [ ] Generate presigned URL for the image and pass as image_url to OpenAI
- [ ] Handle vision-specific errors (unsupported image format, image too large)

### Streaming
- [ ] Use OpenAI streaming API to get token-by-token responses
- [ ] Pipe streamed tokens to the client via SSE
- [ ] Accumulate full response for database storage
- [ ] Track token usage from the stream completion
- [ ] Handle tool call interruptions during streaming (pause stream, execute tool, resume with new call)

### Title Generation
- [ ] Function to generate a short chat title from the first message using a fast model call
- [ ] Fallback: truncate first message to 50 chars if API call fails

## Memory / Personalization (`services/memory.js`)
- [ ] After each conversation turn, analyze for extractable facts about the user
- [ ] Store extracted facts in `user_memories` (e.g., "program: Computer Science", "year: 2", "hall: Lumumba")
- [ ] Update existing memories if new info contradicts old (e.g., year changes from 1 to 2)
- [ ] GET `/api/memories` — list all stored memories for authenticated user
- [ ] DELETE `/api/memories/:id` — delete a specific memory
- [ ] Context summarization: when conversation exceeds 10 messages, summarize older messages into a paragraph and use that instead of raw history

## Escalation System
- [ ] POST `/api/escalations` — create escalation from a chat (requires chat_id, message_id, reason)
- [ ] Detect auto-escalation triggers in bot responses (low confidence, repeated "I don't know", user frustration signals)
- [ ] Store escalation with status "pending"
- [ ] GET `/api/escalations` (admin only) — list all escalations with filters (status, date range)
- [ ] PATCH `/api/escalations/:id` (admin only) — update status, add admin response
- [ ] When admin responds to escalation, create a system message in the original chat notifying the user

## Feedback
- [ ] POST `/api/feedback` — submit thumbs up/down on a message (with optional comment)
- [ ] Associate with user_id or guest_token
- [ ] Prevent duplicate feedback on the same message

## Knowledge Base Scraper (`services/scraper.js` + `scripts/ingest.js`)
### Scraper
- [ ] Function to scrape `answers.mak.ac.ug` — fetch article list, follow links, extract title and body content using `cheerio`
- [ ] Function to scrape `www.mak.ac.ug` — target key pages: admissions, programs, fees, contacts, about, news
- [ ] Function to scrape `events.mak.ac.ug` for upcoming events
- [ ] Strip navigation, headers, footers, and boilerplate from scraped HTML
- [ ] Convert cleaned HTML to plain text or markdown
- [ ] Handle pagination on article listing pages
- [ ] Respect rate limits when scraping (add delays between requests)
- [ ] Extract `<img>` tags from scraped pages, download images, and store in MinIO `documents` bucket
- [ ] Store image MinIO keys in document chunk metadata for later retrieval
- [ ] Track image source URLs to avoid re-downloading unchanged images

### Ingestion Pipeline (`scripts/ingest.js`)
- [ ] Load scraped content (or read from local files/PDFs)
- [ ] Split content into chunks (500-800 tokens, 100 token overlap, split at paragraph/heading boundaries)
- [ ] Assign category and metadata to each chunk
- [ ] Associate relevant image keys from scraped images with their parent chunks
- [ ] Generate embeddings for all chunks (batch API calls)
- [ ] Upsert chunks into `documents` table (update if source_url + chunk_index exists, insert if new)
- [ ] Delete stale documents that no longer exist at source
- [ ] Clean up orphaned images in MinIO when their parent documents are deleted
- [ ] Log ingestion stats: documents processed, chunks created, images stored, errors
- [ ] Make it runnable as `node scripts/ingest.js`
- [ ] Support incremental updates (only re-process changed content)

### Manual Content
- [ ] Support ingesting local markdown or text files from a `content/` directory
- [ ] Support PDF ingestion using `pdf-parse`
- [ ] Support uploading reference images to MinIO `reference` bucket with metadata tags
- [ ] Add a way for admin to trigger re-ingestion via API

### Reference Image Management
- [ ] Script or admin endpoint to upload reference images (campus map, building photos, org charts)
- [ ] Store with metadata: name, category, description, tags
- [ ] These images are available to the agent via the File Storage MCP for inclusion in responses

## Scheduled Jobs
- [ ] Weekly cron job to re-scrape and re-ingest knowledge base (use `node-cron`)
- [ ] Daily job to purge guest chats older than 30 days and their associated uploads from MinIO
- [ ] Daily job to generate admin summary stats
- [ ] Daily job to clean up expired/orphaned files in MinIO uploads bucket

## Security
- [ ] Helmet.js for security headers
- [ ] CORS configured to allow only the application's own origin
- [ ] CSRF protection for state-changing requests
- [ ] Input sanitization on all user inputs
- [ ] SQL injection prevention (parameterized queries only, never string concatenation)
- [ ] Prompt injection defense in system prompt
- [ ] Rate limiting on all endpoints
- [ ] httpOnly, secure, sameSite cookies for JWT and guest tokens
- [ ] Environment variable validation on startup (fail fast if critical vars missing)
- [ ] Restrict MCP web fetch tool to `*.mak.ac.ug` domains only
- [ ] Validate uploaded file MIME types server-side (not just extension)
- [ ] Scan uploaded images for exif data stripping (prevent location/metadata leaks)
- [ ] MinIO bucket policies: no public access, presigned URLs only

## Error Handling
- [ ] Global error handling middleware that returns consistent JSON error format
- [ ] Distinguish between client errors (4xx) and server errors (5xx)
- [ ] Log server errors with stack traces (use `console.error` or a logger like `pino`)
- [ ] Never expose stack traces or internal details to clients in production
- [ ] Handle OpenAI API errors gracefully (rate limits, timeouts, outages) with user-friendly messages
- [ ] Handle database connection failures with retry logic
- [ ] Handle MinIO connection failures gracefully (storage service unavailable message)
- [ ] Handle MCP tool execution failures (return error to OpenAI so it can respond without the tool)

## Testing Considerations
- [ ] Test signup with valid and invalid email domains
- [ ] Test login with correct and incorrect credentials
- [ ] Test chat creation, message sending, and retrieval for both guests and authenticated users
- [ ] Test rate limiting triggers correctly
- [ ] Test RAG retrieval returns relevant results for known queries
- [ ] Test escalation creation and admin response flow
- [ ] Test guest-to-authenticated chat merge
- [ ] Test SSE streaming delivers complete responses
- [ ] Test image upload, storage in MinIO, and presigned URL generation
- [ ] Test multimodal message sending (text + image) produces vision-aware responses
- [ ] Test MCP tool calls execute correctly and results are incorporated into responses
- [ ] Test MCP web fetch tool rejects non-mak.ac.ug URLs
- [ ] Test Docker Compose starts both db and minio cleanly
- [ ] Test `scripts/setup-minio.js` creates all buckets idempotently
- [ ] Test `scripts/ingest.js` scrapes, chunks, embeds, and stores documents with images

## Deployment Preparation
- [ ] Create `package.json` start script (`node server.js`)
- [ ] Create dev script with `nodemon` for auto-restart during development
- [ ] Add setup scripts: `"setup": "docker compose up -d && node scripts/setup-minio.js"`
- [ ] Add ingest script: `"ingest": "node scripts/ingest.js"`
- [ ] Create `db/schema.sql` that can be run to initialize the database from scratch
- [ ] Create `db/seed.sql` for initial admin account and sample data
- [ ] Add health check endpoint: GET `/api/health` (checks db connection, MinIO connection, OpenAI reachability)
- [ ] Configure Express to serve static files from `public/` directory
- [ ] Set up proper logging for production
- [ ] Document full local setup: install Docker, `docker compose up -d`, `npm install`, `npm run setup-minio`, `npm run ingest`, `npm run dev`
