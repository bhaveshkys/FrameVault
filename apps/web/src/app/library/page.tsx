'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { FilterBar } from '@/components/FilterBar';
import { ReferenceCard } from '@/components/ReferenceCard';
import { ImageViewerModal } from '@/components/ImageViewerModal';
import { QuickCaptureModal } from '@/components/QuickCaptureModal';
import { SearchModal } from '@/components/SearchModal';
import { KeyboardShortcutsModal } from '@/components/KeyboardShortcutsModal';
import { Reference, Category } from '@/lib/types';
import { useToast } from '@/components/Toast';
import { Film, Plus, RefreshCw, UploadCloud } from 'lucide-react';
import Link from 'next/link';

export default function LibraryPage() {
  const { showToast } = useToast();

  const [references, setReferences] = useState<Reference[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter state
  const [selectedCatIds, setSelectedCatIds] = useState<string[]>([]);
  const [isFavoriteOnly, setIsFavoriteOnly] = useState(false);
  const [figmaFilter, setFigmaFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  // Modals state
  const [selectedRef, setSelectedRef] = useState<Reference | null>(null);
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Fetch categories
  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch {
      // ignore
    }
  }, []);

  // Fetch references based on active filters
  const loadReferences = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCatIds.length > 0) {
        params.set('categories', selectedCatIds.join(','));
      }
      if (isFavoriteOnly) {
        params.set('favorite', 'true');
      }
      if (figmaFilter !== 'all') {
        params.set('figmaStatus', figmaFilter);
      }
      if (sortBy) {
        params.set('sort', sortBy);
      }

      const res = await fetch(`/api/references?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReferences(data.references || []);
      }
    } catch (err) {
      console.error('Failed to load references', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCatIds, isFavoriteOnly, figmaFilter, sortBy]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadReferences();
  }, [loadReferences]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        setIsCaptureOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggleFavorite = async (id: string, current: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/references/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: !current }),
      });
      if (res.ok) {
        setReferences((prev) =>
          prev.map((r) => (r.id === id ? { ...r, is_favorite: !current } : r))
        );
        showToast(!current ? 'Added to favorites' : 'Removed from favorites', 'success');
      }
    } catch {
      showToast('Failed to update favorite', 'error');
    }
  };

  const handleToggleCategory = (catId: string) => {
    setSelectedCatIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-indigo-500/30">
      <Navbar
        onOpenCapture={() => setIsCaptureOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
      />

      <main className="flex-1 max-w-[1720px] w-full mx-auto px-4 sm:px-6 py-6">
        {/* Filters and Controls */}
        <FilterBar
          categories={categories}
          selectedCatIds={selectedCatIds}
          onToggleCategory={handleToggleCategory}
          onClearCategories={() => setSelectedCatIds([])}
          isFavoriteOnly={isFavoriteOnly}
          onToggleFavoriteOnly={() => setIsFavoriteOnly(!isFavoriteOnly)}
          figmaFilter={figmaFilter}
          onChangeFigmaFilter={setFigmaFilter}
          sortBy={sortBy}
          onChangeSortBy={setSortBy}
          totalCount={references.length}
        />

        {/* References Grid or Loading/Empty States */}
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center text-zinc-500 space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
            <p className="text-xs font-medium">Loading visual reference library...</p>
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
          <div className="py-24 flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-surface border border-border flex items-center justify-center text-zinc-500 shadow-inner">
              <Film className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-zinc-200">No references found</h3>
              <p className="text-xs text-zinc-500">
                {selectedCatIds.length > 0 || isFavoriteOnly || figmaFilter !== 'all'
                  ? 'No references match your current filter selections. Try resetting the filters.'
                  : 'Start building your inspiration bank by capturing screenshots.'}
              </p>
            </div>
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-all shadow-glow"
            >
              <UploadCloud className="w-4 h-4" />
              Go to Quick Capture Station
            </Link>
          </div>
        )}
      </main>

      {/* Modals */}
      <QuickCaptureModal
        isOpen={isCaptureOpen}
        onClose={() => setIsCaptureOpen(false)}
        onReferenceCreated={() => {
          loadReferences();
          loadCategories();
        }}
        categories={categories}
      />

      <ImageViewerModal
        reference={selectedRef}
        allCategories={categories}
        onClose={() => setSelectedRef(null)}
        onUpdate={(updated) => {
          setSelectedRef(updated);
          setReferences((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
          loadCategories();
        }}
        onDelete={(id) => {
          setReferences((prev) => prev.filter((r) => r.id !== id));
          loadCategories();
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
