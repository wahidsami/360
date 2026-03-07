# Super Admin Account

Arena360 seeds a **Super Admin** user so you can log in and manage the system.

## How to create or reset the Super Admin

**Important:** The seed runs against the **API** database. Run it from the **arena360-api** folder (or from the repo root using the script below).

**From the repo root (Arena360):**
```bash
npm run db:seed
```

**From the arena360-api folder:**
```bash
npx prisma db seed
```

This will:

1. Create or update the default org (slug: `default`).
2. Create or update the Super Admin user with the credentials below.
3. Optionally create demo users, clients, and projects if the org is empty.

You can run the seed multiple times: the Super Admin password is reset to the value below each time.

## Default Super Admin credentials

| Field    | Value              |
|----------|--------------------|
| **Email**    | `admin@arena360.local` |
| **Password** | `Arena360Admin!`       |

(Org slug for branding/SSO: `default` — optional on login.)

## Changing the credentials

Edit **prisma/seed.ts** and update the constants at the top:

- `SUPER_ADMIN_EMAIL`
- `SUPER_ADMIN_PASSWORD`

Then run `npx prisma db seed` again. The Super Admin will be updated with the new password.

## Login

1. Open the frontend (e.g. http://localhost:5173).
2. Go to the Login page.
3. Enter the Super Admin email and password.
4. Optionally enter org slug `default` to load org branding (logo, colors).
5. Click **Sign in**.
