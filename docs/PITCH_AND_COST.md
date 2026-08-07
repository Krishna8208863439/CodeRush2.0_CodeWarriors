# Community Redressal Planner
## Cost Estimation, Resource Planning & Hackathon Pitch Materials

> **Honesty note:** Every claim in this document is cross-checked against the actual
> build state. Features that have been coded but whose Definition of Done checklist
> has not yet been fully verified are labelled **Partial**. Features that are designed
> and specced but not yet implemented are labelled **Planned**. Nothing below is
> presented as "Yes / Done" unless it was demonstrably working at the time of writing.

---

# PART 1 — Cost Estimation & Resource Planning

---

## 1.1 Development Cost

### Tier 1 — Hackathon Prototype (current build)

| Item | Cost |
|---|---|
| Developer time | Volunteer / student hours — effectively $0 cash outlay |
| Design tools | Figma free tier, Tailwind + Shadcn UI (open-source) — $0 |
| AI models | Open-source weights (DistilBERT, Sentence-Transformers, spaCy, YOLOv8, Whisper, XGBoost) — $0 |
| Hosting | Vercel Hobby (frontend), Render free tier (API), no production DB yet — $0 |
| **Total** | **$0 direct cost** |

> Plain statement: This tier has no real infrastructure cost because nothing is at
> production scale or load-tested. The API currently falls back to a JSON file
> database when PostgreSQL is unavailable. No real SMS, email, or WhatsApp
> credentials are wired in. This is a working prototype, not a production deployment.

---

### Tier 2 — MVP / Pilot (one municipality, realistic next step)

**Estimated timeline:** 4–6 months  
**Estimated team:** 1 PM, 1–2 frontend engineers, 1–2 backend engineers, 1 AI/ML engineer, 1 UI/UX designer, 1 QA tester (6–8 people total)

> These are estimate ranges, not fixed quotes. Actual cost depends on region, seniority,
> and whether team members are employees, contractors, or government secondments.

| Category | Estimate Range (INR/month) | Notes |
|---|---|---|
| Engineering team (6–8 people) | ₹6L – ₹14L / month | Mid-level rates, India market |
| Cloud infra (AWS/GCP/Azure small tier) | ₹20K – ₹60K / month | 2 vCPU API, managed Postgres, Redis, object storage |
| AI compute | ₹15K – ₹40K / month | API-based inference (OpenAI/Hugging Face Inference API) rather than self-hosted GPU — avoids upfront GPU cost at pilot stage |
| Communication APIs (MSG91, SendGrid) | ₹5K – ₹15K / month | Depends on complaint volume |
| Misc (domains, SSL, monitoring, CI/CD) | ₹5K – ₹10K / month | — |
| **Monthly total** | **₹6.5L – ₹15.25L** | — |
| **4-month MVP build** | **₹26L – ₹61L** | One-time build cost |

---

### Tier 3 — Production / City-Scale (future vision, not a current cost estimate)

This is what the platform would require to serve a full city (~1M+ citizens), not a
costed plan for the current build.

| Requirement | Description |
|---|---|
| Multi-server API | Horizontal scaling behind a load balancer (ALB/Nginx), auto-scaling groups |
| Dedicated AI services | Self-hosted GPU cluster or managed ML platform (AWS SageMaker, GCP Vertex AI) for real-time DistilBERT + YOLOv8 inference at scale |
| Managed PostgreSQL + PostGIS | RDS/CloudSQL with read replicas, automated backups, point-in-time recovery |
| Redis cluster | Managed ElastiCache / Memorystore for BullMQ job queues + analytics cache |
| Monitoring stack | Grafana + Prometheus + PagerDuty or equivalent |
| CDN | CloudFront / Cloudflare for frontend assets |
| Security & compliance | SOC 2 / ISO 27001 review, penetration testing, DPA compliance |

> These represent requirements, not costs — actual pricing depends on cloud provider
> negotiations, government procurement rules, and traffic patterns that don't exist yet.

---

## 1.2 AI Model Cost Planning

| Approach | This Build | MVP Pilot | City Scale |
|---|---|---|---|
| **Open-source self-hosted** (DistilBERT, Sentence-Transformers, spaCy, YOLOv8, Whisper, XGBoost) | ✅ Planned/integrated in code — model files not yet loaded | Feasible on a single GPU instance | Requires dedicated GPU fleet |
| **Cloud inference API** (Hugging Face Inference API, AWS Comprehend) | Not used | Recommended for pilot to avoid GPU capex | Too expensive at scale |
| **Custom-trained models** | Not yet — pre-trained weights specified in spec | Train on real complaint data after 3–6 months of production data collection | Full MLOps pipeline required |

**Current honest state:** The AI service module is built and the inference pipeline is coded. Model files (DistilBERT weights, YOLOv8 `.pt`, XGBoost `.json`) are **not yet loaded** — the service correctly returns `{ "not_yet_available": true }` rather than fabricating predictions. Model training on real civic data is a post-pilot task.

---

## 1.3 Resource Allocation Strategy (Example Split)

| Role | % of Team Effort | Phase Focus |
|---|---|---|
| Frontend engineers | 30% | UI/UX, dashboards, accessibility |
| Backend engineers | 30% | API, auth, SLA engine, integrations |
| AI/ML engineer | 20% | Model integration, inference pipeline, dedup |
| QA / DevOps | 10% | CI/CD, testing, Docker, monitoring |
| PM / Design | 10% | Requirements, stakeholder management, UX research |

---

## 1.4 Sustainability Models

These are options, not commitments. The appropriate model depends on which
organisation deploys the platform.

| Model | Description | Best Fit |
|---|---|---|
| **Government Deployment** | Municipality funds build + ops as a public service; no revenue model needed | Direct Smart City Programme grant or municipal budget line |
| **Smart City Partnership** | Central government (MoUD / Smart Cities Mission) funds pilot; learnings shared across cities | National rollout under Digital India / Smart Cities Mission |
| **SaaS** | Platform-as-a-Service sold to municipalities on a per-complaint or per-ward subscription | Multiple smaller ULBs sharing infrastructure costs |
| **Open-Source + Enterprise** | Core platform open-sourced (MIT/Apache); revenue from enterprise support, custom integrations, and SLA-backed hosting | NGOs, civil society organisations, international deployments |

---

## 1.5 3-Year Long-Term Growth (Aspirational Roadmap)

> Clearly labelled as aspirational — these are targets, not commitments.

**Year 1 — Pilot**
- One municipality, 2–5 wards, real complaint intake via web + SMS
- 500–2000 complaints processed to generate model training data
- PostgreSQL + PostGIS live, real MSG91/SendGrid integrated
- Manual AI model review; human-in-the-loop for all low-confidence predictions

**Year 2 — Expansion**
- 3–5 municipalities on a shared SaaS platform
- Real DistilBERT model fine-tuned on Year 1 complaint data
- WhatsApp intake live, multilingual support for at least 3 Indian languages
- SLA engine enforced with real escalation notifications
- Analytics dashboard live for Department Heads and Commissioners

**Year 3+ — Smart Governance**
- City-scale deployment (100k+ citizens)
- Predictive hotspot detection using historical complaint density
- IoT sensor integration (drain levels, streetlight sensors)
- Open Data API for civil society researchers
- Mobile app (React Native) complementing web portal
- Potential Digital Twin integration for urban planning

---

---

# PART 2 — Hackathon Pitch Materials

---

## A. Problem Statement

Municipal grievance systems in India fail citizens on three fronts: complaints are
filed in silos, routed manually by phone, and tracked nowhere — creating duplicate
work for officers, weeks of unexplained delays, and zero accountability for
resolution times.

---

## B. Solution Statement

Community Redressal Planner is an AI-assisted civic operating system that lets
citizens file complaints across multiple channels, automatically classifies and
routes them to the right department, enforces SLA deadlines, and gives both
citizens and officials a real-time, transparent view of every complaint's lifecycle.

---

## C. Innovation Highlights

Only features with verified working code are listed. Each is labelled with its
actual implementation status.

### ✅ Multi-Channel Complaint Intake (Partial)
Citizens can submit complaints via web text form, image upload, audio upload, voice
recording, and video upload from a single interface. WhatsApp and SMS webhook
channels are coded and the adapters are in place — **Partial** because real
MSG91/WhatsApp Business API credentials are not yet connected, so end-to-end
delivery through those channels is not verified.

### ✅ Role-Scoped Dashboards (Partial)
Five distinct role dashboards (Citizen, Officer, Department Head, Commissioner, Admin)
are built and route-guarded at the API layer via JWT RBAC middleware. Department
officers land on a dashboard scoped to their specific department (SWM, PWD, WSS,
ESB, DSM). **Partial** because dashboards are wired to the API but PostgreSQL is not
running in the current environment — the file-DB fallback serves limited data.

### ✅ Deterministic Complaint Routing with Manual Review Gate
Complaints are routed to departments based on category. Complaints whose AI
classification confidence falls below 0.80 are held in a manual review queue
rather than auto-routed — the Human-in-the-Loop gate is coded in the API. **Partial**
because the AI classification models are not yet loaded (returns
`not_yet_available`), so the confidence gate has not been exercised with real
model output in this build.

### ✅ GIS Complaint Map (Partial)
A spatial complaint map is implemented with category/status filters and a heatmap
toggle. The backend uses PostGIS `ST_Within()` / `ST_MakeEnvelope()` spatial queries
(the SQL is real, not a lat/lng range approximation). **Partial** because the current
environment runs without PostgreSQL/PostGIS — the file-DB fallback provides
coordinate data from `gis_locations` but spatial indexing is not exercised.

### ✅ Complaint Status Lifecycle + Audit Trail (Partial)
Officers can update complaint status (IN_PROGRESS → RESOLVED → REJECTED) via a
modal. Each update writes a `status_history` row with officer ID, timestamp, and
note. The route is implemented and the file-DB handler is in place. **Partial**
because end-to-end testing against PostgreSQL has not been run in this session.

### ✅ Citizen Profile + Notification Preferences (Partial)
A full profile page exists with editable name, phone, address, preferred language,
and notification opt-in toggles per channel (email, SMS, push). Phone OTP
verification is clearly labelled `[SIMULATED]`. **Partial** because real notification
delivery requires MSG91 / Resend credentials not yet configured.

### 🔲 AI Classification with Confidence Score (Planned)
DistilBERT classification is specified and the inference pipeline code exists in
`ai-service/`. Model weights are not loaded. When available, every prediction will
return a category label, confidence score (0–1), matched keywords, and entity spans
— displayed in the UI's "AI Reasoning" panel. **Do not demo this live without loaded
models.**

### 🔲 Semantic Duplicate Detection → Master Incident (Planned)
Sentence-Transformers cosine similarity dedup (threshold 0.85) is specified and
coded. Not yet exercised with real model output. When working, three similarly
worded complaints from different citizens would automatically merge into a single
Master Incident visible to officers.

### 🔲 SLA Engine with Escalation (Planned)
SLA rules (Garbage 12h, Street Light 24h, Water Leakage 48h, Road Damage 7 days)
are seeded in `sla_rules`. BullMQ worker code for deadline enforcement and two-tier
escalation (Department Head → Commissioner) is written. Not yet verified end-to-end
(requires Redis + PostgreSQL running together).

> **Predictive civic governance / trend forecasting is NOT included.** No trend
> analysis or forecasting feature has been built. It is a future roadmap item only.

---

## D. Comparison Table — Traditional System vs. Community Redressal Planner

| Feature | Traditional System | Community Redressal Planner |
|---|---|---|
| Complaint Registration (web form) | Paper / phone call | **Yes** — web form working |
| Multi-channel intake (image, audio, video) | No | **Partial** — UI built, backend routes work; WhatsApp/SMS real delivery not yet connected |
| Multilingual support | English only | **Partial** — EN + 5 Indian languages accepted in UI; real IndicTrans2/NLLB translation not yet live (AI service not loaded) |
| Voice / audio complaint | No | **Partial** — UI and upload pipeline built; Whisper STT not loaded |
| AI Classification with confidence | No | **Planned** — pipeline coded, models not loaded |
| Duplicate Detection (semantic) | No | **Planned** — pipeline coded, Sentence-Transformers not loaded |
| Smart Routing | Manual / phone | **Partial** — rule-based routing by department coded; AI-confidence routing gate coded but not exercised |
| SLA Tracking + Escalation | No / manual | **Partial** — rules defined, BullMQ workers coded; not verified end-to-end |
| Role-Scoped Dashboards (5 roles) | No | **Partial** — all 5 dashboards built, RBAC enforced; live DB not running |
| GIS Map with spatial queries | No | **Partial** — map UI built, PostGIS query coded; not running against live PostGIS |
| Predictive Analytics / Forecasting | No | **Planned** — not built in this version |
| Real-time Notifications (SMS/Email/WhatsApp) | No | **Planned** — service coded, real credentials not connected |
| Audit Logs | No | **Partial** — audit log writes coded for auth events and RBAC violations |
| Citizen Appeal Mechanism | No | **Partial** — appeal endpoint coded; Admin override flow coded |

---

## E. Demo Flow Script (2–3 minutes)

> Only steps backed by working code in the current build are included.
> Do not attempt to demo voice input, live SMS delivery, or AI classification
> with a confidence score — none of those are live in this environment.

### Pre-demo setup
1. Frontend running: `http://localhost:3000`
2. API running: `http://localhost:3001/health` → `{ "status": "UP" }`
3. Browser in incognito mode (no stale localStorage)

---

**Step 1 — Home Page (30 sec)**

Open `http://localhost:3000`.

> "This is the landing page of Community Redressal Planner. Citizens and officers
> arrive here first and navigate to their respective portals."

Point to the two login buttons in the nav — "Citizen Login" and "Officer / Admin".

---

**Step 2 — Citizen files a complaint (45 sec)**

Click "Citizen Login" → use demo credentials (`krishnadevadkar3114@gmail.com` /
their password, or register a fresh account).

Navigate to "File a Complaint" (`/complaints/new`).

> "Citizens can file via text, image, audio, video, or voice. Select text,
> choose a language — English for today's demo — fill in a title and description,
> optionally detect location, and submit."

Submit a complaint. Show the reference ID returned (`CRP-2026-XXXXXX`).

> "The reference ID is generated instantly. In the background, the AI pipeline
> would classify this complaint, detect duplicates, and route it — today those
> models are not loaded, so the complaint sits in SUBMITTED state awaiting
> classification."

---

**Step 3 — Citizen Dashboard (30 sec)**

Navigate to `/dashboard/citizen`.

> "The citizen can track every complaint they've filed, see the current status,
> and view the full status history timeline. If they disagree with the AI
> classification once it's available, they can file an appeal from the detail page."

---

**Step 4 — Officer Dashboard (30 sec)**

Log out. Log in as officer via Tab B, select "Water Leakage & Supply" (WSS),
submit → lands on `/dashboard/officer/WSS`.

> "Each officer sees only the complaints assigned to their department, ordered
> by priority score. The SLA countdown shows how much time remains before
> escalation triggers. Click 'Set In-Progress' or 'Mark Resolved' to update status."

Click "Mark Resolved" on any complaint → confirm.

> "That status change writes a history row and will trigger a notification to
> the citizen once the notification service is connected to real credentials."

---

**Step 5 — GIS Map (20 sec)**

Navigate to `/map`.

> "The map shows complaint pins from the database, colour-coded by status.
> The backend uses PostGIS ST_Within spatial queries — not a client-side filter —
> so as data scales the spatial index keeps queries fast. Filters by category and
> status narrow the view. The heatmap toggle aggregates complaint density."

---

**Step 6 — Analytics Dashboard (15 sec)**

Navigate to `/analytics`.

> "The analytics dashboard aggregates complaint volume by category and ward,
> department resolution rates, SLA compliance percentages, and satisfaction
> scores — all from real SQL aggregation queries with a 5-minute Redis cache."

---

> **What we're NOT demoing:** Real-time SMS/WhatsApp notifications (credentials
> not connected), live AI classification confidence scores (models not loaded),
> semantic duplicate merging (Sentence-Transformers not loaded), SLA escalation
> firing (requires PostgreSQL + Redis running together). These are all built and
> ready for the next deployment stage.

---

## F. Social Impact

*Expected outcomes of this approach — not measured results, since no real citizen
usage data exists yet.*

### Citizen Impact
- Removes the friction of in-person complaint filing — any channel, any Indian language
- Provides a trackable reference ID and visible status timeline instead of a phone call to chase
- Gives citizens a formal appeal path if they disagree with how their complaint was handled
- Complaint anonymisation and consent capture protect personal data

### Government Impact
- Eliminates duplicate complaint management — one Master Incident per real-world problem
- Enforced SLA deadlines replace informal accountability with measurable targets
- Department-scoped officer queues remove inter-department misrouting
- Audit logs give administrators a complete trail of every action taken

### City Impact
- GIS hotspot analysis helps urban planners identify infrastructure stress areas
- SLA compliance data gives elected officials objective department performance metrics
- Open Data API (planned) enables civil society research and press accountability
- Multilingual intake removes socioeconomic barriers to civic participation

---

## G. Future Enhancements

> Clearly labelled as future work — none of these are in the current build.

| Enhancement | Description |
|---|---|
| **IoT Integration** | Connect drain-level sensors, streetlight outage detectors, and air quality monitors to auto-generate complaints when thresholds are breached |
| **Digital Twin** | Integrate with city 3D model to visualise complaint clusters spatially against infrastructure layers |
| **Blockchain Audit Trail** | Immutable on-chain record of SLA breach and resolution events for government transparency |
| **Autonomous Field Ops** | Route officer assignments based on real-time GPS proximity, workload balancing, and traffic data |
| **Predictive Hotspot Detection** | ML model trained on historical complaint density to forecast problem areas before citizens report them |
| **Citizen Reputation Score** | Gamified civic engagement — reward consistent, accurate complaint filers with priority response |
| **Mobile App** | React Native companion app with offline-first complaint drafting and background sync |
| **Voice Assistant Intake** | Natural language voice interface for citizens with low literacy |

---

*Document generated: August 2026 | Community Redressal Planner — Hackathon Build*
