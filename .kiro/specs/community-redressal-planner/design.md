# Design Document — Community Redressal Planner

## Overview

The Community Redressal Planner is an AI-powered civic operating system built as a polyglot, microservice-oriented platform. Citizens submit municipal complaints through multiple channels; AI pipelines classify, deduplicate, and prioritise them; role-specific dashboards surface actionable work items; and an SLA engine enforces accountability through automated escalation and notification.

The system is composed of five independently deployable services orchestrated by Docker Compose:

| Service | Technology | Responsibility |
|---|---|---|
| **frontend** | Next.js 14 / React / TypeScript / Tailwind / Shadcn UI | All user-facing UI |
| **api** | Node.js / Express / TypeScript | Core business logic, RBAC, complaint lifecycle |
| **ai-service** | Python / FastAPI | ML inference pipelines |
| **db** | PostgreSQL 16 + PostGIS | Persistent relational + spatial storage |
| **cache** | Redis 7 | Token store, job queues, analytics cache |
| **storage** | MinIO | S3-compatible binary object storage |

---

## Architecture

### High-Level Request Flow

```
Browser / WhatsApp / SMS
         │
         ▼
  ┌─────────────┐
  │  Next.js    │  (Static + SSR pages, API route proxies)
  │  Frontend   │
  └──────┬──────┘
         │ REST / JSON
         ▼
  ┌─────────────┐       ┌────────────────┐
  │  Express    │──────►│  Python/FastAPI │  (AI inference)
  │  Core API   │       │  AI Service     │
  └──────┬──────┘       └────────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
PostgreSQL  Redis
+ PostGIS   (cache / BullMQ queues)
    │
    ▼
  MinIO (file blobs)
```

### Service Communication

- **Frontend → Core API**: HTTPS REST, JWT Bearer tokens in `Authorization` header.
- **Core API → AI Service**: Internal HTTP (Docker network), PII-stripped JSON payloads.
- **Core API → Redis**: `ioredis` for cache and `BullMQ` for job queues.
- **Core API → MinIO**: `@aws-sdk/client-s3` (S3-compatible SDK).
- **Core API → PostgreSQL**: `pg` (node-postgres) with parameterised queries.
- **AI Service → PostgreSQL**: `asyncpg` for writing prediction results.
- **Notification channels**: MSG91 REST API, Resend/SendGrid SMTP, WhatsApp Business Cloud API, Web Push (web-push library + FCM).

---

## Component Design

### 1. Authentication Module (Phase 0)

#### 1.1 Role & Permission Matrix

```typescript
// src/auth/roles.ts
export enum Role {
  CITIZEN = 'CITIZEN',
  OFFICER = 'OFFICER',
  DEPARTMENT_HEAD = 'DEPARTMENT_HEAD',
  COMMISSIONER = 'COMMISSIONER',
  ADMIN = 'ADMIN',
}

export const PERMISSION_MATRIX: Record<string, Role[]> = {
  'GET /complaints/mine':        [Role.CITIZEN],
  'POST /complaints':            [Role.CITIZEN],
  'PATCH /complaints/:id/status':[Role.OFFICER],
  'GET /complaints/department':  [Role.DEPARTMENT_HEAD, Role.COMMISSIONER, Role.ADMIN],
  'GET /analytics':              [Role.DEPARTMENT_HEAD, Role.COMMISSIONER, Role.ADMIN],
  'GET /admin/users':            [Role.ADMIN],
  'GET /admin/review-queue':     [Role.ADMIN],
  // …all other routes defined here
};
```

#### 1.2 Token Lifecycle

```
Registration ──► Email Verification ──► Account Active
                                               │
                                         POST /auth/login
                                               │
                                    ┌──────────▼──────────┐
                                    │  { accessToken,     │
                                    │    refreshToken }   │
                                    └──────────┬──────────┘
                                               │ 15-min TTL      7-day TTL
                                   ┌───────────▼────────────────────────────┐
                                   │ refresh_tokens table: { hash, user_id, │
                                   │ expires_at, revoked }                  │
                                   └────────────────────────────────────────┘
```

**JWT Payload:**
```json
{
  "sub": "uuid",
  "role": "OFFICER",
  "iat": 1700000000,
  "exp": 1700000900
}
```

#### 1.3 Account Lockout Logic

```typescript
// Pseudo-implementation
async function recordFailedAttempt(userId: string): Promise<void> {
  const key = `lockout:${userId}`;
  const attempts = await redis.incr(key);
  if (attempts === 1) await redis.expire(key, 900); // 15-min window
  if (attempts >= 5) {
    await redis.set(`locked:${userId}`, '1', 'EX', 1800); // lock 30 min
    await insertAuditLog({ userId, event: 'ACCOUNT_LOCKED' });
  }
}
```

#### 1.4 Password Security

All passwords hashed with `argon2id` (memory: 65536, iterations: 3, parallelism: 4). Plaintext is never persisted or logged.

---

### 2. Complaint Intake Module (Phase 1)

#### 2.1 Intake Channel Adapters

Each channel is an adapter that normalises input into a `ComplaintDraft` object before hitting the unified `ComplaintService.create()` method.

```typescript
interface ComplaintDraft {
  citizenId: string;
  channel: 'WEB' | 'WHATSAPP' | 'SMS' | 'VOICE' | 'IMAGE' | 'VIDEO' | 'AUDIO';
  rawText: string;
  language: 'EN' | 'HI' | 'MR' | 'TA' | 'TE' | 'KN';
  attachments: AttachmentRef[];
  location?: { lat: number; lon: number };
  consentVersion: string;
}
```

**Channel Adapters:**

| Adapter | Entry Point | Notes |
|---|---|---|
| `WebFormAdapter` | `POST /complaints` | Direct JSON body |
| `WhatsAppAdapter` | `POST /webhooks/whatsapp` | Meta Webhook verification + payload parsing |
| `SmsAdapter` | `POST /webhooks/sms` | MSG91 inbound webhook |
| `VoiceAdapter` | `POST /complaints/voice` | Multipart form; forwards audio to AI Service for Whisper STT |
| `ImageAdapter` | `POST /complaints/image` | Multipart; stores in MinIO; forwards to AI for YOLO + OCR |
| `VideoAdapter` | `POST /complaints/video` | Multipart; MinIO storage |
| `AudioAdapter` | `POST /complaints/audio` | Multipart; MinIO storage; Whisper STT |

#### 2.2 File Storage Pipeline

```
Client uploads file
       │
       ▼
Express multer (memory buffer, 50 MB limit)
       │
       ▼
MinIO.putObject(bucket='complaints', key='{complaintId}/{uuid}.{ext}')
       │
       ▼
INSERT INTO complaint_images/audio/video (complaint_id, minio_key, mime_type, size_bytes)
```

#### 2.3 Translation Pipeline

```
Complaint text (non-EN)
       │
       ▼
POST http://ai-service/translate { text, source_lang, target_lang: 'EN' }
       │    (IndicTrans2 or NLLB model selected by source_lang)
       ▼
{ translatedText }
       │
       ▼
INSERT INTO translation_logs (complaint_id, original_text, translated_text, source_lang, model_used)
```

---

### 3. AI Understanding Layer (Phase 2)

#### 3.1 Inference Pipeline (Python / FastAPI)

```
POST /ai/analyse  (called by Core API after complaint persist)
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│  1. PII Redaction (replace name/phone/email with tokens)       │
│  2. Language detection + IndicTrans2/NLLB translation if !EN   │
│  3. Whisper STT  ──── (if audio attachment)                    │
│  4. EasyOCR      ──── (if image with text)                     │
│  5. spaCy NER    ──── extract locations, dates, infra types    │
│  6. DistilBERT classification → category + confidence (0–1)    │
│  7. IF confidence < 0.80 → flag MANUAL_REVIEW                  │
│  8. Sentence-Transformers cosine similarity dedup              │
│     └─ IF similarity > 0.85 with existing → Master Incident   │
│  9. YOLOv8 object detection ── (if image attachment)          │
│  10. XGBoost priority scoring ── (if not MANUAL_REVIEW)        │
│  11. Build reasoning JSON                                      │
│  12. INSERT INTO ai_predictions                                │
└────────────────────────────────────────────────────────────────┘
         │
         ▼
Core API receives response: { category, confidence, priority,
                               department_id, reasoning, is_manual_review }
         │
         ▼
UPDATE complaints SET category=..., department_id=..., status='ASSIGNED'
   (or status='MANUAL_REVIEW' if flagged)
```

#### 3.2 AI Prediction Record Schema

```typescript
interface AIPrediction {
  id: string;
  complaint_id: string;
  model_name: string;          // e.g. "distilbert-civic-v2"
  model_version: string;       // e.g. "2.1.0"
  category: string;
  confidence: number;          // 0.0–1.0
  priority_score: number;      // XGBoost output 0.0–1.0
  reasoning: {                 // JSONB
    keywords: string[];
    entity_spans: Array<{ text: string; label: string; start: number; end: number }>;
    similarity_score?: number;
    nearest_master_incident_id?: string;
    yolo_detections?: Array<{ label: string; confidence: number; bbox: number[] }>;
    ocr_text?: string;
    whisper_transcript?: string;
  };
  is_manual_review: boolean;
  created_at: string;
}
```

#### 3.3 Deduplication Flow

```python
# ai_service/dedup.py
def check_duplicate(new_embedding: np.ndarray, db: AsyncSession) -> Optional[str]:
    # Fetch all existing embeddings from the past 30 days
    # Compute cosine similarity batch
    # Return master_incident_id if max similarity > 0.85
    scores = cosine_similarity([new_embedding], existing_embeddings)[0]
    if scores.max() > 0.85:
        idx = scores.argmax()
        return existing_complaints[idx].master_incident_id
    return None
```

---

### 4. GIS Module (Phase 3)

#### 4.1 Spatial API Endpoint

```typescript
// GET /gis/complaints?bbox=lon1,lat1,lon2,lat2&ward_id=...&category=...&status=...&from=...&to=...
// Returns GeoJSON FeatureCollection

interface GISQueryParams {
  bbox?: string;      // "lon1,lat1,lon2,lat2"
  ward_id?: string;
  category?: string;
  status?: string;
  from?: string;      // ISO date
  to?: string;        // ISO date
}
```

**PostGIS Query (parameterised):**
```sql
SELECT
  c.id,
  c.category,
  c.status,
  c.created_at,
  ST_AsGeoJSON(gl.geom) AS geojson,
  -- PII fields conditionally included based on role
  CASE WHEN $role IN ('OFFICER','DEPARTMENT_HEAD','COMMISSIONER','ADMIN')
       THEN c.officer_id ELSE NULL END AS officer_id
FROM complaints c
JOIN gis_locations gl ON gl.complaint_id = c.id
WHERE ($bbox IS NULL OR ST_Within(gl.geom, ST_MakeEnvelope($1,$2,$3,$4, 4326)))
  AND ($ward_id IS NULL OR c.ward_id = $ward_id)
  AND ($category IS NULL OR c.category = $category)
  AND ($status IS NULL OR c.status = $status)
  AND ($from IS NULL OR c.created_at >= $from)
  AND ($to IS NULL OR c.created_at <= $to);
```

A `GIST` index on `gis_locations.geom` ensures spatial queries use the spatial index.

#### 4.2 Frontend Map Architecture

```
MapPage (Next.js)
  └── MapContainer (Leaflet, OSM tiles)
       ├── ComplaintPinsLayer   (GeoJSON → L.circleMarker, colour by status)
       ├── HeatmapLayer        (leaflet-heat plugin, toggled by user)
       ├── WardBoundariesLayer (GeoJSON polygons from /gis/wards, click → filter)
       └── ComplaintPopup      (ID, category, status, date, detail link)
```

Ward boundaries are fetched once on mount and cached in component state. Complaint pins re-fetch when any filter changes (debounced 300 ms).

---

### 5. Role Dashboards (Phases 4–6)

#### 5.1 Dashboard API Endpoints

| Role | Endpoint | Data Returned |
|---|---|---|
| Citizen | `GET /dashboard/citizen` | Own complaints + status history |
| Officer | `GET /dashboard/officer` | Assigned complaints sorted by priority desc |
| Department Head | `GET /dashboard/department` | Dept complaints, SLA rate, officer metrics |
| Commissioner | `GET /dashboard/executive` | City-wide volumes, resolution rates, SLA breaches |
| Admin | `GET /dashboard/admin` | User list, system health, manual review queue |

All endpoints are protected by the RBAC middleware. Attempting to call another role's endpoint returns HTTP 403.

#### 5.2 Status Update Flow

```typescript
// PATCH /complaints/:id/status  (Officer role only)
interface StatusUpdateBody {
  status: 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
  note?: string;
}

// Handler:
// 1. Verify complaint.officer_id === req.user.id
// 2. UPDATE complaints SET status = $status WHERE id = $id
// 3. INSERT INTO status_history (complaint_id, officer_id, status, note, created_at)
// 4. Trigger Notification Service for lifecycle event
// 5. If RESOLVED: cancel pending SLA job in Redis
```

#### 5.3 Frontend Dashboard Components

```
/app
 ├── (citizen)/dashboard/page.tsx       → CitizenDashboard
 ├── (officer)/dashboard/page.tsx       → OfficerDashboard
 ├── (department)/dashboard/page.tsx    → DepartmentDashboard
 ├── (commissioner)/dashboard/page.tsx  → ExecutiveDashboard
 └── (admin)/dashboard/page.tsx         → AdminDashboard
```

Each page is a React Server Component (Next.js 14) that fetches data on the server using the user's session cookie. Client components are used only for interactive elements (charts, maps, status update buttons). All pages are tested with axe-core for WCAG-AA compliance.

---

### 6. SLA Engine (Phase 7)

#### 6.1 SLA Rules

```typescript
// Seeded in sla_rules table
const DEFAULT_SLA_RULES = [
  { category: 'GARBAGE',       deadline_hours: 12 },
  { category: 'STREET_LIGHT',  deadline_hours: 24 },
  { category: 'WATER_LEAKAGE', deadline_hours: 48 },
  { category: 'ROAD_DAMAGE',   deadline_hours: 168 }, // 7 days
];
```

#### 6.2 Job Scheduling with BullMQ

```typescript
// sla-engine/scheduler.ts
import { Queue, Worker } from 'bullmq';

const slaQueue = new Queue('sla-deadlines', { connection: redis });

// Called when complaint is assigned
async function scheduleSLAJob(complaintId: string, category: string): Promise<void> {
  const rule = await getSLARule(category);
  const delayMs = rule.deadline_hours * 3600 * 1000;
  await slaQueue.add('check-sla', { complaintId }, {
    jobId: `sla:${complaintId}`,
    delay: delayMs,
  });
  await db.query(
    `UPDATE complaints SET sla_deadline = NOW() + INTERVAL '${rule.deadline_hours} hours' WHERE id = $1`,
    [complaintId]
  );
}
```

#### 6.3 SLA Worker — Escalation Logic

```typescript
const slaWorker = new Worker('sla-deadlines', async (job) => {
  const { complaintId } = job.data;
  const complaint = await getComplaint(complaintId);

  if (complaint.status === 'RESOLVED') return; // No breach

  // First escalation: notify Department Head
  await db.query(
    `UPDATE complaints SET escalated = true, breach_timestamp = NOW(),
     escalation_level = 1 WHERE id = $1`, [complaintId]
  );
  await notificationService.send({
    recipientId: complaint.department_head_id,
    event: 'COMPLAINT_ESCALATED',
    complaintId,
  });
  await insertAuditLog({ event: 'SLA_BREACH_L1', complaintId });

  // Schedule second escalation after additional 24 hours
  await slaQueue.add('check-sla-l2', { complaintId }, {
    jobId: `sla-l2:${complaintId}`,
    delay: 24 * 3600 * 1000,
  });
}, { connection: redis });
```

---

### 7. Notification Service (Phase 8)

#### 7.1 Notification Channels

| Channel | Library / API | Configuration |
|---|---|---|
| SMS | MSG91 REST API | API key, sender ID, route |
| Email | Resend or SendGrid SMTP | SMTP host/port, API key |
| WhatsApp | WhatsApp Business Cloud API | Phone number ID, access token |
| Web Push | `web-push` library + FCM | VAPID keys, FCM server key |

#### 7.2 Lifecycle Event → Notification Mapping

```typescript
const EVENT_NOTIFICATION_MAP: Record<string, (complaint: Complaint) => NotificationPayload[]> = {
  COMPLAINT_CREATED: (c) => [
    { recipientId: c.citizen_id, channels: ['SMS', 'EMAIL'], template: 'complaint_created' },
  ],
  COMPLAINT_ASSIGNED: (c) => [
    { recipientId: c.officer_id, channels: ['SMS', 'WEB_PUSH'], template: 'complaint_assigned' },
  ],
  COMPLAINT_IN_PROGRESS: (c) => [
    { recipientId: c.citizen_id, channels: ['SMS'], template: 'complaint_in_progress' },
  ],
  COMPLAINT_RESOLVED: (c) => [
    { recipientId: c.citizen_id, channels: ['SMS', 'EMAIL', 'WHATSAPP'], template: 'complaint_resolved' },
  ],
  COMPLAINT_REJECTED: (c) => [
    { recipientId: c.citizen_id, channels: ['EMAIL'], template: 'complaint_rejected' },
  ],
  COMPLAINT_ESCALATED: (c) => [
    { recipientId: c.department_head_id, channels: ['SMS', 'EMAIL'], template: 'complaint_escalated' },
  ],
  APPEAL_SUBMITTED: (c) => [
    { recipientId: 'admin', channels: ['EMAIL'], template: 'appeal_submitted' },
  ],
};
```

#### 7.3 Retry with Exponential Backoff

```typescript
interface NotificationJob {
  notificationId: string;
  channel: string;
  payload: any;
  attemptCount: number;
}

const notifWorker = new Worker('notifications', async (job: Job<NotificationJob>) => {
  const { notificationId, channel, payload, attemptCount } = job.data;
  try {
    await sendNotification(channel, payload);
    await db.query(`UPDATE notifications SET status = 'DELIVERED' WHERE id = $1`, [notificationId]);
  } catch (err) {
    await db.query(`UPDATE notifications SET status = 'FAILED', attempt_count = $1 WHERE id = $2`,
                   [attemptCount, notificationId]);
    if (attemptCount < 3) {
      const delay = Math.pow(2, attemptCount) * 60 * 1000; // 2^n minutes
      await notifQueue.add('notifications', { ...job.data, attemptCount: attemptCount + 1 }, { delay });
    }
  }
}, { connection: redis });
```

---

### 8. Privacy & Security (Phase 9)

#### 8.1 PII Redaction for AI Payloads

```typescript
// Before sending any complaint data to the AI Service
function redactPII(text: string): { redacted: string; tokenMap: Record<string, string> } {
  const tokenMap: Record<string, string> = {};
  let redacted = text;

  // Phone numbers
  redacted = redacted.replace(/(\+?91[\s-]?)?[6-9]\d{9}/g, (match) => {
    const token = `[PHONE_${Object.keys(tokenMap).length}]`;
    tokenMap[token] = match;
    return token;
  });

  // Email addresses
  redacted = redacted.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, (match) => {
    const token = `[EMAIL_${Object.keys(tokenMap).length}]`;
    tokenMap[token] = match;
    return token;
  });

  return { redacted, tokenMap };
}
```

#### 8.2 AES-256 Encryption at Rest

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ENCRYPTION_KEY = Buffer.from(process.env.FIELD_ENCRYPTION_KEY!, 'hex'); // 32 bytes

export function encryptField(plaintext: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptField(ciphertext: string): string {
  const [ivHex, tagHex, dataHex] = ciphertext.split(':');
  const decipher = createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return decipher.update(Buffer.from(dataHex, 'hex')).toString('utf8') + decipher.final('utf8');
}
```

#### 8.3 PII Masking in API Responses

```typescript
function maskPhone(phone: string): string {
  return phone.replace(/(\+91\s?)(\d{5})(\d{5})/, '$1$2 XXXXX');
}
function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  return `${user.slice(0, 2)}***@${domain}`;
}
```

#### 8.4 Audit Logging

Every write operation on watched tables is captured by a PostgreSQL trigger that fires `AFTER INSERT OR UPDATE OR DELETE` and inserts a row into `audit_logs` with: `table_name`, `operation`, `record_id`, `acting_user_id`, `changed_fields` (JSONB), `ip_address`, `user_agent`, `created_at`.

Auth events are logged explicitly in application code before returning responses.

---

### 9. Analytics Module (Phase 10)

#### 9.1 Analytics Endpoints and SQL

```typescript
// GET /analytics/by-category?from=...&to=...
// SQL:
// SELECT category, COUNT(*) as volume
// FROM complaints
// WHERE created_at BETWEEN $from AND $to
// GROUP BY category ORDER BY volume DESC;

// GET /analytics/by-ward
// SQL (PostGIS spatial join):
// SELECT w.name, w.id, COUNT(c.id) as volume
// FROM wards w LEFT JOIN gis_locations gl ON ST_Within(gl.geom, w.boundary)
// LEFT JOIN complaints c ON c.id = gl.complaint_id
// GROUP BY w.id, w.name ORDER BY volume DESC;

// GET /analytics/department-performance?dept_id=...&from=...&to=...
// SQL:
// SELECT d.name,
//   COUNT(c.id) AS total_assigned,
//   COUNT(CASE WHEN c.status='RESOLVED' THEN 1 END) AS total_resolved,
//   AVG(EXTRACT(EPOCH FROM (c.resolved_at - c.assigned_at))/3600) AS avg_resolution_hours,
//   ROUND(100.0 * SUM(CASE WHEN c.breach_timestamp IS NULL AND c.status='RESOLVED' THEN 1 ELSE 0 END)
//         / NULLIF(COUNT(c.id),0), 2) AS sla_compliance_pct
// FROM departments d JOIN complaints c ON c.department_id = d.id
// WHERE d.id = $dept_id AND c.created_at BETWEEN $from AND $to
// GROUP BY d.id, d.name;

// GET /analytics/satisfaction
// SQL:
// SELECT d.name, AVG(f.rating) AS avg_satisfaction
// FROM feedback f JOIN complaints c ON c.id = f.complaint_id
// JOIN departments d ON d.id = c.department_id
// GROUP BY d.id, d.name;
```

#### 9.2 Redis Caching Layer

```typescript
async function getCachedAnalytics<T>(
  cacheKey: string,
  computeFn: () => Promise<T>,
  ttlSeconds = 300
): Promise<T> {
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  const fresh = await computeFn();
  await redis.setex(cacheKey, ttlSeconds, JSON.stringify(fresh));
  return fresh;
}

// Usage:
const data = await getCachedAnalytics(
  `analytics:by-category:${from}:${to}`,
  () => db.query(BY_CATEGORY_SQL, [from, to]),
  300
);
```

---

### 10. AI Explainability & Appeals (Phase 11)

#### 10.1 Complaint Detail API Response (with Reasoning)

```typescript
interface ComplaintDetailResponse {
  id: string;
  category: string;
  status: string;
  created_at: string;
  description: string;
  channel: string;
  ai_reasoning: {
    predicted_category: string;
    confidence: number;
    keywords: string[];
    entities: Array<{ text: string; label: string }>;
    similarity_score?: number;
    nearest_master_incident_id?: string;
    yolo_detections?: Array<{ label: string; confidence: number }>;
    ocr_text?: string;
    whisper_transcript?: string;
  };
  status_history: Array<{ status: string; note: string; created_at: string }>;
}
```

#### 10.2 Appeals Workflow

```
Citizen submits appeal
  POST /complaints/:id/appeal  { reason: string }
         │
         ▼
INSERT INTO appeals (complaint_id, citizen_id, reason, status='PENDING', created_at)
         │
         ▼
Notification Service → APPEAL_SUBMITTED event → System Admin email
         │
         ▼
Admin sees appeal in /dashboard/admin (manual review queue)
         │
         ▼
Admin resolves: PATCH /appeals/:id/resolve  { new_category, new_department_id }
         │
         ▼
1. UPDATE complaints SET category = new_category, department_id = new_department_id
2. INSERT INTO status_history (complaint_id, admin_id, status='APPEAL_OVERRIDE', note)
3. UPDATE complaints SET officer_id = NULL, status = 'ASSIGNED' (re-route)
4. UPDATE appeals SET status = 'RESOLVED', resolved_at = NOW()
5. Schedule new SLA job for re-routed complaint
```

#### 10.3 AI Reasoning Panel (Frontend Component)

```tsx
// components/AIReasoningPanel.tsx
export function AIReasoningPanel({ reasoning }: { reasoning: AIPredictionReasoning }) {
  return (
    <section aria-labelledby="ai-reasoning-title" className="rounded-lg border p-4">
      <h2 id="ai-reasoning-title" className="font-semibold">AI Classification Reasoning</h2>
      <dl className="mt-3 grid gap-2">
        <div><dt>Category</dt><dd>{reasoning.predicted_category}</dd></div>
        <div><dt>Confidence</dt><dd>{(reasoning.confidence * 100).toFixed(1)}%</dd></div>
        <div><dt>Keywords</dt><dd>{reasoning.keywords.join(', ')}</dd></div>
        <div><dt>Entities</dt><dd>{reasoning.entities.map(e => `${e.text} (${e.label})`).join('; ')}</dd></div>
        {reasoning.similarity_score && (
          <div><dt>Duplicate Match Score</dt><dd>{reasoning.similarity_score.toFixed(2)}</dd></div>
        )}
        {reasoning.yolo_detections?.length > 0 && (
          <div><dt>Detected Objects</dt>
            <dd>{reasoning.yolo_detections.map(d => d.label).join(', ')}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}
```

---

## Data Models

### Core Database Tables

```sql
-- Users & Auth
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_encrypted TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,  -- argon2id
  role TEXT NOT NULL CHECK (role IN ('CITIZEN','OFFICER','DEPARTMENT_HEAD','COMMISSIONER','ADMIN')),
  is_verified BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE,
  locked_until TIMESTAMPTZ,
  notification_opt_outs TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE citizens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  phone_encrypted TEXT,
  national_id_encrypted TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Departments & Officers
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  head_user_id UUID REFERENCES users(id)
);

CREATE TABLE officers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  department_id UUID REFERENCES departments(id),
  name TEXT NOT NULL
);
```

```sql
-- Complaints
CREATE TABLE complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id TEXT UNIQUE NOT NULL,  -- e.g. "CRP-2024-000001"
  citizen_id UUID REFERENCES citizens(id),
  channel TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'EN',
  raw_text TEXT,
  translated_text TEXT,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','MANUAL_REVIEW','ASSIGNED','IN_PROGRESS','RESOLVED','REJECTED','APPEAL_OVERRIDE')),
  department_id UUID REFERENCES departments(id),
  officer_id UUID REFERENCES officers(id),
  ward_id UUID REFERENCES wards(id),
  priority_score FLOAT,
  escalated BOOLEAN DEFAULT FALSE,
  escalation_level INT DEFAULT 0,
  sla_deadline TIMESTAMPTZ,
  breach_timestamp TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  assigned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wards & GIS
CREATE TABLE wards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  boundary GEOMETRY(MultiPolygon, 4326) NOT NULL
);

CREATE TABLE gis_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID REFERENCES complaints(id),
  geom GEOMETRY(Point, 4326) NOT NULL,
  address TEXT
);
CREATE INDEX ON gis_locations USING GIST(geom);

-- AI Predictions
CREATE TABLE ai_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID REFERENCES complaints(id),
  model_name TEXT NOT NULL,
  model_version TEXT NOT NULL,
  category TEXT,
  confidence FLOAT,
  priority_score FLOAT,
  is_manual_review BOOLEAN DEFAULT FALSE,
  reasoning JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Status History
CREATE TABLE status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID REFERENCES complaints(id),
  changed_by UUID REFERENCES users(id),
  status TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appeals
CREATE TABLE appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID REFERENCES complaints(id),
  citizen_id UUID REFERENCES citizens(id),
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING','RESOLVED','REJECTED')),
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID REFERENCES users(id),
  complaint_id UUID REFERENCES complaints(id),
  channel TEXT NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING',
  attempt_count INT DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT,
  operation TEXT,
  record_id UUID,
  acting_user_id UUID,
  changed_fields JSONB,
  ip_address INET,
  user_agent TEXT,
  event TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Consent Records
CREATE TABLE consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  consent_version TEXT NOT NULL,
  consented_at TIMESTAMPTZ DEFAULT NOW()
);

-- SLA Rules
CREATE TABLE sla_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL UNIQUE,
  deadline_hours INT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Duplicate Groups (Master Incidents)
CREATE TABLE duplicate_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_complaint_id UUID REFERENCES complaints(id),
  duplicate_complaint_id UUID REFERENCES complaints(id),
  similarity_score FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feedback
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID REFERENCES complaints(id),
  citizen_id UUID REFERENCES citizens(id),
  rating INT CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Translation Logs
CREATE TABLE translation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID REFERENCES complaints(id),
  original_text TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  source_language TEXT NOT NULL,
  model_used TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Evidence Tables
CREATE TABLE complaint_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID REFERENCES complaints(id),
  minio_key TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT
);

CREATE TABLE complaint_audio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID REFERENCES complaints(id),
  minio_key TEXT NOT NULL,
  mime_type TEXT,
  duration_seconds INT
);

CREATE TABLE complaint_video (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID REFERENCES complaints(id),
  minio_key TEXT NOT NULL,
  mime_type TEXT,
  duration_seconds INT
);
```

---

## Components and Interfaces

### Service Interface Contracts

#### Auth Service — Public API

| Method | Path | Auth | Request Body | Response |
|---|---|---|---|---|
| POST | `/auth/register` | None | `{ name, email, phone, password, role? }` | `{ userId, message }` |
| GET | `/auth/verify-email` | None | `?token=...` | `{ message }` |
| POST | `/auth/verify-otp` | None | `{ phone, otp }` | `{ message }` |
| POST | `/auth/login` | None | `{ email, password }` or `{ phone, otp }` | `{ accessToken }` + httpOnly refresh cookie |
| POST | `/auth/refresh` | httpOnly cookie | — | `{ accessToken }` |
| POST | `/auth/logout` | Bearer | — | `{ message }` |
| POST | `/auth/forgot-password` | None | `{ email }` | `{ message }` |
| POST | `/auth/reset-password` | None | `{ token, newPassword }` | `{ message }` |
| GET | `/auth/me` | Bearer | — | `{ id, role, email, name }` |

#### Complaint Service — Public API

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/complaints` | Citizen | Create complaint (web form) |
| POST | `/complaints/voice` | Citizen | Voice/audio intake (multipart) |
| POST | `/complaints/image` | Citizen | Image intake (multipart) |
| POST | `/complaints/video` | Citizen | Video intake (multipart) |
| POST | `/webhooks/whatsapp` | Webhook sig | WhatsApp Business inbound |
| POST | `/webhooks/sms` | Webhook sig | MSG91 SMS inbound |
| GET | `/complaints/:id` | Bearer | Complaint detail with AI reasoning |
| PATCH | `/complaints/:id/status` | Officer | Update status + note |
| POST | `/complaints/:id/appeal` | Citizen | Submit classification appeal |
| GET | `/dashboard/citizen` | Citizen | Citizen dashboard data |
| GET | `/dashboard/officer` | Officer | Officer queue data |
| GET | `/dashboard/department` | Dept Head | Department metrics |
| GET | `/dashboard/executive` | Commissioner | City-wide metrics |
| GET | `/dashboard/admin` | Admin | Admin panel data |

#### GIS Service — Public API

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/gis/complaints` | Bearer | GeoJSON complaints with spatial filters |
| GET | `/gis/wards` | Bearer | Ward boundary GeoJSON |
| GET | `/gis/heatmap` | Bearer | Heatmap point data |

#### Analytics Service — Public API

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/analytics/by-category` | Dept Head+ | Volume by category + date range |
| GET | `/analytics/by-ward` | Dept Head+ | Volume by ward (PostGIS join) |
| GET | `/analytics/department-performance` | Dept Head+ | Resolution time, SLA compliance |
| GET | `/analytics/satisfaction` | Dept Head+ | Avg satisfaction per department |

#### AI Service — Internal API (not exposed to frontend)

| Method | Path | Caller | Description |
|---|---|---|---|
| POST | `/ai/analyse` | Core API | Full inference pipeline for a complaint |
| POST | `/ai/translate` | Core API | IndicTrans2/NLLB translation |
| POST | `/ai/transcribe` | Core API | Whisper STT for audio |
| POST | `/ai/ocr` | Core API | EasyOCR for image text extraction |
| GET | `/ai/health` | Docker healthcheck | Service liveness |

#### SLA Engine — Internal

The SLA Engine is not a separate HTTP service. It runs as a BullMQ Worker process within the Core API container, sharing the Redis connection. It exposes no HTTP endpoints; it is triggered by queue events.

#### Notification Service — Internal

The Notification Service is a module within the Core API, called directly as a TypeScript function. External delivery is via REST calls to MSG91, Resend/SendGrid, WhatsApp Business Cloud API, and the Web Push library.

---

### Frontend Component Tree

```
app/
├── layout.tsx                    ← Root layout (theme, font, global providers)
├── (auth)/
│   ├── login/page.tsx            ← Login form (email+password / mobile+OTP)
│   ├── register/page.tsx         ← Registration form + consent checkbox
│   ├── verify-email/page.tsx     ← Email verification landing
│   └── reset-password/page.tsx   ← Password reset form
├── (citizen)/
│   ├── dashboard/page.tsx        ← Complaint list, status timeline
│   ├── complaints/new/page.tsx   ← Multi-channel complaint submission
│   └── complaints/[id]/page.tsx  ← Complaint detail + AI reasoning + appeal
├── (officer)/
│   ├── dashboard/page.tsx        ← Priority queue, SLA timers
│   └── complaints/[id]/page.tsx  ← Status update + field notes
├── (department)/
│   └── dashboard/page.tsx        ← Dept complaints, officer metrics, reassign
├── (commissioner)/
│   └── dashboard/page.tsx        ← City-wide stats, SLA breach list, heatmap
├── (admin)/
│   ├── dashboard/page.tsx        ← User management, review queue, system health
│   └── appeals/[id]/page.tsx     ← Appeal resolution interface
└── map/page.tsx                  ← Full-screen GIS map (all authenticated roles)

components/
├── ui/                           ← Shadcn UI primitives (Button, Card, Dialog…)
├── AIReasoningPanel.tsx          ← AI explanation panel
├── ComplaintTimeline.tsx         ← Status history timeline
├── MapContainer.tsx              ← Leaflet map wrapper (dynamic import, SSR=false)
├── ComplaintPinsLayer.tsx        ← GeoJSON marker layer
├── HeatmapLayer.tsx              ← leaflet-heat plugin layer
├── WardBoundariesLayer.tsx       ← Ward polygon layer
├── SLACountdown.tsx              ← Real-time SLA deadline timer
├── NotificationBadge.tsx         ← Unread notification count
├── AnalyticsChart.tsx            ← Recharts bar/line/pie wrapper
└── AccessibilityAnnouncer.tsx    ← ARIA live region for dynamic updates
```

---

### Environment Configuration

```bash
# Core API (.env)
DATABASE_URL=postgresql://user:pass@db:5432/crp
REDIS_URL=redis://cache:6379
MINIO_ENDPOINT=storage:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=complaints
JWT_ACCESS_SECRET=<32-byte-hex>
JWT_REFRESH_SECRET=<32-byte-hex>
FIELD_ENCRYPTION_KEY=<32-byte-hex>
MSG91_API_KEY=
MSG91_SENDER_ID=
MSG91_TEMPLATE_ID=
RESEND_API_KEY=          # or SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
AI_SERVICE_URL=http://ai-service:8000
FRONTEND_URL=https://crp.example.com
NODE_ENV=production

# AI Service (.env)
DATABASE_URL=postgresql://user:pass@db:5432/crp
DISTILBERT_MODEL_PATH=/models/distilbert-civic
SPACY_MODEL_PATH=/models/spacy-civic-ner
YOLO_MODEL_PATH=/models/yolov8-civic.pt
XGBOOST_MODEL_PATH=/models/xgboost-priority.json
SENTENCE_TRANSFORMER_MODEL=all-MiniLM-L6-v2
WHISPER_MODEL_SIZE=base
INDICTRANS2_MODEL_PATH=/models/indictrans2
NLLB_MODEL_PATH=/models/nllb-200-distilled-600M

# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
```

---

## Correctness Properties

These properties define the formal correctness guarantees the system must maintain. Each is expressed as a verifiable invariant and maps to property-based tests.

### Property 1: Authentication Token Integrity

**Validates: Requirements 1.4, 1.5, 1.6, 1.7**

**Invariant:** For any `refresh_token` T, if T was issued at time t₀ with TTL=7 days, then:
- T is accepted if and only if `current_time < t₀ + 7 days` AND `revoked = false`.
- After `POST /auth/logout`, T.revoked = true and all subsequent refresh requests with T return HTTP 401.
- After a successful password reset, all refresh tokens for that user have `revoked = true`.

**Property-Based Test:** Generate random token issuance/revocation sequences; assert the invariant holds for every sequence.

### Property 2: RBAC Non-Bypass

**Validates: Requirements 1.1, 1.10, 5.6**

**Invariant:** For any API endpoint E and role R, if R is not in `PERMISSION_MATRIX[E]`, then any request to E bearing a valid JWT with role=R returns HTTP 403 and no data from E is leaked.

**Property-Based Test:** Generate all (endpoint, role) combinations not in the permission matrix; assert every request returns 403 with no response body data.

### Property 3: Complaint Status Monotonicity

**Validates: Requirements 5.2, 5.7**

**Invariant:** A complaint's status sequence must follow valid transitions only:
```
PENDING → MANUAL_REVIEW | ASSIGNED
ASSIGNED → IN_PROGRESS | REJECTED
IN_PROGRESS → RESOLVED | REJECTED
RESOLVED → APPEAL_OVERRIDE (only via Admin)
APPEAL_OVERRIDE → ASSIGNED (re-route)
```
No other transitions are permitted. Every status change produces a `status_history` row.

**Property-Based Test:** Generate random status-update sequences; assert only valid transitions succeed and `status_history` is append-only.

### Property 4: PII Isolation

**Validates: Requirements 8.2, 8.3, 8.4**

**Invariant:** No API response payload served to a CITIZEN role contains the raw (unmasked) phone, email, or national ID of any citizen other than the requesting user. No payload sent to the AI Service contains raw PII (name, phone, email) for any citizen.

**Property-Based Test:** Generate complaints with synthetic PII; assert AI payloads contain no matching raw PII strings; assert Citizen-role responses return masked strings matching the masking pattern.

### Property 5: SLA Deadline Determinism

**Validates: Requirements 6.2, 6.3, 6.5**

**Invariant:** For a complaint C assigned to category K at time t, `C.sla_deadline = t + SLA_RULES[K].deadline_hours * 3600 seconds`. If `C.status ≠ RESOLVED` at `C.sla_deadline`, then `C.escalated = true` and an `audit_logs` entry exists with `event = 'SLA_BREACH_L1'`.

**Property-Based Test:** Generate complaints with backdated assignment times and shortened SLA rules; run the worker; assert breach + audit log invariants hold for all generated complaints.

### Property 6: Notification Delivery Guarantee

**Validates: Requirements 7.6, 7.7**

**Invariant:** For every complaint lifecycle event E, at least one notification attempt is made per required channel. If all 3 retry attempts fail, the notification status is `FAILED` and `attempt_count = 3`. Notifications are never silently dropped.

**Property-Based Test:** Mock delivery channels to fail deterministically; assert `notifications` table records exactly 3 attempts per notification, status = `FAILED`.

### Property 7: Deduplication Consistency

**Validates: Requirements 3.7**

**Invariant:** If complaint A and complaint B have cosine similarity > 0.85, then both share the same `master_incident_id` (directly or transitively via `duplicate_groups`). No complaint can belong to two different Master Incidents simultaneously.

**Property-Based Test:** Generate synthetic embedding pairs with controlled similarity; assert grouping invariants hold.

### Property 8: Consent Before Data

**Validates: Requirements 8.1**

**Invariant:** No row in `complaints` exists without a corresponding row in `consent_records` with a matching `user_id` and a `consented_at` timestamp that precedes `complaints.created_at`.

**Property-Based Test:** Attempt complaint creation without consent; assert HTTP 422 and no complaint row is persisted.

---

## Error Handling

### API Error Response Shape

All error responses follow a standard JSON envelope:

```typescript
interface ApiError {
  error: {
    code: string;        // e.g. "AUTH_TOKEN_EXPIRED"
    message: string;     // Human-readable description
    details?: unknown;   // Optional field-level validation errors
    requestId: string;   // UUID for log correlation
  };
}
```

### Error Code Registry

| Code | HTTP Status | Trigger |
|---|---|---|
| `AUTH_TOKEN_EXPIRED` | 401 | JWT access token past TTL |
| `AUTH_TOKEN_INVALID` | 401 | Malformed or tampered JWT |
| `AUTH_REFRESH_REVOKED` | 401 | Refresh token revoked or not found |
| `AUTH_ACCOUNT_LOCKED` | 423 | Account locked after 5 failed attempts |
| `AUTH_ACCOUNT_UNVERIFIED` | 403 | Attempt to file complaint before verification |
| `RBAC_FORBIDDEN` | 403 | Role not in permission matrix for endpoint |
| `COMPLAINT_NOT_FOUND` | 404 | Complaint ID does not exist |
| `COMPLAINT_CONSENT_MISSING` | 422 | Complaint submitted without consent record |
| `COMPLAINT_UPLOAD_TOO_LARGE` | 413 | Attachment exceeds 50 MB limit |
| `AI_SERVICE_UNAVAILABLE` | 503 | FastAPI service unreachable; complaint queued for retry |
| `GIS_INVALID_BBOX` | 400 | Bounding box coordinates out of range or malformed |
| `NOTIFICATION_ALL_RETRIES_FAILED` | — | Internal; logged to `notifications` table |
| `VALIDATION_ERROR` | 422 | Request body fails schema validation (Zod) |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server exception |

### Resilience Patterns

**AI Service Unavailability:** If the FastAPI AI Service is unreachable, the Core API places the complaint in a `ai-pending` BullMQ queue with a 5-minute retry delay (up to 5 attempts). The complaint is created with `status = PENDING` and `category = null` until AI processing completes. Citizens see "Analysis in progress…" on the detail page.

**Database Connection Failures:** The Core API uses `pg-pool` with a maximum of 20 connections and a 30-second connection timeout. On pool exhaustion, requests receive HTTP 503. A `pg_bouncer` sidecar is recommended for production.

**MinIO Unavailability:** File uploads return HTTP 503 if MinIO is unreachable. No partial complaint records are written (transaction rollback).

**Redis Unavailability:** BullMQ jobs fail to enqueue; the Core API logs the error and falls back to in-process scheduling with a warning. SLA timers may not fire if Redis is down for an extended period — this is surfaced in the system health dashboard.

**Webhook Signature Verification:** WhatsApp and MSG91 webhooks verify payload signatures before processing. Invalid signatures return HTTP 403 and log to `audit_logs`. Duplicate webhook deliveries are idempotent (deduplicated by `X-Hub-Signature` / MSG91 message ID).

---

## Testing Strategy

### Layer-by-Layer Test Coverage

#### Unit Tests (Jest — Core API; pytest — AI Service)

- Auth service: token generation, argon2 hashing, lockout counter logic, PII masking functions.
- SLA engine: deadline calculation for all 4 categories, escalation state machine.
- Notification service: event-to-channel mapping, retry backoff delay calculations.
- Analytics queries: SQL aggregations tested against a seeded in-memory SQLite (or test Postgres container).
- AI service: each model adapter (DistilBERT, spaCy, XGBoost, Sentence-Transformers) tested with fixed fixtures to assert expected outputs.
- PII redaction: regex patterns tested against 50+ synthetic PII strings in each supported format.

#### Integration Tests (Supertest — Core API; pytest + httpx — AI Service)

- Full auth flow: register → verify email → login → refresh → logout → reuse token (expect 401).
- Complaint lifecycle: create → AI analyse → assign → status update → resolve → notification dispatch.
- RBAC matrix: all (endpoint, role) combinations; assert 403 for every forbidden pair.
- File upload pipeline: multipart upload → MinIO storage → evidence table row.
- SLA escalation: insert complaint with backdated `sla_deadline`; trigger worker; assert `escalated=true` + audit log.
- Analytics cache: call endpoint twice; assert Redis TTL set; assert second call returns cached data.

#### End-to-End Tests (Playwright)

- Citizen: register, verify email, submit complaint (web form + image), view AI reasoning panel, submit appeal.
- Officer: login, view priority queue, update complaint status, upload resolution photo.
- Admin: login, view manual review queue, override AI classification, verify re-routing.
- WCAG-AA: axe-core assertions injected into each Playwright test for login, dashboard, and complaint-detail pages.
- Responsive: Playwright viewport tests at 375px, 768px, 1280px, 1920px.

#### Property-Based Tests (fast-check — TypeScript; Hypothesis — Python)

One property-based test per correctness property P1–P8 (defined in Correctness Properties section). Each runs a minimum of 1000 generated inputs per CI run.

### CI Pipeline (GitHub Actions)

```yaml
# .github/workflows/ci.yml — abbreviated
jobs:
  api-tests:
    steps:
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test:unit
      - run: npm run test:integration   # Requires test Postgres + Redis containers

  ai-tests:
    steps:
      - run: pip install -r requirements-test.txt
      - run: ruff check .
      - run: pytest tests/ --cov=app --cov-report=xml

  e2e-tests:
    needs: [api-tests, ai-tests]
    steps:
      - run: docker compose -f docker-compose.test.yml up -d
      - run: npx playwright test

  deploy:
    needs: [e2e-tests]
    if: github.ref == 'refs/heads/main'
    steps:
      - run: railway deploy          # Core API + AI Service
      - run: vercel --prod           # Frontend
```

### Seed Data for Testing

A `scripts/seed.ts` script populates:
- 5 users (one per role) with known credentials for automated tests.
- 5 departments with realistic names (Sanitation, Infrastructure, Utilities, Roads, Lighting).
- 3 wards with real GeoJSON polygon boundaries (from a sample Indian municipality).
- 100 complaints spread across all categories and wards, with varied statuses, SLA states, and AI prediction records.
- 20 feedback records with ratings 1–5.
- 10 duplicate groups (Master Incidents) with similarity scores 0.85–0.98.

All seed data uses `faker` for names/addresses but real coordinate ranges within the sample ward boundaries.
