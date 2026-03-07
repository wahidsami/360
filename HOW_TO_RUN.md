# Arena360 — Setup Guide

## Prerequisites
- **Node.js** v18+ → https://nodejs.org
- **PostgreSQL** 15+ → https://www.postgresql.org/download/
- **pgAdmin** (recommended) → https://www.pgadmin.org/

---

## Step 1 — Create the Database

Open **pgAdmin** or **psql** and run:
```sql
CREATE DATABASE arena360;
```

Default credentials expected (edit `arena360-api/.env` if yours differ):
- **User:** `postgres`
- **Password:** `postgres`
- **Port:** `5432`

To change them, open `arena360-api/.env` and update line 1:
```
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/arena360?schema=public"
```

---

## Step 2 — Apply Database Schema

Open a terminal inside the `arena360-api/` folder and run:
```bash
npx prisma db push
npx prisma generate
```

> ⚠️ **Must do this even if node_modules is present.** Prisma generates OS-specific binaries — if you're on a different OS (Mac/Linux) from the original dev machine (Windows), `prisma generate` is required.

---

## Step 3 — Start the Backend

In the `arena360-api/` folder:
```bash
npm run start:dev
```

Backend runs on → **http://localhost:3000**

---

## Step 4 — Start the Frontend

In the `Arena360/` root folder (a new terminal):
```bash
npm run dev
```

Frontend runs on → **http://localhost:5173**

---

## Step 5 — Open in Browser

```
http://localhost:5173
```

---

## Notes

| Feature | Status |
|---|---|
| Auth / Login | ✅ Works |
| Database | ✅ Requires PostgreSQL setup above |
| File Uploads | ⚠️ Requires MinIO running locally (optional) |
| Email | ✅ Mocked — no email config needed |

---

## Quick Start (all steps combined)

```bash
# 1. Create DB in pgAdmin: CREATE DATABASE arena360;

# 2. Setup backend
cd arena360-api
npx prisma db push
npx prisma generate
npm run start:dev

# 3. In a new terminal — start frontend
cd ..
npm run dev

# 4. Open http://localhost:5173
```
