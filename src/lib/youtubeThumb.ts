// src/lib/youtubeThumb.ts

export function youTubeIdFromUrl(url: string): string | null {
  if (!url) return null;

  try {
    // Handles: https://youtu.be/<id>, https://www.youtube.com/watch?v=<id>, /embed/<id>, /shorts/<id>
    const u = new URL(url);

    // youtu.be/<id>
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.split('/').filter(Boolean)[0];
      return id || null;
    }

    // youtube.com/watch?v=<id>
    const v = u.searchParams.get('v');
    if (v) return v;

    // youtube.com/embed/<id> or /shorts/<id>
    const parts = u.pathname.split('/').filter(Boolean);
    const embedIndex = parts.indexOf('embed');
    if (embedIndex >= 0 && parts[embedIndex + 1]) return parts[embedIndex + 1];

    const shortsIndex = parts.indexOf('shorts');
    if (shortsIndex >= 0 && parts[shortsIndex + 1]) return parts[shortsIndex + 1];

    return null;
  } catch {
    // If it's not a valid URL, maybe it's already an ID
    // YouTube IDs are typically 11 chars, but don't hard-fail here
    if (url.length >= 8 && !url.includes(' ')) return url;
    return null;
  }
}

export function youtubeThumbnailCandidates(id: string): string[] {
  // Order matters: try best-first, then fallbacks.
  // i.ytimg.com and img.youtube.com both work; keep one domain for caching consistency.
  const base = `https://i.ytimg.com/vi/${id}`;
  return [
    `${base}/maxresdefault.jpg`,
    `${base}/sddefault.jpg`,
    `${base}/hqdefault.jpg`,
    `${base}/mqdefault.jpg`,
    `${base}/default.jpg`,
  ];
}