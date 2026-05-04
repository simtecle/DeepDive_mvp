'use client';

import { useMemo, useState } from 'react';
import { VideoCard, type VideoCardVideo } from '@/components/VideoCard';

type Props = {
  title: string;
  /** Full track list already ranked (best-first). */
  videos: VideoCardVideo[];
  /** How many to show as the snake path (defaults to 4). */
  coreCount?: number;
  /** How many to show in the collapsed grid (defaults to 6). */
  morePreviewCount?: number;
};

function clampNonNeg(n: number, fallback: number) {
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.floor(n));
}

export function SnakeTrack({
  title,
  videos,
  coreCount = 4,
  morePreviewCount = 6,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const coreN = clampNonNeg(coreCount, 4);
  const previewN = clampNonNeg(morePreviewCount, 6);

  const { core, rest } = useMemo(() => {
    const list = Array.isArray(videos) ? videos : [];
    return {
      core: list.slice(0, coreN),
      rest: list.slice(coreN),
    };
  }, [videos, coreN]);

  const restVisible = useMemo(() => {
    if (expanded) return rest;
    return rest.slice(0, previewN);
  }, [rest, expanded, previewN]);

  return (
    <section className="space-y-5">
      <header className="flex items-end justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
          <p className="text-xs text-slate-400">
            {videos.length} video{videos.length === 1 ? '' : 's'} in this track
          </p>
        </div>
      </header>

      {/* Snake path */}
      {core.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
          <p className="text-sm text-slate-300">No videos for this track yet.</p>
        </div>
      ) : (
        <div className="relative rounded-3xl border border-slate-800 bg-slate-950/35 p-5 sm:p-6">
          <div className="space-y-5">
            {core.map((v, i) => {
              const left = i % 2 === 0;

              return (
                <div key={`${v.video_url}-${i}`} className="space-y-3">
                  <div
                    className={[
                      'flex',
                      left ? 'justify-start pr-10 sm:pr-24' : 'justify-end pl-10 sm:pl-24',
                    ].join(' ')}
                  >
                    <div className="relative z-10 w-full max-w-xl">
                      {/* Start Here badge on first step */}
                      {i === 0 && (
                        <div className={left ? 'mb-2 text-left' : 'mb-2 text-right'}>
                          <span className="inline-flex items-center rounded-full border border-sky-700/30 bg-sky-900/20 px-3 py-1 text-xs font-medium text-sky-200">
                            Start Here
                          </span>
                        </div>
                      )}

                      <VideoCard video={v} size="snake" priority={i === 0} />
                    </div>
                  </div>

                  {/* Connector to next step (rendered in its own row so it never crosses thumbnails) */}
                  {i < core.length - 1 && (
                    <div aria-hidden className="relative h-20 sm:h-24">
                      <svg
                        className="absolute inset-0 h-full w-full"
                        viewBox="0 0 200 120"
                        preserveAspectRatio="xMidYMid meet"
                      >
                        <defs>
                          <linearGradient
                            id={`dd-path-${title.replace(/\s+/g, '-').toLowerCase()}-${i}`}
                            x1="0"
                            y1="0"
                            x2="1"
                            y2="0"
                          >
                            <stop offset="0" stopColor="rgba(56,189,248,0.65)" />
                            <stop offset="0.5" stopColor="rgba(125,211,252,0.25)" />
                            <stop offset="1" stopColor="rgba(56,189,248,0.65)" />
                          </linearGradient>

                          <marker
                            id={`dd-arrow-${title.replace(/\s+/g, '-').toLowerCase()}-${i}`}
                            markerWidth="12"
                            markerHeight="12"
                            refX="10"
                            refY="6"
                            orient="auto"
                          >
                            <path d="M0,0 L12,6 L0,12 Z" fill="rgba(56,189,248,0.75)" />
                          </marker>

                          <filter
                            id={`dd-glow-${title.replace(/\s+/g, '-').toLowerCase()}-${i}`}
                            x="-50%"
                            y="-50%"
                            width="200%"
                            height="200%"
                          >
                            <feGaussianBlur stdDeviation="1.4" result="blur" />
                            <feMerge>
                              <feMergeNode in="blur" />
                              <feMergeNode in="SourceGraphic" />
                            </feMerge>
                          </filter>
                        </defs>

                        {(() => {
                          const nextLeft = (i + 1) % 2 === 0;
                          // Use a smooth dashed curve so it reads clearly and doesn't look squished.
                          const x1 = left ? 40 : 160;
                          const y1 = 18;
                          const x2 = nextLeft ? 40 : 160;
                          const y2 = 102;

                          // Control points: bend through the center to make a clear S-curve.
                          const cx1 = left ? 120 : 80;
                          const cy1 = 32;
                          const cx2 = nextLeft ? 80 : 120;
                          const cy2 = 88;

                          const d = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;

                          const gradId = `dd-path-${title.replace(/\s+/g, '-').toLowerCase()}-${i}`;
                          const arrowId = `dd-arrow-${title.replace(/\s+/g, '-').toLowerCase()}-${i}`;
                          const glowId = `dd-glow-${title.replace(/\s+/g, '-').toLowerCase()}-${i}`;

                          return (
                            <>
                              {/* dark outline for contrast */}
                              <path
                                d={d}
                                fill="none"
                                stroke="rgba(15,23,42,0.85)"
                                strokeWidth="6"
                                strokeLinecap="round"
                                vectorEffect="non-scaling-stroke"
                              />

                              {/* main dashed curve */}
                              <path
                                d={d}
                                fill="none"
                                stroke={`url(#${gradId})`}
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeDasharray="8 8"
                                markerEnd={`url(#${arrowId})`}
                                filter={`url(#${glowId})`}
                                vectorEffect="non-scaling-stroke"
                              />
                            </>
                          );
                        })()}
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* More */}
          <div className="mt-8 border-t border-slate-800/70 pt-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-200">More in this track</h3>

              {rest.length > 0 && (
                <button
                  type="button"
                  onClick={() => setExpanded((s) => !s)}
                  className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs text-slate-200 hover:border-slate-700 hover:bg-slate-900/40"
                >
                  {expanded ? 'Show less' : `Show ${Math.min(rest.length, previewN)} more`}
                </button>
              )}
            </div>

            {rest.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">No additional videos yet.</p>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {restVisible.map((v, idx) => (
                  <VideoCard key={`${v.video_url}-${idx}`} video={v} size="grid" />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
