# Hosting it publicly, for as little as possible

*The cheapest way to put CYBER FUNK and its cloud saves on the internet: $0 a month at hobby traffic. Prices were checked in November 2026. Free tiers change, so check them again before you deploy. Running the stack locally: [docker.md](docker.md). The server's design: [server.md](../architecture/server.md).*

## What the host has to provide

These facts come from the code. They decide which hosts fit.

- **One container.** The `runtime` target of the [Dockerfile](../../Dockerfile) serves the built game and `/api` together on `$PORT` (default 8080). The client calls `/api` on its own origin (`src/app/save/cloud.ts`), and the CSP allows `'self'` only. Keep the game and the API on one origin. Splitting them across two hosts needs code and CSP changes.
- **Settings come from env** ([server/env.ts](../../server/env.ts)): `DATABASE_URL` (required), `PORT`, `TRUST_PROXY`, `LOG_LEVEL`. The image already sets `STATIC_DIR` and `MIGRATIONS_DIR`.
- **Migrations run at startup** under a Postgres advisory lock ([server/index.ts](../../server/index.ts)). Give the server a **direct** database connection, not a pooled one: PgBouncer in transaction mode breaks the lock.
- **The daily prune** is a `setInterval`, so it only runs while an instance stays up. Skipping it is harmless, because it only removes players who never kept a save.
- **Cold starts are fine.** The game is an offline-first PWA. Cloud sync already treats "no answer" as offline and retries with backoff, so a host that sleeps while idle costs nothing in correctness.

## Recommendation: Neon + Cloud Run ($0/month)

| Piece | Service | Free allowance (Nov 2026) | Why this one |
|---|---|---|---|
| PostgreSQL | **Neon Free** | 1 GB storage per project, 100 CU-hours a month, 5 GB transfer, no card | Idle compute suspends and wakes on the next query. Neon never deletes or pauses the project (Supabase Free pauses after a week without activity). A save is a few KB, so 1 GB holds hundreds of thousands. |
| Game + API | **Google Cloud Run** | 2M requests, 180,000 vCPU-seconds and 360,000 GiB-seconds a month (request-based billing, Tier-1 regions such as `us-central1`) | Runs the existing Dockerfile unchanged and scales to zero. Comes with HTTPS and a `*.run.app` URL, which installing the PWA needs. |
| Image storage | Artifact Registry | 0.5 GB | The runtime image (Alpine plus `dist/`) is well under that. |
| Domain | none (or about $10 a year) | | The `run.app` URL works as is. |

**Expected bill: $0.** Cloud Run needs a billing account with a card on file, so set a **$1 budget alert** to catch a traffic spike before it costs anything real.

## Setup

### 1. Neon

1. Create a project in a region near your Cloud Run region (for example AWS `us-east-1` with `us-central1`).
2. On the dashboard, copy the **direct** connection string (turn *Connection pooling* off). It looks like:
   ```
   postgres://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```
   Keep `?sslmode=require` on the end. `pg` reads it from the URL, so the code needs no change.

### 2. Google Cloud

```bash
gcloud projects create <PROJECT>            # or pick one in the console
gcloud config set project <PROJECT>
# Link a billing account in the console, then Billing → Budgets & alerts → a $1 budget.
gcloud services enable run.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com
gcloud artifacts repositories create cyberfunk --repository-format=docker --location=us-central1
gcloud auth configure-docker us-central1-docker.pkg.dev
```

Store the database URL as a secret (the first 6 secret versions are free) and let Cloud Run read it:

```bash
printf '%s' 'postgres://…?sslmode=require' | gcloud secrets create cyberfunk-db-url --data-file=-
gcloud secrets add-iam-policy-binding cyberfunk-db-url \
  --member="serviceAccount:$(gcloud projects describe <PROJECT> --format='value(projectNumber)')-compute@developer.gserviceaccount.com" \
  --role=roles/secretmanager.secretAccessor
```

### 3. Build and push the image

Cloud Run runs amd64, so on Apple Silicon you build for that platform:

```bash
docker buildx build --platform linux/amd64 --target runtime \
  -t us-central1-docker.pkg.dev/<PROJECT>/cyberfunk/app:latest --push .
```

### 4. Deploy

```bash
gcloud run deploy cyberfunk \
  --image us-central1-docker.pkg.dev/<PROJECT>/cyberfunk/app:latest \
  --region us-central1 --allow-unauthenticated \
  --port 8080 --cpu 1 --memory 512Mi \
  --min-instances 0 --max-instances 2 --concurrency 80 \
  --set-env-vars TRUST_PROXY=true,LOG_LEVEL=info \
  --set-secrets DATABASE_URL=cyberfunk-db-url:latest
```

- `--max-instances 2` caps both the cost and the number of Neon connections. Each instance's pool holds up to 10 (`server/db/client.ts`).
- `TRUST_PROXY=true`: Google's front end sets `X-Forwarded-For`, so the rate limits see the player's real IP.
- Leave `--min-instances 0`. Setting it to 1 keeps an instance warm, but you pay for it.

### 5. Check it works

```bash
curl https://<service>-<hash>.us-central1.run.app/api/health    # {"ok":true,"db":true,…}
```

Then open the URL on a phone, play until it saves, and install it to the home screen. Link a second device with the player code and confirm the save arrives.

### 6. Custom domain (optional)

Use Cloud Run's domain mappings, or put Cloudflare's free proxy in front with a CNAME to the `run.app` host.

### Updating

Rebuild and push the image (step 3), then run the same `gcloud run deploy` (step 4). Pending migrations apply when the new revision starts.

## What "free" costs you

- **Cold starts.** The first request after a quiet spell waits about 1–3 s for Cloud Run, plus up to a few seconds for Neon to wake. The installed PWA opens from its cache straight away. Only the cloud sync waits, and it retries by itself.
- **The daily prune rarely runs.** That's harmless. If you want it, a Cloud Scheduler job (3 jobs are free) or a prune at startup would cover it. Either one is a code or config change for later.
- **Backups.** Neon Free keeps only a short point-in-time restore window. For more safety, take a dump now and then:
  ```bash
  pg_dump 'postgres://…?sslmode=require' > cyberfunk-$(date +%F).sql
  ```

## Fallbacks, cheapest first

1. **Oracle Cloud Always Free VM ($0, always on).** An Ampere ARM VM. Run the existing [compose.yaml](../../compose.yaml) unchanged, with Caddy, the app and Postgres on the box. In `.env`, set `SITE_ADDRESS=<your domain>`, `HTTP_PORT=80`, `HTTPS_PORT=443` and a real `POSTGRES_PASSWORD`, so Caddy gets a Let's Encrypt certificate. There are no cold starts, but you patch the OS and handle backups yourself, Oracle can reclaim idle free VMs, and you need a domain (a free DuckDNS name works).
   To let only people you choose in, add Google sign-in with `compose.auth.yaml` ([docker.md](docker.md#require-google-sign-in)). On Cloud Run, the matching tool is Identity-Aware Proxy, which isn't set up here.
2. **A small VPS such as Hetzner (about €4–5 a month).** The same `compose.yaml` on a reliable 2 GB box with no free-tier caveats. This is the move if you outgrow the free tiers or Oracle gives you trouble.
3. **Render Free with Neon ($0).** It deploys from the Dockerfile, but the service sleeps after 15 minutes idle and takes about a minute to wake. That's worse than Cloud Run at the same price.
4. **Koyeb Free.** One small instance, but it's unclear whether the free tier still exists in late 2026: it's missing from the pricing page since the Mistral acquisition. Skip it until that's settled.

## Sources

- [Neon: free plan limits and quotas](https://neon.com/faqs/free-plan-limits-and-quotas)
- [Google Cloud Run pricing](https://cloud.google.com/run/pricing)
- [Free Docker hosting in 2026, compared (snapdeploy)](https://snapdeploy.dev/blog/free-docker-hosting-2026-platforms-compared)
- [Best free Docker hosting (xcloud)](https://xcloud.host/best-free-docker-hosting/)
