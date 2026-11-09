# Free deployment guide

```
Browser ──▶ Vercel (Next.js frontend) ──fetch──▶ Render (Express API) ──▶ Neon (PostgreSQL)
                                                        └──────────────▶ Upstash (Redis)
```

| Part     | Host    | Why                                                              |
| -------- | ------- | ---------------------------------------------------------------- |
| Frontend | Vercel  | Native Next.js hosting                                           |
| API      | Render  | Runs `node dist/server.js` exactly like local; free web service  |
| Database | Neon    | Free Postgres that does not expire (Render's free Postgres does) |
| Cache    | Upstash | Free Redis over TLS, works with `ioredis`                        |

Use the **Singapore** region for Render, Neon and Upstash so the three are close to each other.

> Free-tier terms change. Checked November 2026: Render free web services sleep after 15 minutes
> idle and need up to a minute to wake; Neon Free has 100 compute-hours and 1 GB per project and
> suspends after 5 idle minutes; Upstash Free has 500K commands/month.

## 0. Check the production build locally

```bash
cd backend
npm run build        # must finish without errors
npm start            # needs backend/.env and running Postgres/Redis; stop with Ctrl+C
```

If `npm run build` fails, fix that first; Render runs the same command.

## 1. Push the code

```bash
git add .
git commit -m "Add deployment config"
git push
```

## 2. Neon (PostgreSQL)

1. Sign up at https://console.neon.tech and create a project in **AWS Asia Pacific (Singapore)**.
2. Click **Connect**, **turn off "Connection pooling"**, and copy the connection string:
   `postgresql://USER:PASSWORD@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`
3. If it ends with `&channel_binding=require`, delete that part.

Keep this string secret. It is your `DATABASE_URL`.

## 3. Upstash (Redis)

1. Sign up at https://console.upstash.com and create a **Redis** database in **Singapore** on the
   Free plan (TLS is on by default).
2. Open the database, find the **TCP / ioredis** connection string and copy it:
   `rediss://default:PASSWORD@xxxx.upstash.io:6379` (two **s**: `rediss`).
   Do not use the REST URL or REST token. This is your `REDIS_URL`.

## 4. Render (API)

**Option A, Blueprint (uses `render.yaml`):** Render dashboard → **New → Blueprint** → select the
repo → fill in the three secrets below → **Apply**.

**Option B, manual:** **New → Web Service** → select the repo, then set:

| Field             | Value                                                                     |
| ----------------- | ------------------------------------------------------------------------- |
| Root Directory    | `backend`                                                                 |
| Runtime           | Node                                                                      |
| Region            | Singapore                                                                 |
| Instance type     | Free                                                                      |
| Build Command     | `npm install --include=dev && npm run build && npx prisma migrate deploy` |
| Start Command     | `npm start`                                                               |
| Health Check Path | `/ping`                                                                   |

Environment variables (both options):

| Key            | Value                                                         |
| -------------- | ------------------------------------------------------------- |
| `NODE_VERSION` | `22`                                                          |
| `DATABASE_URL` | the Neon string from step 2                                   |
| `REDIS_URL`    | the Upstash `rediss://` string from step 3                    |
| `CORS_ORIGIN`  | your Vercel URL, e.g. `https://your-app.vercel.app` (no path) |

The first deploy takes a few minutes. In the logs you should see
`Applying migration 20261106190000_init`, then `Backend listening` and `Redis connected`.

Test it (Windows: use `curl.exe`):

```bash
curl https://YOUR-SERVICE.onrender.com/ping     # {"status":"ok"}
curl https://YOUR-SERVICE.onrender.com/health   # postgres: up, redis: up
```

## 5. Vercel (frontend)

1. Project → **Settings → General**: **Root Directory** = `frontend`.
2. **Settings → Environment Variables**: add
   `NEXT_PUBLIC_API_URL` = `https://YOUR-SERVICE.onrender.com`
   (no trailing slash, no `/api/v1`) for Production (and Preview if you use it).
3. **Deployments → ⋯ → Redeploy.** `NEXT_PUBLIC_*` values are baked in at build time, so changing
   them has no effect until the next build.

## 6. Keep the API awake (optional but recommended)

A free Render service sleeps after 15 minutes, and the first request then waits up to a minute.
To avoid that, create a free monitor (https://cron-job.org or https://uptimerobot.com) that sends
`GET https://YOUR-SERVICE.onrender.com/ping` every 10 minutes.

Ping `/ping`, **not** `/health`: `/health` queries the database, which would keep Neon awake all
month and use up its free compute hours. A service pinged around the clock uses about 720 of
Render's 750 free hours per month.

## 7. Verify

- Open the Vercel URL: the dashboard loads, and the agents list works.
- Create an agent, then try the same email again: the form shows an error on the Email field.
- Edit and delete an agent, search, filter, and use pagination.
- Render logs show `cache miss`, `cache set` and then `cache hit` when you reload the list.

## Troubleshooting

| Symptom                                              | Cause and fix                                                                                     |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| UI says "Cannot reach the server"                    | `NEXT_PUBLIC_API_URL` is missing/wrong or not redeployed; or Render is waking up (wait ~1 minute) |
| Browser console shows a CORS error                   | `CORS_ORIGIN` on Render must equal the Vercel URL exactly; separate several with commas           |
| Render build: `tsc: not found` / `prisma: not found` | The build command must include `npm install --include=dev`                                        |
| `Invalid environment configuration` on start         | A required variable is missing in Render                                                          |
| `P1000` / `P1001` during migrate                     | Wrong `DATABASE_URL`, or the `channel_binding` option is still in it                              |
| `/health` shows `redis: down`                        | `REDIS_URL` must start with `rediss://`; the API still works without Redis                        |
| Database errors near month end                       | Neon free compute hours used up; they reset monthly                                               |
