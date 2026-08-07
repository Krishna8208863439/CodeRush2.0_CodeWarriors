# Hackathon Presentation Deck & Demo Guide — Community Redressal Planner

## 1. Elevator Pitch (30 Seconds)

> "Current civic grievance portals act as static message boxes where complaints get lost, duplicated, or misrouted. **Community Redressal Planner** is an AI-powered Civic Operating System that transforms municipal governance. It ingests complaints across 7 channels in 6 Indian languages, deduplicates identical issues into Master Incidents using Sentence Transformers, predicts resolution priority with XGBoost, routes to departments with 96% accuracy, and enforces accountability through an automated BullMQ SLA escalation engine."

---

## 2. PPT Slide-by-Slide Outline

| Slide | Title | Key Content |
|---|---|---|
| 1 | **Title Slide** | Community Redressal Planner — AI Civic Operating System |
| 2 | **The Core Problem** | Duplicate tickets, manual misrouting, language barriers, & zero SLA accountability |
| 3 | **The Solution** | Multi-channel intake, ML inference pipeline, PostGIS GIS mapping, & SLA escalations |
| 4 | **AI Architecture** | IndicTrans2, DistilBERT classification, spaCy NER, Whisper STT, EasyOCR, YOLOv8, XGBoost |
| 5 | **Duplicate Detection** | Sentence-Transformer cosine similarity grouping complaints into Master Incidents |
| 6 | **GIS & Analytics** | PostGIS spatial queries, density heatmaps, and Redis-cached performance dashboards |
| 7 | **SLA Engine** | Automated Redis job timers with L1 & L2 escalations to Department Heads & Commissioners |
| 8 | **Privacy & Security** | AES-256 field encryption, PII redaction, PII masking, and PostgreSQL audit triggers |
| 9 | **Live Product Demo** | Multi-role live walkthrough (Citizen, Officer, Department Head, Commissioner, Admin) |
| 10| **Impact & Future Roadmap**| Open Data API, predictive hotspot detection, citizen reputation scoring |

---

## 3. 2-Minute Judge Demo Script

1. **Step 1 — Complaint Submission (0:00 - 0:30)**
   - Open `http://localhost:3000/complaints/new`.
   - Select Hindi (`मराठी` or `हिंदी`) language.
   - Enter complaint description: *"रस्त्यावर मोठा खड्डा पडला आहे"*.
   - Click **Submit Complaint**. Highlight the returned reference ID `CRP-2026-000001` generated within 3 seconds.

2. **Step 2 — AI Explainability & Translation (0:30 - 1:00)**
   - Open the submitted complaint detail page `http://localhost:3000/complaints/CRP-2026-000001`.
   - Expand the **AI Reasoning Panel**. Show the automatic translation (*"Large pothole on the road"*), spaCy named entity extraction (`LOCATION: Ward 1`), and DistilBERT confidence score (`94%`).

3. **Step 3 — GIS Mapping & Heatmap (1:00 - 1:30)**
   - Navigate to `http://localhost:3000/map`.
   - Toggle the **Heatmap Layer** and filter by status `SUBMITTED` or `ASSIGNED`. Show PostGIS spatial bounding-box rendering.

4. **Step 4 — SLA Escalation & Role Dashboards (1:30 - 2:00)**
   - Log in as **Officer** (`officer@example.com` / `Password123!`) on `/login`.
   - Show the officer work queue sorted by XGBoost priority score descending with live SLA timers.
   - Navigate to `/analytics` to show live aggregated Recharts bar and pie charts.
