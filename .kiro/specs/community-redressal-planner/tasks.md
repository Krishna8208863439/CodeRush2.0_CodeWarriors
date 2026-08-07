# Implementation Plan: Community Redressal Planner

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": [1, 2] },
    { "wave": 2, "tasks": [3, 4, 5, 6, 7, 8] },
    { "wave": 3, "tasks": [9, 10, 11] },
    { "wave": 4, "tasks": [12, 13, 14] },
    { "wave": 5, "tasks": [15, 16, 17, 18, 19] },
    { "wave": 6, "tasks": [20, 21, 22, 23] },
    { "wave": 7, "tasks": [24, 25, 26] },
    { "wave": 8, "tasks": [27, 28, 29, 30] }
  ]
}
```

## Overview

Implementation follows the 12-phase build order from the requirements. Each task is gated by a Definition of Done before the next begins. Phases 0–1 (auth + complaint intake) are critical path; AI, GIS, dashboards, SLA, and notifications are layered on top. Infrastructure and property-based tests run in parallel with later phases.

## Tasks

- [ ] 1. Initialise monorepo with npm workspaces: `frontend/` (Next.js 14, TypeScript, Tailwind, Shadcn UI, Framer Motion), `api/` (Node.js/Express, TypeScript, `zod`, `ioredis`, `bullmq`, `pg`, `argon2`, `jsonwebtoken`, `@aws-sdk/client-s3`), `ai-service/` (Python FastAPI, `uvicorn`). Add root `.eslintrc`, `.prettierrc`, `tsconfig.base.json`, `ruff.toml`, and `.env.example` files for all three services.

- [ ] 2. Write database migrations using `node-pg-migrate`: enable PostGIS extension; create all 24 tables in dependency order — `users`, `citizens`, `refresh_tokens`, `password_reset_tokens`, `departments`, `officers`, `wards` (GEOMETRY MultiPolygon 4326), `gis_locations` (GEOMETRY Point 4326 + GIST index), `complaints`, `complaint_images`, `complaint_audio`, `complaint_video`, `evidence`, `ai_predictions` (reasoning JSONB), `translation_logs`, `duplicate_groups`, `status_history`, `appeals`, `feedback`, `notifications`, `audit_logs`, `consent_records`, `sla_rules`; seed default SLA rules (Garbage 12h, Street Light 24h, Water Leakage 48h, Road Damage 168h).

- [ ] 3. Implement Auth Service — registration flow: `POST /auth/register` validates fields with Zod, hashes password with argon2id (memory 65536, iterations 3, parallelism 4), inserts `users` + `citizens` rows, generates signed email-verification token (crypto.randomBytes 32), sends real verification email via Resend/SendGrid SMTP; `GET /auth/verify-email?token=...` validates token, sets `is_verified = true`, expires token.

- [ ] 4. Implement MSG91 SMS OTP flow: `POST /auth/send-otp` generates 6-digit OTP, stores bcrypt hash + expiry in Redis (`otp:{phone}` key, 10-min TTL), sends real SMS via MSG91 REST API with DLT-registered template; enforce rate limit (max 3 requests per 10 min per number via Redis incr/expire); `POST /auth/verify-otp` validates OTP hash.

- [ ] 5. Implement JWT token lifecycle: `POST /auth/login` (email+password and mobile+OTP paths) verifies credentials, checks lockout status, issues signed JWT access token (15-min TTL) + refresh token (7-day TTL), stores refresh token hash in `refresh_tokens`, sets httpOnly secure SameSite=Strict cookie; `POST /auth/refresh` validates token hash (not revoked, not expired), issues new access token, rotates refresh token; `POST /auth/logout` deletes refresh token row from `refresh_tokens`, clears cookie; `GET /auth/me` returns user id, role, name.

- [ ] 6. Implement account lockout and password reset: after 5 consecutive failed logins within 15 min (Redis counter), set `users.is_locked=true` / `locked_until=NOW()+30min`, write `audit_logs` entry; `POST /auth/forgot-password` generates single-use reset token (30-min expiry), stores only hash in `password_reset_tokens`, sends reset email; `POST /auth/reset-password` validates token, updates password hash, marks token used, revokes all `refresh_tokens` for that user, sends confirmation email.

- [ ] 7. Implement RBAC middleware: define `Role` enum and `PERMISSION_MATRIX` covering all API routes; `authenticate` middleware extracts Bearer JWT, verifies signature and expiry, attaches `req.user`; `authorise(roles[])` middleware factory checks role against matrix, returns HTTP 403 with standard `ApiError` envelope and writes `audit_logs` entry on denial; apply to all protected routes.

- [ ] 8. Implement MinIO file storage integration: add MinIO to docker-compose (ports 9000/9001); implement `MinIOClient` class with `@aws-sdk/client-s3` (creates `complaints` bucket if absent, private); implement `uploadFile(buffer, key, mimeType)` and `generatePresignedURL(key, ttl)`; configure `multer` with 50 MB memory limit; add `POST /files/upload` test endpoint.

- [ ] 9. Implement complaint intake — web and file channels: `POST /complaints` (WebFormAdapter) validates consent (inserts `consent_records` row before complaint row, returns 422 if consent=false), generates `CRP-YYYY-NNNNNN` reference ID via PostgreSQL sequence, creates `complaints` row, enqueues AI analysis job on BullMQ `ai-analysis` queue, returns reference ID within 3 seconds; `POST /complaints/image` (multer, MinIO upload, `complaint_images` row); `POST /complaints/audio` and `POST /complaints/voice` (multer, MinIO, `complaint_audio` row, forward audio bytes to AI Service `POST /ai/transcribe` for Whisper STT, store transcript); `POST /complaints/video` (multer, MinIO, `complaint_video` row).

- [ ] 10. Implement complaint intake — WhatsApp and SMS webhook channels: `POST /webhooks/whatsapp` verifies Meta webhook signature (`X-Hub-Signature-256`), parses text/image/audio/video payload types, normalises to `ComplaintDraft`, calls `ComplaintService.create()`, returns structured error JSON if message cannot be parsed; `POST /webhooks/sms` verifies MSG91 webhook, parses inbound SMS text, normalises to `ComplaintDraft`, returns structured error if parsing fails.

- [ ] 11. Implement AI Service foundation — FastAPI app with `GET /ai/health`; language detection `POST /ai/detect-language` (langdetect); translation `POST /ai/translate` with IndicTrans2 primary and NLLB-200 fallback, writes `translation_logs` via asyncpg; Whisper STT `POST /ai/transcribe`; EasyOCR `POST /ai/ocr`; PII redaction function (regex strips phone/email, replaces with `[PHONE_N]`/`[EMAIL_N]` tokens before any payload leaves Core API for AI Service).

- [ ] 12. Implement AI inference pipeline — `POST /ai/analyse` orchestrator: PII redaction → STT (if audio) → OCR (if image with text, appends to text body) → spaCy NER (extract LOCATION, WARD, LANDMARK, INFRASTRUCTURE, URGENCY spans) → DistilBERT classification (load from `DISTILBERT_MODEL_PATH`, 13 categories, return category + confidence) → if confidence < 0.80 flag `is_manual_review=true` → Sentence-Transformers cosine similarity dedup (threshold 0.85, create/link `duplicate_groups` Master Incident) → YOLOv8 object detection (if image, load from `YOLO_MODEL_PATH`) → XGBoost priority score (if not manual review, load from `XGBOOST_MODEL_PATH`) → build `reasoning` JSONB → INSERT `ai_predictions` → return response to Core API; Core API then updates `complaints.category`, `complaints.department_id`, `complaints.status`; if model file missing, return `{ "not_yet_available": true }` — never a faked prediction.

- [ ] 13. Implement GIS module: `GET /gis/complaints` with PostGIS parameterised query (ST_Within + ST_MakeEnvelope with GIST index, filtered by bbox/ward_id/category/status/from/to), strips PII for CITIZEN role; `GET /gis/wards` returns ward boundary GeoJSON FeatureCollection; `GET /gis/heatmap` returns `[lat, lon, intensity]` array; seed 3 wards with real GeoJSON polygons and 15+ `gis_locations` rows.

- [ ] 14. Implement dashboard APIs — `GET /dashboard/citizen` (own complaints + status history), `GET /dashboard/officer` (assigned complaints ORDER BY priority_score DESC with SLA deadline), `GET /dashboard/department` (dept complaints, SLA compliance rate, per-officer metrics), `GET /dashboard/executive` (city-wide volumes, resolution rates, SLA breach counts), `GET /dashboard/admin` (user list, manual review queue where status='MANUAL_REVIEW', pending appeals, system health ping); `PATCH /complaints/:id/status` (Officer only: validate transition, update complaints.status, INSERT status_history row); `PATCH /complaints/:id/assign` (Department Head only: update officer_id, set assigned_at, trigger SLA scheduler).

- [ ] 15. Implement SLA Engine using BullMQ: `scheduleSLAJob(complaintId, category)` looks up `sla_rules`, adds delayed job (`sla:{complaintId}`, delay=deadline_hours×3600000ms), updates `complaints.sla_deadline`; L1 worker: on job fire if status≠RESOLVED → set `escalated=true`, `escalation_level=1`, `breach_timestamp=NOW()`, call Notification Service COMPLAINT_ESCALATED event for Department Head, insert `audit_logs` row, schedule L2 job (24h delay); L2 worker: if still unresolved → set `escalation_level=2`, notify Municipal Commissioner, insert second `audit_logs` row; cancel job on RESOLVED via `slaQueue.remove()`; Admin SLA rule update `PATCH /admin/sla-rules/:category` applies only to new jobs.

- [ ] 16. Implement Notification Service: MSG91 SMS adapter (REST API with DLT template ID); Resend/SendGrid SMTP email adapter with HTML templates; WhatsApp Business Cloud API adapter (pre-approved message templates); Web Push adapter (`web-push` library, VAPID keys, `POST /push/subscribe` stores subscription in `users.push_subscription` JSONB); BullMQ notification worker with exponential backoff retry (3 attempts, delays 60s/120s/240s, updates `notifications.attempt_count` and `status`); `EVENT_NOTIFICATION_MAP` covering all 7 lifecycle events; opt-out handling via `users.notification_opt_outs` array.

- [ ] 17. Implement Privacy and Security hardening: AES-256-GCM `encryptField`/`decryptField` helpers applied to `citizens.phone_encrypted`, `citizens.national_id_encrypted`, `users.email_encrypted`; PII masking (`maskPhone`, `maskEmail`) in all response serialisers for CITIZEN role; PostgreSQL audit trigger (`AFTER INSERT OR UPDATE OR DELETE`) on `complaints`, `users`, `officers`, `departments` tables → INSERT `audit_logs` with JSONB diff; auth event logging in application code (login success/fail, logout, token refresh, password reset) with IP + user agent; data deletion endpoint `DELETE /users/me` schedules anonymisation within 30 days.

- [ ] 18. Implement Analytics Service: `GET /analytics/by-category` (SQL GROUP BY with date filter); `GET /analytics/by-ward` (PostGIS ST_Within spatial join); `GET /analytics/department-performance` (total assigned, total resolved, avg resolution hours, SLA compliance pct); `GET /analytics/satisfaction` (AVG rating from feedback JOIN departments); Redis caching wrapper `getCachedAnalytics(key, fn, 300s)` applied to all four endpoints; apply `authorise([DEPARTMENT_HEAD, COMMISSIONER, ADMIN])` guard.

- [ ] 19. Implement AI Explainability and Appeals: update `GET /complaints/:id` to JOIN `ai_predictions` and include full `reasoning` JSONB in response; `POST /complaints/:id/appeal` (Citizen only) inserts `appeals` row and triggers APPEAL_SUBMITTED notification to Admin; update `GET /dashboard/admin` to include pending appeals; `PATCH /appeals/:id/resolve` (Admin only) updates `complaints.category`, `complaints.department_id`, inserts `status_history` with status='APPEAL_OVERRIDE', resets `complaints.officer_id=NULL` + `status='ASSIGNED'`, resolves appeal, schedules new SLA job.

- [ ] 20. Build Frontend auth pages: `/login` (email+password and mobile+OTP tabs, Framer Motion entrance animation, accessible labels); `/register` (Zod validation, consent checkbox required); `/verify-email` (success/expired states); `/reset-password` (new password + confirmation, token error states); auth context/provider with axios interceptor for 401 token refresh; role-based redirect after login; protected route wrapper redirecting unauthenticated users; notification badge polling every 30 seconds.

- [ ] 21. Build Frontend complaint intake UI: `/complaints/new` tabbed page (text, voice, image, video, audio channels); text form with language dropdown and browser geolocation picker; voice recording tab using MediaRecorder API; image drag-drop upload with preview; video and audio file upload tabs; loading spinner with "Processing…" during submission; reference ID display on success.

- [ ] 22. Build Frontend complaint detail page `/complaints/[id]`: fetch from `GET /complaints/:id`; status timeline component (vertical line with status nodes, timestamps, notes); evidence viewer (images, video player, audio player); `AIReasoningPanel` component (predicted_category, confidence %, keywords, entities, similarity_score, yolo_detections; collapses/expands via `<details>`; shows "Not yet available" badge if reasoning is empty; never shows LLM-guessed data); appeal submission modal (visible to complaint owner if status is ASSIGNED/IN_PROGRESS).

- [ ] 23. Build Frontend role dashboards: Citizen Dashboard (complaint list cards, status badges, empty state); Officer Dashboard (priority queue table with real-time `SLACountdown` timer component, status update modal with resolution photo upload); Department Head Dashboard (complaints table with officer reassign dropdown, SLA compliance progress bar, officer performance cards); Commissioner Dashboard (stats cards, ward heatmap summary, top-5-departments bar chart); Admin Dashboard (tabbed: Users CRUD, Review Queue, Appeals resolve form, System Health pings); all data from real authenticated API calls.

- [ ] 24. Build Frontend GIS map page `/map`: `dynamic(() => import('MapContainer'), { ssr: false })` Leaflet wrapper; `ComplaintPinsLayer` (GeoJSON from `/gis/complaints`, colour-coded by status, 300ms debounced refetch on filter change); `HeatmapLayer` (leaflet-heat, toggled by checkbox); `WardBoundariesLayer` (ward polygons, click sets wardFilter); complaint popup (ID, category, status, date, "View Details →" link); filter toolbar (category, status, date range, ward dropdowns).

- [ ] 25. Build Frontend analytics and AI reasoning pages: Analytics Dashboard (bar chart by category, bar chart by ward, grouped bar for department performance, pie chart for satisfaction, date range controls, all data from `/analytics/*` endpoints, no hardcoded data); `AnalyticsChart` recharts wrapper supporting bar/line/pie; `AIReasoningPanel` integrated on complaint detail for all roles.

- [ ] 26. Write Docker infrastructure: multi-stage `api/Dockerfile` (Node 20 Alpine, non-root user, HEALTHCHECK on `/health`); multi-stage `ai-service/Dockerfile` (Python 3.11 slim, HEALTHCHECK on `/ai/health`, models mounted at `/models`); multi-stage `frontend/Dockerfile` (Node 20 Alpine, Next.js standalone output); root `docker-compose.yml` with 6 services (frontend:3000, api:3001, ai-service:8000, db:5432 PostGIS, cache:6379 Redis, storage:9000/9001 MinIO) with depends_on health checks and named volumes; `docker-compose.test.yml` for CI.

- [ ] 27. Write CI/CD pipeline `.github/workflows/ci.yml`: `api-tests` job (npm ci, lint, type-check, Jest unit + integration tests against Postgres + Redis service containers); `ai-tests` job (pip install, ruff check, pytest with coverage); `e2e-tests` job (docker-compose.test.yml up, Playwright tests including axe-core WCAG-AA assertions on login, all dashboards, complaint-detail, and map pages); `deploy` job on main merge (Railway deploy for api + ai-service, Vercel deploy for frontend).

- [ ] 28. Write seed script `scripts/seed.ts`: 5 users (one per role, known credentials), 5 departments with realistic names, 3 wards with real GeoJSON polygon boundaries, 100 complaints distributed across all categories/wards/statuses, 15 `gis_locations` with coordinates inside ward boundaries, 20 feedback records (ratings 1–5), 10 Master Incidents in `duplicate_groups` (similarity scores 0.85–0.98), full `ai_predictions` rows for all seeded complaints; use `@faker-js/faker` for names/addresses.

- [ ] 29. Implement property-based tests using `fast-check` (TypeScript) and `Hypothesis` (Python) for all 8 correctness properties: P1 token integrity (revocation sequences, 1000+ samples), P2 RBAC non-bypass (all forbidden endpoint×role pairs), P3 status transition monotonicity (only valid transitions succeed), P4 PII isolation (AI payloads have no raw PII, Citizen responses match mask pattern), P5 SLA deadline determinism (backdated assignments produce breach + audit log), P6 notification delivery guarantee (3 failed attempts produce FAILED status with attempt_count=3), P7 deduplication consistency (similarity>0.85 → same master_incident_id), P8 consent before data (no complaint row without prior consent record).

- [ ] 30. Write documentation: `README.md` with prerequisites, environment variable setup (MSG91, Resend, WhatsApp Business, VAPID), `docker compose up` guide, seed command, test commands, API key acquisition guide; `docs/ER_DIAGRAM.md` (Mermaid ER diagram, all 24 tables with FK relationships); `docs/ARCHITECTURE.md` (system architecture Mermaid diagram, complaint lifecycle sequence diagram, DFD); security notes (encryption keys, RBAC audit, DLT registration requirements); testing summary (what each test layer covers, how to run).

## Notes

- Tasks 3–7 (Phase 0 Auth) must be 100% complete and all DoD boxes verified before beginning Task 9 (Complaint Intake). Per the build rules, do not proceed to Phase 1 until every Phase 0 DoD box is genuinely checked.
- Tasks 11–12 (AI Service) must never return LLM-guessed predictions. If a model file is absent, return `{ "not_yet_available": true }`. The UI must display "Not yet available" in that case — not a fake result.
- Real provider credentials (MSG91, Resend, WhatsApp Business Cloud API) are required before Tasks 4, 10, 11, and 16 can be marked done. Flag immediately if credentials are unavailable rather than mocking the response.
- All frontend pages (Tasks 20–25) must pass axe-core WCAG-AA scans with zero critical/serious violations before being marked done.
- Property-based tests (Task 29) should be implemented incrementally alongside the corresponding feature tasks, not saved entirely for the end.
