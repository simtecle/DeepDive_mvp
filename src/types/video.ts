export type Video = {
  id: string;

  // Core display fields
  title: string;
  video_url: string;
  source_channel: string | null;
  language: string | null;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Unknown' | string | null;
  duration_min: number | null;

  // Enrichment from YouTube API (Phase 2.2)
  yt_video_id?: string | null;
  description?: string | null;
  view_count?: string | null;
  like_count?: string | null;
  comment_count?: string | null;

  // AI classification audit (Phase 2.3)
  difficulty_score_1to5?: number | null;
  confidence?: number | null;
  notes?: string | null;

  // Topic metadata
  topic_id?: string | null;
  topic_name: string | null;
  subtopic_id?: string | null;
  subtopic_name: string | null;

  // Tagging / prerequisites (MVP uses tags_text; keep others for Phase 2)
  tags_text: string | null;
  prerequisites_text?: string | null;
  // Keep array forms for future use (Supabase can store text[])
  tags?: string[] | null;
  prerequisites?: string[] | null;

  // Status / lifecycle
  status: 'queued' | 'published' | 'rejected' | 'failed' | 'archived' | string | null;
  is_active: boolean;
  playlist_candidate?: boolean | null;

  // Timestamps
  created_at: string;
  published_at?: string | null;
};