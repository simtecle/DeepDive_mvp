import { useState } from 'react';
import { Video } from '@/types/video';
import { fetchVideos } from '@/lib/videoService';

export function useVideos() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);

  async function searchVideos(search: string, language: string, level: string) {
    setLoading(true);
    try {
      console.log('Running query for:', search, language, level);
      const results = await fetchVideos(search, language, level);
      console.log('Returned data:', results);
      setVideos(results);
    } catch (e) {
      console.error('Error loading videos:', e);
      setVideos([]);
    }
    setLoading(false);
  }

  return { videos, loading, searchVideos };
}