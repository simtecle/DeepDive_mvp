# DeepDive Path  Architecture

## Goal
DeepDive Path turns a topic into a curated learning path of YouTube videos split into Beginner / Intermediate / Advanced tracks. It prioritizes relevance and reduces “search noise” by using canonical topic matching and publish-quality gates.

## High-level System
**Frontend**
- Next.js (App Router) UI for search, topic suggestions, and path rendering (snake-track layout).

**Backend**
- Supabase Postgres for storage.
- Next.js API routes for:
  - public read queries (search results)
  - admin pipelines (import, classify, backfill)
  - cron wrappers (scheduled jobs)

**External**
- YouTube Data API for candidate retrieval.
- AI classifier (OpenAI) for topic/level classification and publish gating.

## Core Data Model (conceptual)
- `videos`
  - Stores video metadata and lifecycle state (`queued` → `published` / `rejected`)
  - Key fields: `topic_name` (canonical), `level`, `status`, `is_active`, `duration_min`, `video_url`, `yt_video_id`
- `canonical_topics`
  - Canonical topic registry for exact matching in search UX (prevents “programming” → “java” mixing)
- `topic_requests`
  - User-requested topics and normalized query tracking
- `topic_coverage` (view)
  - Published counts per topic
- `topic_level_coverage` (view)
  - Published counts per topic and level
- `backfill_cooldowns`
  - Cooldown tracking to avoid expensive repeated attempts for sparse levels/topics

## Request → Library Pipeline (end-to-end flow)
1. **User searches**
   - UI resolves the user input to a canonical topic (exact match).
   - If no canonical match, UI shows “Did you mean…” suggestions (no automatic matching).

2. **User requests a topic**
   - Creates/updates an entry in `topic_requests` (normalized).
   - Request becomes eligible for import processing.

3. **Import candidates (YouTube)**
   - Admin pipeline queries YouTube for topic candidates.
   - Applies relevance hardening to avoid “keyword traps” (e.g. unrelated “guides”).
   - Inserts candidates into `videos` as `queued`.

4. **Classify queued**
   - Classifier assigns:
     - canonical `topic_name`
     - `level` (Beginner/Intermediate/Advanced)
     - confidence + notes
   - Publish gate decides:
     - `published` + `is_active = true` for acceptable confidence/quality
     - otherwise `rejected` (or remains non-active) to prevent low-quality results

5. **Search reads**
   - Search queries only **published + active** videos.
   - Matching is **exact** on canonical topic to prevent topic mixing.

## Relevance & Quality Controls
- **Canonical topic matching**: search uses exact topic matching to avoid cross-topic bleed.
- **Import relevance filter**: narrows candidate set before queueing.
- **Publish gate**: requires sufficient classifier confidence and avoids obvious low-signal results.
- **Shorts filtering**: removes `/shorts/` and very short durations.

## Operations & Backpressure
- Cron jobs are split to avoid timeouts and control cost:
  - Import cron runs small and respects queue ceiling.
  - Classification cron processes a limited number of queued items per run.
- Backfill runs with cooldown rules to prevent infinite “advanced level” hunting when the supply is low.

## Deployment
- Vercel hosts the Next.js app and runs scheduled cron routes.
- Supabase hosts Postgres and RLS policies for public read on published content only.
