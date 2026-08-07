# CodeRush2.0_CodeWarriors — Community Redressal Planner

An AI-powered civic operating system that enables citizens to submit complaints about municipal issues and allows municipal officers, department heads, commissioners, and system administrators to manage, resolve, escalate, and analyse complaints across 12 distinct phases.

## Commit Message Conventions

- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation
- `refactor:` for code improvements
- `chore:` for maintenance tasks

---

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS, Framer Motion, Recharts, Leaflet
- **Core API**: Node.js, Express, TypeScript, Zod, Argon2, JSON Web Tokens, BullMQ, `pg`, `@aws-sdk/client-s3`
- **AI Service**: Python 3.11, FastAPI, IndicTrans2/NLLB, Whisper STT, EasyOCR, spaCy NER, DistilBERT, YOLOv8, XGBoost
- **Database**: PostgreSQL 16 + PostGIS extension
- **Cache & Queue**: Redis 7 + BullMQ
- **Object Storage**: MinIO (S3-compatible)

---

## Architecture Overview

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

---

## Getting Started

### Prerequisites

- Node.js >= 20
- Python >= 3.11
- Docker & Docker Compose

### Quick Start with Docker

```bash
docker compose up --build
```

Services will be accessible at:
- **Frontend**: `http://localhost:3000`
- **Core API**: `http://localhost:3001`
- **AI Service**: `http://localhost:8000`
- **MinIO Console**: `http://localhost:9001`

### Local Development

1. Install root & workspace dependencies:
   ```bash
   npm install
   ```

2. Run database migrations:
   ```bash
   npm run migrate:up
   ```

3. Start services in development mode:
   ```bash
   npm run dev:api
   npm run dev:frontend
   ```

---

## Repository
Remote repository: [https://github.com/Krishna8208863439/CodeRush2.0_CodeWarriors.git](https://github.com/Krishna8208863439/CodeRush2.0_CodeWarriors.git)
