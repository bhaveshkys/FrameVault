'use client';

import React from 'react';
import { Reference, FigmaSyncStatus } from '@/lib/types';
import { Heart, ExternalLink, Sparkles, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { getDomainFromUrl, formatTimeAgo } from '@/lib/utils';

interface ReferenceCardProps {
  reference: Reference;
  onSelect: (ref: Reference) => void;
  onToggleFavorite: (id: string, current: boolean, e: React.MouseEvent) => void;
}

export function ReferenceCard({ reference, onSelect, onToggleFavorite }: ReferenceCardProps) {
  // Compute aggregated Figma sync status
  const syncRecords = reference.figma_sync || [];
  let overallSyncStatus: FigmaSyncStatus = 'pending';

  if (syncRecords.length > 0) {
    if (syncRecords.some((s) => s.status === 'failed')) {
      overallSyncStatus = 'failed';
    } else if (syncRecords.every((s) => s.status === 'synced')) {
      overallSyncStatus = 'synced';
    } else {
      overallSyncStatus = 'pending';
    }
  }

  const domain = getDomainFromUrl(reference.source_url);

  return (
    <div
      onClick={() => onSelect(reference)}
      className="group relative cursor-pointer break-inside-avoid rounded-xl overflow-hidden bg-surface-card border border-border hover:border-border-hover transition-all duration-300 hover:shadow-card mb-5 flex flex-col"
    >
      {/* Screenshot Frame Container */}
      <div className="relative w-full overflow-hidden bg-zinc-950">
        <img
          src={reference.image_path}
          alt={reference.title}
          loading="lazy"
          className="w-full h-auto object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
        />

        {/* Subtle dark gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />

        {/* Top Floating Controls */}
        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none z-10">
          {/* Figma Sync Indicator Pill */}
          <div
            className={`pointer-events-auto flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium backdrop-blur-md border ${
              overallSyncStatus === 'synced'
                ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                : overallSyncStatus === 'failed'
                ? 'bg-rose-950/70 border-rose-500/40 text-rose-300'
                : 'bg-amber-950/70 border-amber-500/40 text-amber-300'
            }`}
            title={`Figma status: ${overallSyncStatus}`}
          >
            {overallSyncStatus === 'synced' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
            {overallSyncStatus === 'failed' && <AlertCircle className="w-3 h-3 text-rose-400" />}
            {overallSyncStatus === 'pending' && <Clock className="w-3 h-3 text-amber-400" />}
            <span className="capitalize">{overallSyncStatus}</span>
          </div>

          {/* Favorite Toggle Button */}
          <button
            onClick={(e) => onToggleFavorite(reference.id, reference.is_favorite, e)}
            className={`pointer-events-auto p-1.5 rounded-full backdrop-blur-md transition-all ${
              reference.is_favorite
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                : 'bg-black/50 text-zinc-400 hover:text-rose-400 border border-white/10 opacity-0 group-hover:opacity-100'
            }`}
            title={reference.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart
              className={`w-3.5 h-3.5 ${
                reference.is_favorite ? 'fill-rose-500 text-rose-500' : ''
              }`}
            />
          </button>
        </div>

        {/* Bottom hover bar inside image */}
        {domain && (
          <div className="absolute bottom-2.5 left-2.5 pointer-events-none z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] bg-black/75 border border-white/10 text-zinc-300 backdrop-blur-md">
              <ExternalLink className="w-2.5 h-2.5 text-zinc-400" />
              {domain}
            </span>
          </div>
        )}
      </div>

      {/* Card Content & Metadata */}
      <div className="p-3.5 flex flex-col gap-2.5 flex-1">
        {/* Title */}
        <h3 className="text-xs font-medium text-zinc-200 line-clamp-2 leading-relaxed tracking-tight group-hover:text-zinc-100">
          {reference.title}
        </h3>

        {/* Categories */}
        <div className="flex flex-wrap items-center gap-1">
          {reference.categories.slice(0, 3).map((cat) => (
            <span
              key={cat.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-surface text-zinc-300 border border-border"
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: cat.color || '#6366f1' }}
              />
              <span className="truncate max-w-[120px]">{cat.name}</span>
            </span>
          ))}
          {reference.categories.length > 3 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-zinc-500 bg-surface">
              +{reference.categories.length - 3}
            </span>
          )}
        </div>

        {/* Notes preview if available */}
        {reference.notes && (
          <p className="text-[11px] text-zinc-500 line-clamp-2 font-normal leading-normal italic">
            "{reference.notes}"
          </p>
        )}

        {/* Footer info: time ago */}
        <div className="mt-auto pt-2 border-t border-border-subtle flex items-center justify-between text-[10px] text-zinc-500">
          <span>{formatTimeAgo(reference.created_at)}</span>
          <span className="group-hover:text-indigo-400 transition-colors">Inspect →</span>
        </div>
      </div>
    </div>
  );
}
