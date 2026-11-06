'use client';

import React, { useState, useEffect, use } from 'react';
import { Navbar } from '@/components/Navbar';
import { ImageViewerModal } from '@/components/ImageViewerModal';
import { QuickCaptureModal } from '@/components/QuickCaptureModal';
import { SearchModal } from '@/components/SearchModal';
import { KeyboardShortcutsModal } from '@/components/KeyboardShortcutsModal';
import { Reference, Category } from '@/lib/types';
import { useToast } from '@/components/Toast';
import {
  ExternalLink,
  Copy,
  Heart,
  Calendar,
  Layers,
  Sparkles,
  ArrowLeft,
  Trash2,
  Edit2,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/utils';

export default function ReferenceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { showToast } = useToast();

  const [reference, setReference] = useState<Reference | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [refRes, catRes] = await Promise.all([
          fetch(`/api/references/${id}`),
          fetch('/api/categories'),
        ]);

        if (refRes.ok) {
          const rd = await refRes.json();
          setReference(rd.reference);
        } else {
          showToast('Reference not found', 'error');
        }

        if (catRes.ok) {
          const cd = await catRes.json();
          setCategories(cd.categories || []);
        }
      } catch {
        showToast('Failed to load reference', 'error');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [id, showToast]);

  const handleToggleFavorite = async () => {
    if (!reference) return;
    try {
      const res = await fetch(`/api/references/${reference.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: !reference.is_favorite }),
      });
      if (res.ok) {
        const data = await res.json();
        setReference(data.reference);
        showToast(
          data.reference.is_favorite ? 'Added to favorites' : 'Removed from favorites',
          'success'
        );
      }
    } catch {
      showToast('Failed to update favorite', 'error');
    }
  };

  const handleCopyUrl = () => {
    if (reference?.source_url) {
      navigator.clipboard.writeText(reference.source_url);
      showToast('Source link copied to clipboard!', 'info');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this reference?')) return;
    try {
      const res = await fetch(`/api/references/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Reference deleted', 'info');
        router.push('/');
      }
    } catch {
      showToast('Failed to delete reference', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar
          onOpenCapture={() => setIsCaptureOpen(true)}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenShortcuts={() => setIsShortcutsOpen(true)}
        />
        <div className="flex-1 flex items-center justify-center text-xs text-zinc-500">
          Loading reference details...
        </div>
      </div>
    );
  }

  if (!reference) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar
          onOpenCapture={() => setIsCaptureOpen(true)}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenShortcuts={() => setIsShortcutsOpen(true)}
        />
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3">
          <p className="text-zinc-300 font-medium">Reference not found</p>
          <Link href="/" className="text-xs text-indigo-400 hover:underline">
            ← Back to Library
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar
        onOpenCapture={() => setIsCaptureOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Reference Library
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleFavorite}
              className={`p-2 rounded-lg border transition-colors ${
                reference.is_favorite
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  : 'bg-surface border-border text-zinc-400 hover:text-rose-400'
              }`}
              title="Toggle Favorite"
            >
              <Heart
                className={`w-4 h-4 ${reference.is_favorite ? 'fill-rose-500' : ''}`}
              />
            </button>
            <button
              onClick={() => setIsViewerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border hover:bg-surface-elevated text-xs font-medium text-zinc-200 transition-colors"
            >
              Inspect High-Res & Edit
            </button>
            <button
              onClick={handleDelete}
              className="p-2 rounded-lg bg-surface border border-border text-zinc-500 hover:text-rose-400 transition-colors"
              title="Delete reference"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Screenshot Hero */}
        <div
          onClick={() => setIsViewerOpen(true)}
          className="relative group cursor-zoom-in rounded-2xl overflow-hidden border border-border bg-black/80 max-h-[600px] flex items-center justify-center shadow-card"
        >
          <img
            src={reference.image_path}
            alt={reference.title}
            className="max-h-[580px] w-full object-contain"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="px-4 py-2 rounded-lg bg-black/80 border border-white/20 text-xs text-white backdrop-blur-md">
              Click to Zoom & Fullscreen
            </span>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="md:col-span-2 space-y-6">
            <div className="p-6 rounded-xl bg-surface-card border border-border space-y-4">
              <h1 className="text-xl font-bold tracking-tight text-zinc-100 leading-snug">
                {reference.title}
              </h1>

              {/* Categories */}
              <div className="flex flex-wrap gap-2">
                {reference.categories.map((c) => (
                  <span
                    key={c.id}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-surface border border-border text-zinc-300"
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: c.color || '#6366f1' }}
                    />
                    {c.name}
                  </span>
                ))}
              </div>

              {/* Notes */}
              <div className="space-y-2 pt-2 border-t border-border">
                <span className="text-xs font-medium text-zinc-400">Editing Observations</span>
                <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {reference.notes || <span className="italic text-zinc-600">No notes provided.</span>}
                </p>
              </div>
            </div>
          </div>

          {/* Right Meta Column */}
          <div className="space-y-6">
            {/* Source Info */}
            <div className="p-5 rounded-xl bg-surface-card border border-border space-y-3">
              <span className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" />
                Original Source
              </span>
              {reference.source_url ? (
                <div className="space-y-2">
                  <a
                    href={reference.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-indigo-400 hover:underline block break-all font-mono"
                  >
                    {reference.source_url}
                  </a>
                  <button
                    onClick={handleCopyUrl}
                    className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200"
                  >
                    <Copy className="w-3 h-3" />
                    Copy Link
                  </button>
                </div>
              ) : (
                <span className="text-xs text-zinc-600 italic">No source URL saved</span>
              )}

              <div className="pt-3 border-t border-border flex items-center justify-between text-[11px] text-zinc-500">
                <span>Created</span>
                <span className="font-mono">{formatDate(reference.created_at)}</span>
              </div>
            </div>

            {/* Figma Sync Section Details */}
            <div className="p-5 rounded-xl bg-surface-card border border-border space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-figma" />
                <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
                  Figma Canvas Sections
                </h3>
              </div>

              <div className="space-y-2">
                {reference.figma_sync && reference.figma_sync.length > 0 ? (
                  reference.figma_sync.map((sync) => (
                    <div
                      key={sync.id}
                      className="p-3 rounded-lg bg-surface border border-border text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-zinc-200">
                          {sync.category_name || 'Section'}
                        </span>
                        <span
                          className={`capitalize text-[10px] px-2 py-0.5 rounded-full border ${
                            sync.status === 'synced'
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                              : sync.status === 'failed'
                              ? 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                              : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                          }`}
                        >
                          {sync.status}
                        </span>
                      </div>
                      {sync.figma_node_id && (
                        <p className="font-mono text-[10px] text-zinc-500">
                          Node: {sync.figma_node_id}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-zinc-500">No sync record</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <ImageViewerModal
        reference={isViewerOpen ? reference : null}
        allCategories={categories}
        onClose={() => setIsViewerOpen(false)}
        onUpdate={(up) => setReference(up)}
        onDelete={() => router.push('/')}
      />
      <QuickCaptureModal
        isOpen={isCaptureOpen}
        onClose={() => setIsCaptureOpen(false)}
        categories={categories}
      />
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectReference={(ref) => router.push(`/references/${ref.id}`)}
      />
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
}
