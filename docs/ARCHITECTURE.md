# System Architecture & Diagrams — Community Redressal Planner

## 1. System Architecture Diagram

```mermaid
graph TD
    Client[Browser / WhatsApp / SMS Client] -->|HTTPS REST / JWT| Frontend[Next.js 14 Frontend]
    Frontend -->|Internal REST| CoreAPI[Node.js / Express Core API]
    CoreAPI -->|PII-Redacted Payloads| AIService[Python / FastAPI AI Service]
    CoreAPI -->|Spatial Queries| PostGIS[(PostgreSQL 16 + PostGIS)]
    CoreAPI -->|Cache & BullMQ Queues| Redis[(Redis 7)]
    CoreAPI -->|S3 Binary Storage| MinIO[(MinIO Object Storage)]

    subgraph AI Service Pipeline
        AIService --> DistilBERT[DistilBERT Classification]
        AIService --> spaCy[spaCy NER Entity Extractor]
        AIService --> STT[Whisper Speech-To-Text]
        AIService --> OCR[EasyOCR Image Text Extractor]
        AIService --> YOLO[YOLOv8 Object Detection]
        AIService --> XGBoost[XGBoost Priority Scorer]
        AIService --> CosineSim[Sentence-Transformers Deduplication]
    end

    subgraph SLA & Escalation Engine
        Redis -->|BullMQ Worker| SLAWorker[SLA Escalation Worker]
        SLAWorker -->|Level 1 Escalation| DeptHeadNotif[Dept Head Notification]
        SLAWorker -->|Level 2 Escalation| CommNotif[Commissioner Notification]
    end
```

---

## 2. Complaint Intake & AI Understanding Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Citizen
    participant Frontend as Next.js UI
    participant CoreAPI as Express API
    participant DB as PostGIS DB
    participant AI as FastAPI AI Service

    Citizen->>Frontend: Submit complaint (text / voice / image / video)
    Frontend->>CoreAPI: POST /complaints (with JWT token)
    CoreAPI->>DB: INSERT INTO consent_records
    CoreAPI->>DB: INSERT INTO complaints (status='SUBMITTED')
    CoreAPI->>AI: POST /ai/translate (if non-EN)
    AI-->>CoreAPI: Translated text + language
    CoreAPI->>DB: INSERT INTO translation_logs
    CoreAPI->>AI: POST /ai/analyse (PII redacted)
    AI-->>CoreAPI: Category, Confidence, Priority, Reasoning JSONB
    alt Confidence >= 80%
        CoreAPI->>DB: UPDATE complaints (status='ASSIGNED', category, priority)
    else Confidence < 80%
        CoreAPI->>DB: UPDATE complaints (status='MANUAL_REVIEW')
    end
    CoreAPI-->>Frontend: Return Reference ID (CRP-2026-XXXXXX)
    Frontend-->>Citizen: Display Confirmation & Progress Tracker
```

---

## 3. Database Entity Relationship (ER) Diagram

```mermaid
erDiagram
    users ||--o{ citizens : owns
    users ||--o{ refresh_tokens : has
    users ||--o{ password_reset_tokens : has
    users ||--o{ complaints : submits
    users ||--o{ status_history : records
    departments ||--o{ officers : employs
    departments ||--o{ complaints : handles
    wards ||--o{ complaints : located_in
    complaints ||--o{ gis_locations : has_point
    complaints ||--o{ complaint_images : attachment
    complaints ||--o{ complaint_audio : attachment
    complaints ||--o{ complaint_video : attachment
    complaints ||--o{ evidence : attachment
    complaints ||--o{ ai_predictions : predicted_by
    complaints ||--o{ translation_logs : translated_by
    complaints ||--o{ duplicate_groups : master_or_dup
    complaints ||--o{ appeals : appealed_by
    complaints ||--o{ feedback : rated_by
    users ||--o{ notifications : receives
    users ||--o{ audit_logs : triggers
    users ||--o{ consent_records : grants

    users {
        uuid id PK
        string name
        string email UK
        string phone UK
        string password_hash
        string role
        boolean is_verified
        boolean is_locked
    }

    complaints {
        uuid id PK
        string reference_id UK
        uuid citizen_id FK
        string category
        string title
        text description
        string channel
        string language
        string status
        float priority_score
        uuid department_id FK
        uuid officer_id FK
        uuid ward_id FK
        timestamp sla_deadline
        boolean escalated
    }

    ai_predictions {
        uuid id PK
        uuid complaint_id FK
        string model_name
        string category
        float confidence
        float priority_score
        jsonb reasoning
        boolean is_manual_review
    }

    gis_locations {
        uuid id PK
        uuid complaint_id FK
        geometry geom
        float latitude
        float longitude
        string formatted_address
    }
```
