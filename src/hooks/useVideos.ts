import { useState } from 'react';
import type { Video } from '@/types/video';
import { fetchVideos } from '@/lib/videoService';
import { buildTracksByLevel } from '@/lib/ranking';
import type { TracksByLevel } from '@/lib/ranking';

export function useVideos() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [tracks, setTracks] = useState<TracksByLevel | null>(null);

  async function searchVideos(search: string, language: string, level: string) {
    setLoading(true);
    try {
      console.log('Running query for:', search, language, level);
      const results = await fetchVideos(search, language, level);
      console.log('Returned data:', results);
      setVideos(results);
      setTracks(buildTracksByLevel(results, search));
    } catch (e) {
      console.error('Error loading videos:', e);
      setVideos([]);
      setTracks(null);
    }
    setLoading(false);
  }

  return { videos, tracks, loading, searchVideos };
}