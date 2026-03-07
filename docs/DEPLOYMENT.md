# Arena360 – Deploy to VPS (Docker / Coolify)

This project has two parts:

- **Frontend:** Vite + React (build output is static; serve with nginx or Coolify static site).
- **Backend:** NestJS API in `arena360-api/` (Dockerfile present; run with Docker/Coolify).

---

## 1. Database (PostgreSQL)

- The app uses a database named **`arena360`**.
- In pgAdmin (or any client), create a database with name **`arena360`** if it doesn’t exist:
  - pgAdmin: right‑click **Databases** → **Create** → **Database** → name: `arena360`.
- If you have multiple databases with similar names, the one the app connects to is the one in `DATABASE_URL`; the path segment after the port is the database name, e.g.:
  - `postgresql://user:pass@host:5432/arena360` → database name is **arena360**.

---

## 2. Env values that change on VPS

### Backend (`arena360-api/.env`)

| Variable | Local | VPS / Production |
|----------|--------|-------------------|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/arena360?schema=public` | `postgresql://USER:PASSWORD@DB_HOST:5432/arena360?schema=public` (use your PostgreSQL host, user, password; DB name stays **arena360**) |
| `JWT_SECRET` | (any dev value) | Strong random secret (e.g. `openssl rand -hex 64`) |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | `https://your-domain.com` (and add any other frontend origins) |
| `S3_*` | Local MinIO | Your VPS/cloud S3-compatible endpoint and credentials (or same MinIO if you run it on VPS) |
| `RESEND_*` / `OPENAI_*` | Same | Same or leave empty if not used |

Copy `arena360-api/.env.example` to `arena360-api/.env` and fill in the VPS values.

### Frontend (build-time env)

| Variable | Local | VPS / Production |
|----------|--------|-------------------|
| `VITE_API_URL` | `http://localhost:3000` | `https://api.your-domain.com` (or the public URL of your API) |

Set this when building the frontend (e.g. in Coolify build args or a `.env` used at build time). The built app is static; no `.env` is read at runtime.

---

## 3. Pushing to GitHub

Repo: **https://github.com/wahidsami/360**

```bash
cd D:\Waheed\MypProjects\Arena360
git init
git add .
git commit -m "Initial commit: Arena360 app"
git branch -M main
git remote add origin https://github.com/wahidsami/360.git
git push -u origin main
```

Use a personal access token or SSH if prompted for auth.

---

## 4. Deploying with Coolify + Docker

### Backend (NestJS API)

1. In Coolify, create a new **Application** → **Public Repository** (or connect GitHub and select `wahidsami/360`).
2. Set **Build Pack** to **Dockerfile**.
3. Set **Dockerfile path** to: `arena360-api/Dockerfile`.
   - Coolify may need the **root** of the build context to be the repo root; then the Dockerfile path is `arena360-api/Dockerfile`. If Coolify supports a “context” path, set context to repo root.
4. Add **Environment variables** from `arena360-api/.env.example` (and your real values), especially:
   - `DATABASE_URL` (PostgreSQL on VPS; database name **arena360**).
   - `JWT_SECRET`, `ALLOWED_ORIGINS`, and optionally S3, Resend, OpenAI.
5. Expose port **3000** and point your domain (e.g. `api.your-domain.com`) to this service.

If Coolify expects a single Dockerfile at repo root, we can add a root `Dockerfile` that builds/runs `arena360-api` (see below).

### Frontend (static)

1. Build with the production API URL:
   - `VITE_API_URL=https://api.your-domain.com npm run build` (from repo root, or from the folder that has `vite.config.*`).
2. In Coolify, either:
   - Use a **Static Site** and point it to the build output (e.g. `dist`), or
   - Use a **Dockerfile** that runs `npm run build` and serves `dist` with nginx.

### Database

- Ensure PostgreSQL is reachable from the container (same VPS or managed DB).
- Create database **`arena360`** and run migrations:
  - Either run once in a job/container: `cd arena360-api && npx prisma migrate deploy`
  - Or add a migration step in the API Dockerfile/start script (optional).

---

## 5. Optional: root Dockerfile for API-only deploy

If Coolify only picks a Dockerfile at repo root, add a `Dockerfile` at root that delegates to the API:

```dockerfile
# Root Dockerfile – build and run arena360-api
FROM node:22-alpine AS builder
WORKDIR /app
COPY arena360-api/package*.json arena360-api/prisma ./prisma/
COPY arena360-api/package*.json ./
RUN npm install
COPY arena360-api/ .
RUN npx prisma generate && npm run build

FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache curl
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
EXPOSE 3000
CMD ["npm", "run", "start:prod"]
```

Then set **Dockerfile path** to `Dockerfile` and ensure build context is repo root. Environment variables stay the same as above.

---

## 6. Quick checklist

- [ ] Create database **`arena360`** in PostgreSQL (pgAdmin or psql).
- [ ] Push code to **https://github.com/wahidsami/360**.
- [ ] In Coolify: backend app with `arena360-api/Dockerfile` (or root Dockerfile), env from `.env.example`.
- [ ] Set `ALLOWED_ORIGINS` to your frontend URL and `DATABASE_URL` to VPS PostgreSQL.
- [ ] Build frontend with `VITE_API_URL` set to your API URL; deploy as static site or nginx container.
- [ ] Run migrations once: `npx prisma migrate deploy` in `arena360-api` (with production `DATABASE_URL`).
