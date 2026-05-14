# DeepDive Path Operations

## Environments
- **Vercel**: Next.js hosting + scheduled cron jobs
- **Supabase**: Postgres + RLS, table editor, SQL editor
- **External**: YouTube Data API + AI classifier provider

## Cron Jobs (recommended split)
### 1) process-topic-requests (import-only)
Purpose:
- Pulls eligible `topic_requests`, imports new YouTube candidates into `videos` as `queued`.
Safety:
- Runs with backpressure (queue ceiling).
- Keeps `maxTopics` small to avoid timeouts.

Typical behavior:
- If queued_count >= ceiling → skip import.

### 2) classify-queued
Purpose:
- Classifies a capped number of queued videos and publishes only high-confidence matches.

Why separate:
- Prevents long single-job runtimes and avoids Vercel function timeouts.
- Gives predictable cost control.

### 3) backfill-topics
Purpose:
- Identifies topics with low coverage (overall and per-level) and tops them up.
Safety:
- Cooldown table prevents repeated expensive attempts for sparse levels.
- Stops early if little progress is observed.

## Backpressure & Limits
Key knobs (conceptual):
- `REQUEST_QUEUE_CEILING`: prevents unlimited queue growth
- `maxTopics`: limits how many topics are processed per run
- `maxPerQuery`: caps YouTube import size per topic
- `classifyLimit`: caps queued items per run

Recommended operational posture:
- Keep import small and steady.
- Run classify more frequently in small batches.
- Backfill less frequently and with cooldowns.

## How to Verify Jobs Are Running
### Vercel logs
- Vercel → Project → Logs
- Filter by request path:
  - `/api/cron/process-topic-requests`
  - `/api/cron/classify-queued`
  - `/api/cron/backfill-topics`

Expected:
- 200 responses on schedule
- occasional “skipped” responses due to queue ceiling are OK

### Supabase checks
Queued count:
```sql
select count(*)::int as queued_count
from public.videos
where status='queued';
