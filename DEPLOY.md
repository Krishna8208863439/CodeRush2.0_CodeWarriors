# Deployment Guide — Community Redressal Planner

## Stack Deployment Map

| Service | Platform | URL |
|---|---|---|
| Next.js Frontend | **Vercel** | Auto-assigned `*.vercel.app` |
| Node.js API | **Railway** | Auto-assigned `*.railway.app` |
| Python AI Service | **PythonAnywhere** | `krishnaCodeWarriors.pythonanywhere.com` |
| PostgreSQL + PostGIS | **Supabase** (free) or Railway Postgres | Connection string |
| Redis | **Upstash** (free serverless Redis) | Connection string |

---

## Step 1 — Deploy AI Service on PythonAnywhere

PythonAnywhere supports Python/WSGI apps. The FastAPI AI service deploys here.

### On PythonAnywhere Dashboard:

1. Open a **Bash console** and run:
```bash
cd ~
git clone https://github.com/Krishna8208863439/CodeRush2.0_CodeWarriors.git community-redressal-planner
cd community-redressal-planner/ai-service
pip3 install --user -r requirements.txt
```

2. Go to **Web** tab → **Add a new web app**
   - Choose **Manual configuration**
   - Choose **Python 3.11**

3. Set **Source code**: `/home/krishnaCodeWarriors/community-redressal-planner/ai-service`

4. Set **WSGI configuration file** to point to:
   `/home/krishnaCodeWarriors/community-redressal-planner/ai-service/wsgi.py`

5. Click **Reload** — your AI service will be live at:
   `https://krishnaCodeWarriors.pythonanywhere.com/ai/health`

### Test it:
```
https://krishnaCodeWarriors.pythonanywhere.com/ai/health
```
Should return: `{"status": "UP", "service": "AI Inference Service v2", ...}`

---

## Step 2 — Deploy Node.js API on Railway

Railway supports Node.js natively and provides free PostgreSQL with PostGIS.

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Select `Krishna8208863439/CodeRush2.0_CodeWarriors`
3. Set **Root Directory**: `api`
4. Railway auto-detects Node.js and runs `npm run build && npm run start`

### Add a PostgreSQL database:
- In Railway project: **+ New** → **Database** → **PostgreSQL**
- Copy the `DATABASE_URL` from the database service

### Set Environment Variables in Railway:
```
DATABASE_URL=<from Railway PostgreSQL>
REDIS_URL=<from Upstash — see Step 3>
JWT_ACCESS_SECRET=<generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
JWT_REFRESH_SECRET=<generate another>
FIELD_ENCRYPTION_KEY=<generate 64 hex chars>
AI_SERVICE_URL=https://krishnaCodeWarriors.pythonanywhere.com
NODE_ENV=production
PORT=3001
```

### Run migrations after deploy:
In Railway → your API service → **Shell**:
```bash
npm run migrate:up
```

---

## Step 3 — Free Redis on Upstash

1. Go to [upstash.com](https://upstash.com) → **Create Database** → **Redis** → free tier
2. Copy the **UPSTASH_REDIS_REST_URL** or standard Redis URL
3. Add `REDIS_URL=redis://...` to Railway environment variables

---

## Step 4 — Deploy Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project** → Import `Krishna8208863439/CodeRush2.0_CodeWarriors`
2. Set **Root Directory**: `frontend`
3. Framework: **Next.js** (auto-detected)

### Set Environment Variables in Vercel:
```
NEXT_PUBLIC_API_URL=https://<your-railway-api-url>.railway.app
```

4. Click **Deploy** — your frontend will be live at `https://community-redressal-planner.vercel.app`

---

## Step 5 — Wire Everything Together

After all three are deployed, update each service's environment variables:

**Railway API:**
```
AI_SERVICE_URL=https://krishnaCodeWarriors.pythonanywhere.com
```

**Vercel Frontend:**
```
NEXT_PUBLIC_API_URL=https://<your-api>.railway.app
```

**PythonAnywhere AI Service** (if it needs to call back to the API):
Add a `.env` file in `/home/krishnaCodeWarriors/community-redressal-planner/ai-service/`:
```
API_URL=https://<your-api>.railway.app
```

---

## Quick Test After Deployment

```bash
# 1. AI Service health
curl https://krishnaCodeWarriors.pythonanywhere.com/ai/health

# 2. API health
curl https://<your-api>.railway.app/health

# 3. Frontend
open https://community-redressal-planner.vercel.app
```

---

## Local Development (no cloud needed)

```bash
# Start everything locally
npm run dev:api        # API on :3001
npm run dev:frontend   # Frontend on :3000

# Or with Docker:
docker compose up --build
```

### Demo credentials (local dev):
Enter any valid email (e.g. `test@gmail.com`) + any password on the login page.
The app will use demo fallback mode automatically when the backend API isn't reachable.
