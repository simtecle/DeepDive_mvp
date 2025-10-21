# DeepDive MVP — Learning Paths from YouTube

Purpose: Curate high‑quality YouTube videos into clear learning paths with levels (Beginner, Intermediate, Advanced). Output: a public dataset and simple UI later.

## Scope (Day 1)
- Define topics and levels
- Create a spreadsheet schema (Google Sheets)
- Set up a GitHub repository with this README and a `/data` folder

## Data Model (v0)
CSV columns (one row per resource):
- `topic_id`: Short code, e.g., `PRG` for Programming
- `topic_name`: Human name, e.g., Programmierung
- `level`: One of `Beginner|Intermediate|Advanced`
- `subtopic_id`: Unique code for subtopic, e.g., `PRG-Java-01`
- `subtopic_name`: Human name, e.g., Java Grundlagen
- `content_type`: `video|article|playlist`
- `title`: Title of the resource
- `source_channel`: YouTube channel or author
- `video_url`: Full URL
- `language`: `en|de|...` or `de/en` if bilingual
- `duration_min`: Integer minutes
- `difficulty_score_1to5`: Rough rating of how hard it feels
- `prerequisites`: Comma‑separated list or short text
- `tags`: Comma‑separated keywords
- `notes`: Short curator notes
- `status`: `queued|approved|rejected`
- `playlist_candidate`: `Y|N`

A starter CSV lives at `/data/topics.csv` in this repo.

## How to Use
1. Maintain the master list in Google Sheets using the same headers as above.
2. Export as CSV and place it at `data/topics.csv` for versioning.
3. Open a Pull Request for any edits. Keep changes atomic and well described.

## Conventions
- Topic IDs are 3–4 uppercase letters. Subtopics use `TOPIC-Name-XX`.
- Keep titles as shown on YouTube. Avoid emojis.
- Language codes: ISO‑like short codes (`en`, `de`, `fr`). For mixed, use `de/en`.
- Status changes require a short reason in `notes`.

## Roadmap (high level)
- v0: Public CSV + README
- v0.1: Simple static site that reads `data/topics.csv`
- v0.2: Filters for language and level
- v0.3: Basic learning paths (3 starter videos → mid → deep dive)

## License
MIT. See `LICENSE` later.
