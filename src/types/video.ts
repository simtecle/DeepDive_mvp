export type Video = {
  id: string;
  title: string;
  video_url: string;
  source_channel: string | null;
  language: string | null;
  level: string | null;
  duration_min: number | null;
  topic_name: string | null;
  subtopic_name: string | null;
  tags_text: string | null;
  status: string | null;
  is_active: boolean;
  created_at: string;
};