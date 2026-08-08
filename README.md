# CodeRush 2.0 — CodeWarriors | Community Redressal Planner

> **AI-Powered Civic Operating System for Government Governance & Smart Community Redressal**

[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2014-000000?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)
[![Express.js](https://img.shields.io/badge/Backend-Express.js-000000?style=for-the-badge&logo=express)](https://expressjs.com/)
[![FastAPI](https://img.shields.io/badge/AI--Engine-FastAPI-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/ORM-Prisma-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![TailwindCSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38B2AC?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)

---

## 📌 Project Overview

**Community Redressal Planner** is an enterprise-grade, end-to-end civic operating system designed to bridge the gap between citizens and municipal governance. Powered by an intelligent AI classification engine, GIS spatial analytics, and an automated Service Level Agreement (SLA) escalation engine, the platform enables rapid complaint logging, automated department routing, real-time tracking, and data-driven administrative decision making.

---

## ✨ Key Features

### 🏛️ For Citizens
- **Multi-Channel Intake & Express Filing**: Quick complaint reporting with geo-location detection, photo attachments, and category tagging.
- **Real-Time Tracking**: Instant status updates using unique Tracking IDs (`CR-XXXXXX`).
- **OTP & Passwordless Auth**: Instant verification powered by EmailJS OTP services and NextAuth.
- **Interactive GIS Map**: Visual complaint map with status color codes (Open, In Progress, Resolved).

### ⚙️ For Municipal Officers & Administrators
- **AI Priority & Sentiment Engine**: Automated urgency score calculation, duplicate complaint suppression, and smart category routing.
- **Officer Workstation**: Single-pane dashboard to manage assigned complaints, update SLA statuses, and reassign tasks.
- **Admin Analytics Tower**: Comprehensive metrics on resolution rates, department throughput, heatmaps, and breach alerts.
- **Dynamic SLA Matrix**: Automated timers and escalation tracking to maintain high civic resolution standards.

---

## 🏗️ System Architecture

```
                       ┌─────────────────────────┐
                       │     Citizen / Officer   │
                       │    (Web App Interface)  │
                       └────────────┬────────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │     Next.js Frontend    │
                       │   (SSR, React, Map)     │
                       └─────┬─────────────┬─────┘
                             │             │
                    REST API │             │ NextAuth / Prisma
                             ▼             ▼
              ┌────────────────────┐  ┌───────────────────┐
              │ Express Core API   │  │ PostgreSQL DB     │
              │ (Backend Workflows)│  │ (Complaints, Users│
              └─────────┬──────────┘  └───────────────────┘
                        │
             HTTP / REST│ (Urgency & Priority Inference)
                        ▼
              ┌────────────────────┐
              │ Python AI Service  │
              │ (FastAPI & Engine) │
              └────────────────────┘
```

---

## 📁 Repository Structure

```
.
├── frontend/                 # Next.js 14 Client & Fullstack API Routes
│   ├── prisma/               # Prisma Schema & Database Seeds
│   ├── src/
│   │   ├── app/              # App Router (Citizen, Officer, Admin Dashboards)
│   │   ├── components/       # UI Components, GIS Map, Navigation
│   │   └── lib/              # EmailJS, Prisma Client, Auth Utilities
│   └── package.json
│
├── backend-core/             # Express.js REST API & Business Logic
│   ├── src/
│   │   ├── config/           # Database Connection Setup
│   │   ├── db/               # PostgreSQL Schemas & Seed Data
│   │   ├── routes/           # Auth, Complaints, Officer, SLA, Analytics API
│   │   └── services/         # AI Integration Layer
│   └── package.json
│
├── backend-ai/               # Python FastAPI Microservice
│   ├── main.py               # API Endpoints for Priority Scoring & Categorization
│   ├── priority_engine.py    # NLP, Duplicate Detection & Priority Logic
│   └── requirements.txt      # Python Dependencies
│
├── Community_Redressal_Planner_Documentation.pdf  # Detailed System Documentation
├── package.json              # Monorepo Workspace Configuration
└── README.md
```

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Leaflet GIS, Lucide Icons, EmailJS
- **Core Backend**: Node.js, Express.js, PostgreSQL, SQL Schemas
- **AI Microservice**: Python 3.11, FastAPI, Uvicorn, Priority Engine
- **Database & ORM**: PostgreSQL, Prisma ORM
- **Authentication**: NextAuth.js (Credentials & OTP Verification)

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18+ or v20+
- **Python**: 3.9+ or 3.11+
- **PostgreSQL**: Running instance (Local or Remote)

---

### 1️⃣ Clone the Repository & Install Dependencies

```bash
git clone https://github.com/Krishna8208863439/CodeRush2.0_CodeWarriors.git
cd CodeRush2.0_CodeWarriors
npm install
```

---

### 2️⃣ Configure Environment Variables

Create `.env` files in `frontend/`, `backend-core/`, and `backend-ai/` based on their respective configurations:

#### `frontend/.env.local`
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/civic_db?schema=public"
NEXTAUTH_SECRET="super_secret_civic_redressal_key_2026_!"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_BACKEND_URL="http://localhost:5000"
NEXT_PUBLIC_FASTAPI_URL="http://localhost:8000"
```

#### `backend-core/.env`
```env
PORT=5000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/civic_db?schema=public"
FASTAPI_URL=http://localhost:8000
JWT_SECRET="super_secret_civic_redressal_key_2026_!"
```

#### `backend-ai/.env`
```env
PORT=8000
HOST=0.0.0.0
SIMILARITY_THRESHOLD=0.85
GEO_RADIUS_METERS=500.0
```

---

### 3️⃣ Setup Database & Seed Data

```bash
# Generate Prisma Client & Run Seed
npm run seed
```

---

### 4️⃣ Start Development Servers

You can launch services individually or across workspaces:

```bash
# Start Frontend App (Port 3000)
npm run dev:frontend

# Start Express Backend API (Port 5000)
npm run dev:backend

# Start FastAPI AI Engine (Port 8000)
npm run dev:ai
```

Access the Web Portal at **`http://localhost:3000`**.

---

## 📑 Detailed Documentation

For a comprehensive architectural breakdown, database ER diagrams, user personas, and complete API specifications, refer to:
📄 [Community_Redressal_Planner_Documentation.pdf](./Community_Redressal_Planner_Documentation.pdf)

---

## 🤝 Team — CodeWarriors (CodeRush 2.0)

Developed for **CodeRush 2.0**.

- **Repository**: [Krishna8208863439/CodeRush2.0_CodeWarriors](https://github.com/Krishna8208863439/CodeRush2.0_CodeWarriors)
