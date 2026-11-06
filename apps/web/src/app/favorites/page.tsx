'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { ReferenceCard } from '@/components/ReferenceCard';
import { ImageViewerModal } from '@/components/ImageViewerModal';
import { QuickCaptureModal } from '@/components/QuickCaptureModal';
import { SearchModal } from '@/components/SearchModal';
import { KeyboardShortcutsModal } from '@/components/KeyboardShortcutsModal';
import { Reference, Category } from '@/lib/types';
import { useToast } from '@/components/Toast';
import { Heart, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function FavoritesPage() {
  const { showToast } = useToast();
  const [references, setReferences] = useState<Reference[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedRef, setSelectedRef] = useState<Reference | null>(null);
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [refRes, catRes] = await Promise.all([
        fetch('/api/references?favorite=true'),
        fetch('/api/categories'),
      ]);

      if (refRes.ok) {
        const d = await refRes.json();
        setReferences(d.references || []);
      }
      if (catRes.ok) {
        const d = await catRes.json();
        setCategories(d.categories || []);
      }
    } catch {
      showToast('Failed to load favorites', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleFavorite = async (id: string, current: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/references/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: !current }),
      });
      if (res.ok) {
        setReferences((prev) => prev.filter((r) => r.id !== id));
        showToast('Removed from favorites', 'info');
      }
    } catch {
      showToast('Failed to update favorite', 'error');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar
        onOpenCapture={() => setIsCaptureOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
      />

      <main className="flex-1 max-w-[1720px] w-full mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Heart className="w-4 h-4 fill-rose-500" />
            </div>
            <div>
              <h1 className="text-base font-bold text-zinc-100">Starred Inspiration</h1>
              <p className="text-xs text-zinc-400">
                Your highest-conviction frame references and visual motifs.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-zinc-500">
            {references.length} Favorited {references.length === 1 ? 'Still' : 'Stills'}
          </span>
        </div>

        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center text-zinc-500 space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-rose-400" />
            <p className="text-xs font-medium">Loading favorites...</p>
          </div>
        ) : references.length > 0 ? (
          <div className="masonry-grid">
            {references.map((ref) => (
              <ReferenceCard
                key={ref.id}
                reference={ref}
                onSelect={(selected) => setSelectedRef(selected)}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        ) : (
          <div className="py-24 text-center max-w-sm mx-auto space-y-3">
            <Heart className="w-10 h-10 text-zinc-600 mx-auto" />
            <h3 className="text-sm font-semibold text-zinc-300">No favorited references yet</h3>
            <p className="text-xs text-zinc-500">
              Click the heart icon on any reference in your library to pin it here for quick access.
            </p>
            <Link
              href="/"
              className="inline-block text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              Browse Library →
            </Link>
          </div>
        )}
      </main>

      <QuickCaptureModal
        isOpen={isCaptureOpen}
        onClose={() => setIsCaptureOpen(false)}
        onReferenceCreated={loadData}
        categories={categories}
      />
      <ImageViewerModal
        reference={selectedRef}
        allCategories={categories}
        onClose={() => setSelectedRef(null)}
        onUpdate={(updated) => {
          if (!updated.is_favorite) {
            setReferences((prev) => prev.filter((r) => r.id !== updated.id));
          } else {
            setReferences((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
          }
        }}
        onDelete={(id) => {
          setReferences((prev) => prev.filter((r) => r.id !== id));
        }}
      />
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectReference={(ref) => setSelectedRef(ref)}
      />
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
}
