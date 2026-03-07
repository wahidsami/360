<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1-00iQbPV4HfWebuD4HOWSFMvRVEsY0xC

### Local Development with Docker

You can run the entire backend stack (API, Postgres, MinIO) using Docker Compose.

### Prerequisites
- Docker and Docker Compose installed.

### Quick Start
1. **Start the stack**:
   ```bash
   npm run stack:up
   ```
2. **Apply migrations & seed**:
   ```bash
   cd arena360-api
   npm run db:migrate
   npm run db:seed
   ```

### Monitoring
- **API Health**: `http://localhost:3000/health`
- **MinIO Console**: `http://localhost:9001` (user: `minioadmin` / pass: `minioadmin`)

### stopping
```bash
npm run stack:down
```

### Production Deployment
To run with the production profile (hidden internal ports, restart policies):
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```
> [!IMPORTANT]
> Ensure you have a `.env.prod` with strong credentials and `NODE_ENV=production`.

### Backup & Restore

#### 1. Database (Postgres)
**Backup**:
```bash
docker exec arena360-db pg_dump -U postgres arena360 > arena360_backup.sql
```
**Restore**:
```bash
cat arena360_backup.sql | docker exec -i arena360-db psql -U postgres -d arena360
```

#### 2. File Storage (MinIO)
- Back up the `minio_data` volume regularly.
- Alternatively, use `mc mirror` to sync to another bucket or local directory.

#### 3. Full Stack Volume Backup
- Stop the stack: `npm run stack:down`
- Create tarballs of the named volumes (usually in `/var/lib/docker/volumes/`).

### Log Hygiene
- In `production` mode, the API logs structured status updates to `stdout`.
- Sensitive data (passwords, tokens) is automatically redacted by the `AuditInterceptor`.
- Logs can be viewed via `docker logs arena360-api`.

### Default Credentials
- **MinIO Console**: `minioadmin` / `minioadmin`
- **Database**: `postgres` / `postgres` (internal)
- **API User**: Seeded via `npm run db:seed` (check `prisma/seed.ts` for details).

### Verification Checklist
- [x] `stack:up` starts all 3 services + helper.
- [x] `arena360-api` passes healthcheck (`/health`).
- [x] Database migrations apply successfully inside the container.
- [x] File storage (MinIO) is reachable by the API via service name.
- [x] Audit logs are persisted correctly.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
