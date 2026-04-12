# Admin Dashboard Task Checklist

## Admin Access & Authentication
- [ ] Admin login uses the same login page but redirects to `/admin.html` based on role
- [ ] Backend middleware validates admin role on all `/api/admin/*` endpoints
- [ ] Prevent non-admin users from accessing `admin.html` (redirect to chat)
- [ ] Session timeout: auto-logout after 30 minutes of inactivity
- [ ] Seed script creates default admin account on first setup

## Dashboard Layout
- [ ] Fixed top header with AskMak Admin branding, admin name, and logout button
- [ ] Left sidebar navigation with menu items for each section
- [ ] Main content area that loads the selected section
- [ ] Responsive design: sidebar collapses to hamburger menu on smaller screens
- [ ] Color scheme consistent with main app (dark `#231F20` sidebar, red `#ed1c24` active states, gold `#d2ab67` highlights)

## Overview / Home Section
### Key Metrics Cards (top row)
- [ ] Total conversations today
- [ ] Total conversations this week
- [ ] Total conversations this month
- [ ] Active users (unique authenticated users who chatted in last 7 days)
- [ ] Guest sessions this week
- [ ] Pending escalations count (highlighted in red if > 0)
- [ ] Average confidence score across all bot responses today
- [ ] Estimated API cost this month (based on token usage)

### Charts & Visualizations
- [ ] Line chart: conversations per day over last 30 days
- [ ] Bar chart: messages by hour of day (identify peak usage times)
- [ ] Pie/donut chart: query categories distribution (admissions, fees, IT, academic, general)
- [ ] Trend indicator: percentage change vs previous period on each metric card
- [ ] Use a lightweight chart library (Chart.js)

### Recent Activity Feed
- [ ] Live-updating list of recent chats with timestamp, user/guest label, and first message preview
- [ ] Click to view the full conversation transcript
- [ ] Color-coded badges: green for resolved, yellow for active, red for escalated

## Escalation Management Section
### Escalation Queue
- [ ] Table listing all escalated conversations
- [ ] Columns: Date, User (name or "Guest"), First message preview, Escalation reason, Status, Actions
- [ ] Filter by status: All, Pending, In Progress, Resolved, Dismissed
- [ ] Filter by date range
- [ ] Sort by newest first (default), oldest first, or by urgency
- [ ] Pagination for large result sets
- [ ] Badge count in sidebar showing pending escalations

### Escalation Detail View
- [ ] Full chat transcript with all messages (user and bot)
- [ ] Display any images attached to messages (loaded via presigned MinIO URLs)
- [ ] Highlighted message that triggered the escalation
- [ ] Escalation reason displayed prominently
- [ ] Admin response textarea
- [ ] Action buttons: "Respond & Resolve", "Mark In Progress", "Dismiss"
- [ ] Admin response gets inserted as a system message in the user's chat
- [ ] History of admin actions on this escalation (audit trail)

### Auto-Escalation Rules Display
- [ ] Show current auto-escalation triggers and their thresholds
- [ ] Low confidence threshold (currently < 0.65)
- [ ] Consecutive uncertain responses threshold (currently 2)
- [ ] Negative feedback threshold (currently 2 consecutive thumbs down)
- [ ] User explicit request keywords ("talk to someone", "human", "help desk")

## Unresolved Requests Section
### Detection Criteria
- [ ] Bot responded with hedge phrases ("I'm not sure", "I don't have information", "I couldn't find")
- [ ] Confidence score below threshold
- [ ] User sent follow-up messages indicating dissatisfaction ("that's wrong", "not helpful", "no")
- [ ] No positive feedback received on the response

### Unresolved Requests Table
- [ ] Columns: Date, User, Query, Bot Response (truncated), Confidence Score, Feedback, Actions
- [ ] Filter by date range, category, confidence range
- [ ] Sort by confidence score (lowest first) to prioritize worst answers
- [ ] Click to expand and see the full conversation context
- [ ] Action buttons: "Create FAQ Entry", "Add to Knowledge Base", "Dismiss", "Escalate Manually"

### Knowledge Gap Analysis
- [ ] Aggregate unresolved queries by topic/category
- [ ] Show a ranked list of most common unanswered topics
- [ ] Display suggested content that should be added to the knowledge base
- [ ] Track gap resolution over time (did adding content reduce unresolved queries on that topic?)

## User Management Section
### User List
- [ ] Table of all registered users
- [ ] Columns: Name, Email, Sign-up Date, Last Active, Total Chats, Status (active/inactive/unverified)
- [ ] Search by name or email
- [ ] Filter by status, date range
- [ ] Pagination
- [ ] Click to view user detail

### User Detail View
- [ ] User profile information (name, email, sign-up date, last active)
- [ ] Number of chats and total messages
- [ ] Stored memories/personalization data
- [ ] List of user's chats (click to view transcript)
- [ ] Feedback history (thumbs up/down ratio)
- [ ] Admin actions: Deactivate account, Reset password, Delete account

## Conversation Browser Section
- [ ] Searchable table of all conversations (both guest and authenticated)
- [ ] Columns: Date, User/Guest, Title, Messages Count, Avg Confidence, Has Escalation, Has Negative Feedback, Has Images
- [ ] Search by message content across all conversations
- [ ] Filter by: user type (guest/authenticated), date range, has escalation, has negative feedback, has images, confidence range
- [ ] Click to open full transcript in a read-only chat view
- [ ] Display attached images inline in transcript view (loaded from MinIO presigned URLs)
- [ ] Export conversation as text file

## Feedback & Satisfaction Section
### Overview
- [ ] Overall satisfaction rate (thumbs up / total feedback as percentage)
- [ ] Satisfaction trend over last 30 days (line chart)
- [ ] Average satisfaction by query category (bar chart)

### Feedback Log
- [ ] Table of all feedback submissions
- [ ] Columns: Date, User/Guest, Message Preview, Bot Response Preview, Rating (thumbs up/down), Comment
- [ ] Filter by rating, date range, category
- [ ] Click to see full conversation context
- [ ] Export feedback data as CSV

### Negative Feedback Analysis
- [ ] List of messages that received thumbs down, grouped by topic
- [ ] Identify patterns in negative feedback (common failure modes)
- [ ] Link to related unresolved requests or knowledge gaps

## Knowledge Base Management Section
### Document Browser
- [ ] Table of all ingested document chunks
- [ ] Columns: Title, Source URL, Category, Chunk Index, Has Images, Indexed Date
- [ ] Search by content or title
- [ ] Filter by category, source, has images
- [ ] Click to view chunk content, metadata, and associated images (loaded from MinIO)
- [ ] Delete individual chunks or all chunks from a source (also deletes associated images from MinIO)

### Manual Content Entry
- [ ] Form to add a new FAQ or knowledge article
- [ ] Fields: Title, Content (textarea with markdown support), Category (dropdown), Source URL (optional)
- [ ] Image upload field: attach images to the knowledge entry (stored in MinIO `documents` bucket)
- [ ] Image preview for attached images before saving
- [ ] Auto-generate embedding on save and insert into documents table
- [ ] Edit existing manually-added entries (including adding/removing images)
- [ ] Delete manually-added entries (also cleans up images from MinIO)

### Ingestion Controls
- [ ] Button to trigger full re-scrape and re-ingestion of all sources
- [ ] Button to re-scrape individual sources (answers.mak.ac.ug, www.mak.ac.ug, events.mak.ac.ug)
- [ ] Display last ingestion timestamp per source
- [ ] Display ingestion stats: total documents, total chunks, total images stored, chunks per source
- [ ] Ingestion log: show recent ingestion runs with stats (documents processed, chunks created/updated/deleted, images downloaded, errors)
- [ ] Progress indicator during active ingestion

### Source Management
- [ ] List of configured scraping sources with URLs
- [ ] Add new source URL for scraping
- [ ] Remove a source (and optionally delete its associated chunks and images from MinIO)
- [ ] Set scraping schedule per source (weekly, daily, manual only)

### Reference Image Management
- [ ] Dedicated sub-section for managing reference images (campus maps, org charts, diagrams)
- [ ] Upload form: image file, name, category (dropdown: maps, buildings, processes, org_charts, guides), description, tags
- [ ] Table listing all reference images with thumbnail preview, name, category, description, upload date
- [ ] Click to view full-size image
- [ ] Edit metadata (name, category, description, tags)
- [ ] Delete reference images (removes from MinIO `reference` bucket)
- [ ] These images are what the MCP File Storage tool serves to the chatbot agent

## MCP Tools Monitoring Section
### Tool Usage Overview
- [ ] Table of all MCP tools with usage counts (calls per day/week/month)
- [ ] Bar chart: tool usage distribution
- [ ] Average execution time per tool
- [ ] Error rate per tool

### Tool Call Log
- [ ] Table of recent tool calls made by the agent
- [ ] Columns: Timestamp, Chat ID, Tool Name, Parameters (truncated), Result (truncated), Execution Time, Success/Failure
- [ ] Filter by tool name, date range, success/failure
- [ ] Click to expand and see full parameters and results
- [ ] Identify which queries trigger which tools (helps optimize tool descriptions)

### Tool Configuration
- [ ] Enable/disable individual MCP tools
- [ ] Edit tool descriptions (influences when the model decides to call them)
- [ ] View the JSON schema for each tool
- [ ] Test a tool manually by providing parameters and viewing the result

## Storage Monitoring Section
### MinIO Overview
- [ ] Total storage used across all buckets
- [ ] Storage used per bucket (documents, uploads, exports, reference) with bar chart
- [ ] Total file count per bucket
- [ ] Link to MinIO web console (localhost:9001) for advanced management

### Uploads Browser
- [ ] Table of uploaded files in the `uploads` bucket
- [ ] Columns: Filename, Uploader (user/guest), Chat ID, Size, Upload Date, Thumbnail
- [ ] Filter by uploader, date range, file size
- [ ] Click to view full image
- [ ] Delete individual uploads
- [ ] Bulk delete old uploads (e.g., all uploads older than 90 days)

### Storage Cleanup
- [ ] Button to trigger orphan cleanup (files in MinIO not referenced by any message or document)
- [ ] Display orphan scan results before deletion (with confirmation)
- [ ] Show last cleanup timestamp and stats

## Performance Analytics Section
### Response Quality Metrics
- [ ] Average confidence score trend over time
- [ ] Distribution of confidence scores (histogram)
- [ ] Percentage of responses above/below confidence threshold
- [ ] Average response time (from user message to first SSE token)

### Usage Metrics
- [ ] Total tokens consumed (input + output) per day/week/month
- [ ] Estimated API cost per day/week/month
- [ ] Token usage breakdown: system prompt vs context vs user input vs response vs tool calls
- [ ] Most active hours and days
- [ ] Peak concurrent users
- [ ] Image uploads per day/week/month
- [ ] Storage growth trend over time

### Category Analytics
- [ ] Number of queries per category over time
- [ ] Resolution rate per category (percentage where user gave positive feedback or didn't escalate)
- [ ] Average confidence score per category
- [ ] Identify categories that need more knowledge base content

### MCP Analytics
- [ ] Most frequently called tools
- [ ] Tool success rate over time
- [ ] Queries that resulted in tool calls vs direct answers (ratio)
- [ ] Average number of tool calls per conversation

## System Settings Section (admin only)
### Chatbot Configuration
- [ ] Edit the base system prompt
- [ ] Adjust confidence threshold for auto-escalation
- [ ] Set guest rate limit (messages per hour)
- [ ] Set authenticated user rate limit (messages per hour)
- [ ] Toggle guest mode on/off
- [ ] Set guest chat retention period (days)

### Model Configuration
- [ ] Display current OpenAI model in use
- [ ] Display current embedding model in use
- [ ] Toggle streaming on/off (for debugging)

### MCP Tool Configuration
- [ ] Toggle individual MCP tools on/off
- [ ] Edit tool descriptions to influence model tool selection behavior
- [ ] Set max tool call depth per request (default 3)
- [ ] Configure allowed domains for the web fetch MCP tool

### Storage Configuration
- [ ] Display MinIO connection status
- [ ] Display bucket names and their purposes
- [ ] Set max upload file size
- [ ] Set presigned URL expiry duration
- [ ] Set upload retention period for guest uploads
- [ ] Configure auto-cleanup schedule for orphaned files

### Notification Settings
- [ ] Email notification to admin when new escalation is created
- [ ] Daily summary email with key metrics
- [ ] Alert when API cost exceeds threshold
- [ ] Alert when storage usage exceeds threshold

## Admin Dashboard API Endpoints
- [ ] GET `/api/admin/stats` — overview metrics (total chats, users, escalations, storage usage, etc.)
- [ ] GET `/api/admin/stats/timeseries` — time-series data for charts (accepts period parameter)
- [ ] GET `/api/admin/stats/categories` — query category distribution
- [ ] GET `/api/admin/stats/tools` — MCP tool usage statistics
- [ ] GET `/api/admin/stats/storage` — MinIO storage metrics per bucket
- [ ] GET `/api/admin/escalations` — list escalations with filters and pagination
- [ ] GET `/api/admin/escalations/:id` — single escalation with full chat transcript and images
- [ ] PATCH `/api/admin/escalations/:id` — update escalation status and admin response
- [ ] GET `/api/admin/unresolved` — list unresolved requests with filters
- [ ] PATCH `/api/admin/unresolved/:id` — dismiss or escalate an unresolved request
- [ ] GET `/api/admin/users` — list users with search and filters
- [ ] GET `/api/admin/users/:id` — user detail with chat list
- [ ] GET `/api/admin/conversations` — list all conversations with filters
- [ ] GET `/api/admin/conversations/:id` — full conversation transcript with image URLs
- [ ] GET `/api/admin/feedback` — list feedback with filters
- [ ] GET `/api/admin/feedback/export` — export feedback as CSV
- [ ] GET `/api/admin/documents` — list document chunks with filters
- [ ] POST `/api/admin/documents` — add manual FAQ/knowledge entry (with optional image uploads)
- [ ] PUT `/api/admin/documents/:id` — edit manual entry
- [ ] DELETE `/api/admin/documents/:id` — delete a document chunk and associated MinIO images
- [ ] POST `/api/admin/ingest` — trigger re-ingestion (accepts source parameter)
- [ ] GET `/api/admin/ingest/status` — check ingestion status and history
- [ ] GET `/api/admin/reference-images` — list reference images with presigned URLs
- [ ] POST `/api/admin/reference-images` — upload a new reference image with metadata
- [ ] PUT `/api/admin/reference-images/:id` — update reference image metadata
- [ ] DELETE `/api/admin/reference-images/:id` — delete a reference image from MinIO
- [ ] GET `/api/admin/tools` — list MCP tools with usage stats
- [ ] GET `/api/admin/tools/log` — tool call history with filters
- [ ] PUT `/api/admin/tools/:name` — update tool config (enable/disable, description)
- [ ] POST `/api/admin/tools/:name/test` — test a tool with provided parameters
- [ ] GET `/api/admin/storage/uploads` — list uploaded files with filters
- [ ] DELETE `/api/admin/storage/uploads/:key` — delete an uploaded file
- [ ] POST `/api/admin/storage/cleanup` — trigger orphan file cleanup
- [ ] GET `/api/admin/settings` — get current system settings
- [ ] PUT `/api/admin/settings` — update system settings

## UI Components & Patterns
- [ ] Reusable data table component with sorting, filtering, pagination, and search
- [ ] Stat card component with value, label, trend indicator, and icon
- [ ] Modal component for detail views and confirmations
- [ ] Toast/notification component for success and error messages
- [ ] Loading spinner and skeleton screens for data fetching states
- [ ] Empty state illustrations for sections with no data
- [ ] Breadcrumb navigation for nested views (e.g., Escalations > Escalation Detail)
- [ ] Date range picker for filtering
- [ ] Status badge component (color-coded: green/yellow/red/gray)
- [ ] Image thumbnail component with click-to-expand lightbox
- [ ] File upload dropzone component (for reference images and manual content images)
- [ ] Image gallery component for viewing multiple images in a document or chat

## Admin JavaScript Module (`admin.js`)
- [ ] Section router: load section content based on sidebar selection (SPA-like behavior without a framework)
- [ ] API wrapper for all admin endpoints with auth and error handling
- [ ] Chart rendering functions using Chart.js
- [ ] Data table rendering with dynamic sorting, filtering, and pagination
- [ ] Real-time updates: poll for new escalations and stats every 60 seconds
- [ ] Export functions for CSV and text downloads
- [ ] Form validation for manual content entry and settings updates
- [ ] Image upload handling for reference images and knowledge base entries
- [ ] Presigned URL management: fetch URLs for images, handle expiry and re-fetch
