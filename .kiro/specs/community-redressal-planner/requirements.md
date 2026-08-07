# Requirements Document

## Introduction

The Community Redressal Planner is an AI-powered civic operating system that enables citizens to submit complaints about municipal issues and allows officers, department heads, municipal commissioners, and system administrators to manage, resolve, and analyse those complaints. The system spans twelve phases: Authentication, Complaint Intake, AI Understanding, GIS Mapping, Role Dashboards, SLA Engine, Notifications, Privacy & Security, Analytics, and AI Explainability. All infrastructure is real (no simulations), AI models are pre-trained and pluggable, and every phase has an explicit Definition of Done checklist. The frontend is built with Next.js, React, TypeScript, Tailwind CSS, Shadcn UI, and Framer Motion; the core API with Node.js/Express (TypeScript); AI services with Python/FastAPI; the database with PostgreSQL/PostGIS; caching and queueing with Redis; file storage with MinIO; and authentication with JWT (access + refresh tokens).

---

## Glossary

- **System**: The Community Redressal Planner platform as a whole.
- **Auth Service**: The Node.js/Express module responsible for authentication and authorisation.
- **Complaint Service**: The Node.js/Express module responsible for complaint lifecycle management.
- **AI Service**: The Python/FastAPI service responsible for ML inference pipelines.
- **GIS Service**: The PostGIS-backed spatial query module.
- **SLA Engine**: The Redis-cron/queue-based service that enforces SLA deadlines and escalation.
- **Notification Service**: The module responsible for SMS, email, WhatsApp, and Web Push delivery.
- **Analytics Service**: The module responsible for aggregated reporting queries.
- **Citizen**: An end-user who submits complaints and tracks their resolution.
- **Officer**: A municipal field officer who investigates and resolves complaints.
- **Department Head**: A supervisory role who oversees officers within a department.
- **Municipal Commissioner**: The highest municipal authority who oversees all departments.
- **System Admin**: A technical administrator with full platform access.
- **RBAC**: Role-Based Access Control enforced at the API layer.
- **Master Incident**: A deduplicated group of complaints representing the same real-world event.
- **SLA**: Service Level Agreement defining the maximum resolution time per complaint category.
- **Ward**: A defined administrative geographic sub-division of the municipality.
- **PII**: Personally Identifiable Information subject to privacy protection.
- **DoD**: Definition of Done — a verifiable checklist marking a phase as complete.
- **EARS**: Easy Approach to Requirements Syntax.
- **WCAG-AA**: Web Content Accessibility Guidelines Level AA compliance standard.

---

## Requirements

### Requirement 1 — Phase 0: Authentication

**User Story:** As a platform user (Citizen, Officer, Department Head, Municipal Commissioner, or System Admin), I want secure, role-specific authentication so that only authorised users access role-appropriate resources.

#### Acceptance Criteria

1. THE Auth Service SHALL support five distinct roles: Citizen, Officer, Department Head, Municipal Commissioner, and System Admin, each with a separate permission set enforced at every API endpoint.
2. WHEN a new user registers, THE Auth Service SHALL send a verification email containing a one-time link that expires after 24 hours.
3. WHEN a user supplies a phone number during registration, THE Auth Service SHALL send a 6-digit OTP via MSG91 SMS that expires after 10 minutes.
4. WHEN a user is authenticated, THE Auth Service SHALL issue a signed JWT access token with a 15-minute TTL and a signed JWT refresh token with a 7-day TTL, storing the refresh token hash in the `refresh_tokens` table.
5. WHEN a client presents a valid refresh token, THE Auth Service SHALL issue a new access token and rotate the refresh token, invalidating the previous token.
6. WHEN a user requests a password reset, THE Auth Service SHALL generate a password-reset token, persist it in the `password_reset_tokens` table, email it to the registered address, and invalidate all existing sessions for that account upon successful reset.
7. WHEN a user performs server-side logout, THE Auth Service SHALL delete the corresponding refresh token record from the `refresh_tokens` table, rendering the token unusable.
8. WHEN a user fails authentication 5 consecutive times within 15 minutes, THE Auth Service SHALL lock the account for 30 minutes and log the event in the `audit_logs` table.
9. THE Auth Service SHALL hash all passwords using argon2 before storage and SHALL NOT store plaintext passwords.
10. THE Auth Service SHALL enforce RBAC by validating the JWT role claim against a permission matrix on every protected API route, returning HTTP 403 for unauthorised access.

#### Phase 0 Definition of Done

- All five roles log in and receive JWT tokens verifiable via `/auth/me`.
- Email verification link activates account and expires correctly.
- MSG91 SMS OTP delivered and validated end-to-end.
- Account lockout triggers after 5 failed attempts and unlocks after 30 minutes.
- Password reset invalidates all prior sessions.
- Server-side logout invalidates refresh token; subsequent refresh attempts return HTTP 401.

---

### Requirement 2 — Phase 1: Complaint Intake

**User Story:** As a Citizen, I want to submit complaints through multiple channels and in my preferred language so that language barriers and access limitations do not prevent me from reporting municipal issues.

#### Acceptance Criteria

1. THE Complaint Service SHALL accept complaints submitted via at least the following channels: web form (text), voice recording, image upload, video upload, audio file upload, WhatsApp Business Cloud API webhook, and MSG91 SMS inbound webhook.
2. WHEN a complaint is submitted, THE Complaint Service SHALL accept input in English, Hindi, Marathi, Tamil, Telugu, or Kannada.
3. WHEN a complaint body is in a non-English language, THE AI Service SHALL translate it to English using IndicTrans2 or NLLB, storing both the original text and the translated text in the `translation_logs` table.
4. WHEN a Citizen uploads an image, video, or audio file, THE Complaint Service SHALL store the file in MinIO using an S3-compatible API and persist the storage reference in the appropriate evidence table (`complaint_images`, `complaint_audio`, `complaint_video`).
5. WHEN a complaint is successfully created, THE Complaint Service SHALL return a unique complaint reference ID to the submitting Citizen within 3 seconds under normal load.
6. IF a WhatsApp or SMS inbound message cannot be parsed as a valid complaint, THEN THE Complaint Service SHALL reply to the sender with a structured error message explaining required fields.
7. THE Complaint Service SHALL record the submission channel, submission timestamp, raw original content, and translated content (where applicable) for every complaint in the `complaints` table.

#### Phase 1 Definition of Done

- Complaint submitted via each of the 7 channels creates a record in the `complaints` table.
- Translation stored alongside original for at least one non-English language per supported language.
- File uploads appear in MinIO and references appear in evidence tables.
- WhatsApp and SMS webhooks tested with real MSG91/Meta credentials.
- Complaint reference ID returned within 3 seconds under single-user load.

---

### Requirement 3 — Phase 2: AI Understanding Layer

**User Story:** As a system operator, I want every incoming complaint to be automatically classified, deduplicated, prioritised, and routed so that officers receive actionable, non-redundant work items with full AI reasoning transparency.

#### Acceptance Criteria

1. WHEN a new complaint is persisted, THE AI Service SHALL classify it into exactly one of 13 predefined categories using a DistilBERT-based model and store the category label and confidence score in the `ai_predictions` table.
2. WHEN the DistilBERT classification confidence score is below 0.80, THE AI Service SHALL flag the complaint for manual review by routing it to a human review queue rather than auto-routing it to a department.
3. WHEN a complaint contains an image attachment, THE AI Service SHALL run YOLOv8 object detection on the image and store detected object labels and bounding-box confidence scores in the `ai_predictions` table.
4. WHEN a complaint contains an audio or voice attachment, THE AI Service SHALL transcribe it using Whisper STT and store the transcript in the `complaints` table.
5. WHEN a complaint contains an image with embedded text, THE AI Service SHALL extract the text using EasyOCR and append it to the complaint's text body before classification.
6. THE AI Service SHALL extract named entities (location, date, infrastructure type) from complaint text using spaCy NER and store entity spans in the `ai_predictions` table.
7. WHEN a new complaint is classified, THE AI Service SHALL compare it against existing complaints using Sentence-Transformers cosine similarity; IF the similarity score exceeds 0.85 with an existing complaint, THEN THE AI Service SHALL group both under a Master Incident record in the `duplicate_groups` table.
8. WHEN a complaint is classified and not flagged for manual review, THE AI Service SHALL compute a priority score using XGBoost and store the score in the `ai_predictions` table, using it to order the officer work queue.
9. THE AI Service SHALL store, for every prediction, the model name, model version, confidence score, and a human-readable reasoning string in the `ai_predictions` table.
10. WHEN a complaint is routed to a department, THE Complaint Service SHALL update the `complaints` table with the target department ID and set status to `ASSIGNED`.

#### Phase 3 Definition of Done

- Every new complaint has a row in `ai_predictions` with category, confidence, and reasoning.
- Complaints below 0.80 confidence appear in the manual review queue.
- Duplicate complaints are linked under a Master Incident.
- YOLOv8, Whisper, and EasyOCR results present for respective media types.
- XGBoost priority score present for all auto-routed complaints.

---

### Requirement 4 — Phase 3: GIS Map

**User Story:** As a Citizen or Officer, I want to view complaints on an interactive map so that I can understand the geographic distribution of issues and identify hotspots by ward.

#### Acceptance Criteria

1. THE GIS Service SHALL expose a spatial API endpoint that returns complaint GeoJSON data filtered by bounding box, ward ID, category, status, and date range using PostGIS spatial queries.
2. WHEN a user opens the GIS map view, THE Frontend SHALL render complaint pins on a Leaflet + OpenStreetMap tile layer, with each pin colour-coded by complaint status.
3. WHEN a user enables the heatmap layer, THE Frontend SHALL render a density heatmap derived from complaint GeoJSON coordinates using a Leaflet heatmap plugin.
4. THE Frontend SHALL render ward boundary polygons on the map, sourced from GeoJSON stored in the `wards` table, allowing users to filter complaints by clicking a ward boundary.
5. WHEN a user clicks a complaint pin, THE Frontend SHALL display a popup showing complaint ID, category, status, submission date, and a link to the full complaint detail view.
6. WHILE a Citizen is authenticated, THE GIS Service SHALL restrict pin data to anonymised complaint metadata, excluding submitter PII.
7. WHILE an Officer or higher role is authenticated, THE GIS Service SHALL include assignee metadata and full status history in pin popup data.

#### Phase 3 Definition of Done

- Map loads with pins for at least 10 seeded complaints across at least 3 wards.
- Heatmap layer toggles on/off without page reload.
- Ward boundary polygons render and ward-click filter works.
- PostGIS bounding-box query confirmed via SQL EXPLAIN showing spatial index use.
- PII exclusion verified for Citizen role by inspecting API response.

---

### Requirement 5 — Phase 4–6: Role Dashboards

**User Story:** As a user with any role, I want a personalised dashboard that surfaces only the data and actions relevant to my responsibilities so that I can act efficiently without information overload.

#### Acceptance Criteria

1. WHEN a Citizen logs in, THE Frontend SHALL display a Citizen Dashboard showing the Citizen's submitted complaints, each with current status, last-updated timestamp, and a timeline of status history fetched from authenticated API endpoints.
2. WHEN an Officer logs in, THE Frontend SHALL display an Officer Dashboard showing complaints assigned to the Officer, sorted by XGBoost priority score descending, with actions to update status (`IN_PROGRESS`, `RESOLVED`, `REJECTED`) and add field notes.
3. WHEN a Department Head logs in, THE Frontend SHALL display a Department Dashboard showing all complaints within the Department Head's department, SLA compliance rate, officer-level performance metrics, and the ability to reassign complaints between officers.
4. WHEN a Municipal Commissioner logs in, THE Frontend SHALL display an Executive Dashboard showing city-wide complaint volume, resolution rates by department, SLA breach counts, and ward-level heatmap summaries.
5. WHEN a System Admin logs in, THE Frontend SHALL display an Admin Dashboard showing user management, role assignment, system health metrics, and the manual review queue for low-confidence AI predictions.
6. THE Complaint Service SHALL enforce RBAC on all dashboard API endpoints, returning HTTP 403 when a role attempts to access data outside its permission scope.
7. WHEN an Officer updates a complaint status, THE Complaint Service SHALL append a row to the `status_history` table with the Officer's user ID, the new status, the timestamp, and an optional note.

#### Phase 4–6 Definition of Done

- Each of the 5 role dashboards renders with live data from authenticated API calls (no mock/static data).
- RBAC verified: Citizen token cannot access Officer or Admin endpoints (HTTP 403 returned).
- Status update by Officer creates a `status_history` row confirmed by direct DB query.
- Department Head reassignment updates the `complaints.officer_id` field.
- All dashboard pages pass WCAG-AA automated scan (axe-core or equivalent).

---

### Requirement 6 — Phase 7: SLA Engine

**User Story:** As a Department Head or Municipal Commissioner, I want the system to automatically track SLA deadlines and escalate overdue complaints so that resolution accountability is enforced without manual monitoring.

#### Acceptance Criteria

1. THE SLA Engine SHALL define the following default SLA rules in the `sla_rules` table: Garbage — 12 hours; Street Light — 24 hours; Water Leakage — 48 hours; Road Damage — 7 days.
2. WHEN a complaint is assigned to an Officer, THE SLA Engine SHALL schedule a Redis-based job to fire at the SLA deadline for that complaint's category.
3. WHEN the SLA deadline job fires and the complaint status is not `RESOLVED`, THE SLA Engine SHALL escalate the complaint by updating `complaints.escalated = true`, notifying the responsible Department Head via the Notification Service, and appending an escalation event to the `audit_logs` table.
4. WHILE a complaint is escalated and the status remains unresolved after an additional 24 hours, THE SLA Engine SHALL notify the Municipal Commissioner and append a second escalation event to the `audit_logs` table.
5. THE SLA Engine SHALL store SLA deadline timestamp, breach timestamp (if applicable), and escalation level in the `complaints` table for every complaint.
6. WHEN an SLA rule is updated by a System Admin, THE SLA Engine SHALL apply the new rule to all newly assigned complaints from the moment of update; existing scheduled jobs SHALL NOT be retroactively altered.

#### Phase 7 Definition of Done

- Garbage complaint not resolved within 12 hours triggers Department Head notification and audit log entry.
- Escalated-but-unresolved complaint after additional 24 hours triggers Municipal Commissioner notification.
- SLA deadline, breach timestamp, and escalation level present in `complaints` row.
- Redis job queue verified non-empty after complaint assignment.
- SLA rule update reflected immediately for new complaints.

---

### Requirement 7 — Phase 8: Notifications

**User Story:** As a user of any role, I want to receive timely, channel-appropriate notifications at every meaningful lifecycle event so that I stay informed without having to poll the system manually.

#### Acceptance Criteria

1. THE Notification Service SHALL send notifications via four channels: MSG91 SMS, SMTP email, WhatsApp Business Cloud API, and Web Push (VAPID/FCM).
2. WHEN any of the following complaint lifecycle events occurs, THE Notification Service SHALL dispatch notifications to the relevant parties: complaint created, complaint assigned, complaint in-progress, complaint resolved, complaint rejected, complaint escalated, or appeal submitted.
3. WHEN a Citizen's complaint is created, THE Notification Service SHALL send an SMS and email to the Citizen containing the complaint reference ID.
4. WHEN a complaint is assigned to an Officer, THE Notification Service SHALL send an SMS and/or Web Push notification to the Officer containing the complaint reference ID and category.
5. WHEN a complaint is resolved, THE Notification Service SHALL send an SMS, email, and WhatsApp message to the Citizen with the resolution summary and a link to the feedback form.
6. IF a notification delivery attempt fails, THEN THE Notification Service SHALL retry delivery up to 3 times with exponential back-off and log each attempt outcome in the `notifications` table.
7. THE Notification Service SHALL store notification channel, event type, delivery status, attempt count, and timestamp in the `notifications` table for every dispatched notification.
8. WHEN a user opts out of a notification channel, THE Notification Service SHALL suppress future notifications on that channel for that user and record the opt-out preference in the `users` table.

#### Phase 8 Definition of Done

- Each of the 7 lifecycle events triggers at least one real delivery (verified via MSG91/SMTP/Meta/FCM logs).
- Failed delivery retries up to 3 times with delays; all attempts recorded in `notifications` table.
- Opt-out preference suppresses further notifications on that channel.
- Web Push subscription stored and push delivered to a subscribed browser.

---

### Requirement 8 — Phase 9: Privacy & Security

**User Story:** As a Citizen, I want my personal data to be protected and my consent respected so that I trust the platform with sensitive information about my community.

#### Acceptance Criteria

1. WHEN a Citizen submits a complaint, THE Complaint Service SHALL capture explicit consent for data processing and store the consent record (user ID, timestamp, consent version) in the `consent_records` table before persisting any complaint data.
2. THE System SHALL redact PII fields (name, phone number, email address) from all AI inference payloads before sending data to the AI Service, replacing PII with anonymised tokens.
3. THE System SHALL encrypt the following sensitive fields at rest using AES-256: phone numbers, email addresses, and national ID numbers stored in the `citizens` table.
4. WHILE a Citizen role is active, THE Complaint Service SHALL return masked versions of PII fields (e.g., phone `+91 98765 XXXXX`) in all API responses that expose citizen data.
5. THE Auth Service SHALL log every authentication event (login, logout, token refresh, failed login, password reset) with user ID, IP address, user agent, and timestamp in the `audit_logs` table.
6. THE System SHALL log every write operation (create, update, delete) on the `complaints`, `users`, `officers`, and `departments` tables with the acting user ID, operation type, changed fields, and timestamp in the `audit_logs` table.
7. THE Auth Service SHALL enforce RBAC on every API endpoint and return HTTP 403 with a standardised error body for any unauthorised access attempt, logging the attempt in `audit_logs`.
8. IF a Citizen requests data deletion, THEN THE System SHALL anonymise all PII fields in the Citizen's records within 30 days and record the deletion request in the `audit_logs` table.

#### Phase 9 Definition of Done

- Consent record created before complaint data for every submission.
- AI Service request payload verified to contain no raw PII (inspected in FastAPI request logs).
- AES-256 encryption of sensitive fields confirmed by reading raw DB column values.
- Citizen API response shows masked phone/email.
- Audit log entries present for login, complaint create, and RBAC violation events.
- Data deletion anonymisation confirmed by DB query after simulated deletion request.

---

### Requirement 9 — Phase 10: Analytics Dashboard

**User Story:** As a Department Head, Municipal Commissioner, or System Admin, I want real-time aggregated analytics so that I can identify performance gaps, resource needs, and trend patterns across the municipality.

#### Acceptance Criteria

1. THE Analytics Service SHALL provide an API endpoint that returns complaint volume grouped by category for a configurable date range, computed via SQL aggregation on the `complaints` table.
2. THE Analytics Service SHALL provide an API endpoint that returns complaint volume grouped by ward, computed via PostGIS spatial join between `complaints` and `wards`.
3. THE Analytics Service SHALL provide an API endpoint that returns per-department performance metrics including total assigned, total resolved, average resolution time in hours, and SLA compliance percentage for a configurable date range.
4. THE Analytics Service SHALL provide an API endpoint that returns average citizen satisfaction score per department, computed from the `feedback` table.
5. WHEN the Municipal Commissioner or Department Head views the Analytics Dashboard, THE Frontend SHALL render the aggregated data as interactive charts (bar, line, and pie) sourced from real-time API calls, with no static or hardcoded data.
6. THE Analytics Service SHALL cache aggregated query results in Redis with a 5-minute TTL to reduce repeated database load.
7. WHEN cached analytics data is older than 5 minutes, THE Analytics Service SHALL recompute the aggregation from the database and refresh the cache.

#### Phase 10 Definition of Done

- All four analytics endpoints return correct aggregated data verified against direct SQL queries.
- Charts in the dashboard render with live data (network tab confirms API calls).
- Redis cache TTL verified by inspecting cache key TTL after initial load.
- At least 100 seeded complaints across at least 5 categories and 3 wards for meaningful chart output.

---

### Requirement 10 — Phase 11: AI Explainability

**User Story:** As a Citizen or Officer, I want to understand why the AI made a specific classification or routing decision so that I can trust the outcome and raise a meaningful appeal if the decision is incorrect.

#### Acceptance Criteria

1. WHEN a user views a complaint detail page, THE Frontend SHALL display an "AI Reasoning" panel showing: the predicted category, confidence score, top contributing keywords, matched named entities, similarity score to the nearest Master Incident (if grouped), and YOLOv8-detected objects (if image present).
2. THE AI Service SHALL persist all explainability signals (keywords, entity spans, similarity scores, object labels) as structured JSON in the `ai_predictions.reasoning` column at inference time.
3. WHEN the Complaint Service serves a complaint detail response, THE Complaint Service SHALL include the structured reasoning JSON from `ai_predictions` in the response payload.
4. WHEN a Citizen disagrees with an AI classification, THE Complaint Service SHALL accept an appeal submission and create a record in the `appeals` table with the complaint ID, Citizen user ID, stated reason, and submission timestamp.
5. WHEN an appeal is submitted, THE System Admin SHALL be notified via the Notification Service and the appeal SHALL appear in the System Admin's manual review queue.
6. WHEN a System Admin resolves an appeal by overriding the AI classification, THE Complaint Service SHALL update the `complaints.category` field, append an entry to `status_history`, and re-route the complaint to the correct department.

#### Phase 11 Definition of Done

- AI Reasoning panel renders on complaint detail page with all six signal types populated (for a complaint with image attachment).
- `ai_predictions.reasoning` column contains valid JSON with keyword, entity, similarity, and object fields.
- Appeal submission creates `appeals` row confirmed by DB query.
- System Admin notified of appeal (SMS or email delivery confirmed).
- Admin override updates `complaints.category` and triggers re-routing to new department.

---

### Requirement 11 — Infrastructure, Deployment & Accessibility

**User Story:** As a developer or operator, I want containerised, CI/CD-enabled deployment so that the system can be reliably built, tested, and shipped to cloud environments without manual steps.

#### Acceptance Criteria

1. THE System SHALL provide a `docker-compose.yml` that starts all services (Next.js frontend, Node.js/Express API, Python/FastAPI AI Service, PostgreSQL with PostGIS, Redis, and MinIO) with a single `docker compose up` command in a local environment.
2. THE System SHALL provide individual `Dockerfile` files for the Node.js/Express API, Python/FastAPI AI Service, and Next.js frontend, each using multi-stage builds to produce minimal production images.
3. THE System SHALL provide a CI/CD pipeline configuration (GitHub Actions or equivalent) that runs linting, unit tests, and integration tests on every pull request and deploys to Render/Railway (API) and Vercel (frontend) on merge to the main branch.
4. THE System SHALL include database migration scripts (using a migration tool such as Flyway, Liquibase, or node-pg-migrate) covering all tables defined in the Glossary, runnable in order on a clean PostgreSQL instance.
5. THE Frontend SHALL meet WCAG-AA accessibility requirements across all pages, verified by automated axe-core scans showing zero critical or serious violations.
6. THE Frontend SHALL render correctly on viewport widths from 375 px (mobile) to 1920 px (desktop) without horizontal scroll or content overflow.

#### Phase 11 Definition of Done

- `docker compose up` starts all 6 services; health-check endpoints return HTTP 200 for API and AI Service.
- CI pipeline passes lint, unit tests, and integration tests on a sample pull request.
- Deployment to Render/Railway and Vercel succeeds via CI trigger.
- All DB migration scripts run successfully on a clean PostgreSQL instance.
- axe-core scan reports zero critical/serious violations on at least the login, dashboard, and complaint-detail pages.
- Frontend renders without horizontal scroll at 375 px viewport.
