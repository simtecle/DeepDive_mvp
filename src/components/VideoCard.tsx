'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { youTubeIdFromUrl, youtubeThumbnailCandidates } from '@/lib/youtubeThumb';

// Keep this type minimal and compatible with your existing Video shape.
// It only requires the fields used for rendering.
export type VideoCardVideo = {
  title: string;
  video_url: string;
  source_channel?: string | null;
  duration_min?: number | null;
  language?: string | null;
  level?: string | null;
};

export type VideoCardSize = 'snake' | 'grid';

type Props = {
  video: VideoCardVideo;
  size?: VideoCardSize;
  href?: string; // optional override
  priority?: boolean;
  className?: string;
};

function formatDuration(minutes?: number | null): string | null {
  if (minutes == null || Number.isNaN(minutes)) return null;
  const m = Math.max(0, Math.floor(minutes));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h <= 0) return `${m} min`;
  return `${h}h ${mm.toString().padStart(2, '0')}m`;
}

export function VideoCard({ video, size = 'grid', href, priority = false, className }: Props) {
  const youtubeId = useMemo(() => youTubeIdFromUrl(video.video_url), [video.video_url]);

  const candidates = useMemo(() => (youtubeId ? youtubeThumbnailCandidates(youtubeId) : []), [youtubeId]);
  const [thumbIndex, setThumbIndex] = useState(0);

  // Reset fallback cycle when the video changes
  useEffect(() => {
    setThumbIndex(0);
  }, [youtubeId]);

  // Smaller, more premium-feeling cards: avoid giant hero thumbnails.
  // Snake cards are a bit larger than grid, but still restrained.
  const thumbHeightClass = size === 'snake' ? 'h-40 sm:h-44' : 'h-32 sm:h-36';

  const duration = formatDuration(video.duration_min);
  const metaPieces = [video.source_channel ?? null, video.language ?? null, video.level ?? null, duration].filter(
    (x): x is string => Boolean(x && x.trim())
  );

  const cardHref = href ?? video.video_url;

  const thumbUrl = candidates[thumbIndex] ?? null;

  return (
    <article
      className={
        'rounded-2xl border border-neutral-800 bg-neutral-900/40 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] overflow-hidden ' +
        (className ?? '')
      }
    >
      <div className={'relative w-full ' + thumbHeightClass}>
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={video.title}
            loading={priority ? 'eager' : 'lazy'}
            decoding='async'
            referrerPolicy='no-referrer'
            className='absolute inset-0 h-full w-full object-cover'
            onError={() => {
              // Try next candidate. If none left, keep the last (will remain broken) and the user will see the gradient overlay.
              setThumbIndex((prev) => (prev + 1 < candidates.length ? prev + 1 : prev));
            }}
          />
        ) : (
          <div className='h-full w-full bg-neutral-800/60' />
        )}

        {/* subtle overlay for readability */}
        <div className='pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-black/0' />
      </div>

      <div className='p-4'>
        <h3 className='text-sm sm:text-base font-medium text-neutral-100 line-clamp-2'>{video.title}</h3>

        {metaPieces.length > 0 && (
          <p className='mt-2 text-xs text-neutral-400 line-clamp-1'>{metaPieces.join(' • ')}</p>
        )}

        <div className='mt-3'>
          <Link
            href={cardHref}
            target={href ? undefined : '_blank'}
            rel={href ? undefined : 'noreferrer'}
            className='text-sm underline underline-offset-4 text-neutral-200 hover:text-white'
          >
            Watch
          </Link>
        </div>
      </div>
    </article>
  );
}
