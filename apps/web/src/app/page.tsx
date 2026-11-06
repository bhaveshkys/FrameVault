'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { SearchModal } from '@/components/SearchModal';
import { KeyboardShortcutsModal } from '@/components/KeyboardShortcutsModal';
import { Category, Reference } from '@/lib/types';
import { useToast } from '@/components/Toast';
import {
  UploadCloud,
  Link as LinkIcon,
  Tag,
  Check,
  AlertCircle,
  Loader2,
  Film,
  Plus,
  ArrowRight,
  Palette,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const COLOR_PRESETS = [
  '#ec4899', '#f43f5e', '#ef4444', '#f97316', '#f59e0b',
  '#eab308', '#84cc16', '#10b981', '#06b6d4', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#78716c'
];

export default function RootCapturePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCatIds, setSelectedCatIds] = useState<string[]>([]);
  const [categorySearch, setCategorySearch] = useState('');

  // Inline category creation state
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(COLOR_PRESETS[10]);
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMeta, setImageMeta] = useState<{ width: number; height: number; size: string } | null>(null);

  const [title, setTitle] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Recent captures feed
  const [recentRefs, setRecentRefs] = useState<Reference[]>([]);

  // Modals for navbar
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [catRes, refRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/references?limit=6'),
      ]);
      if (catRes.ok) {
        const cd = await catRes.json();
        setCategories(cd.categories || []);
      }
      if (refRes.ok) {
        const rd = await refRes.json();
        setRecentRefs((rd.references || []).slice(0, 4));
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleImageBlob = useCallback((file: File | Blob) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Only image files (PNG, JPG, WebP) are supported.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);
      setImageBase64(dataUrl);

      const img = new Image();
      img.onload = () => {
        setImageMeta({
          width: img.naturalWidth,
          height: img.naturalHeight,
          size: `${(file.size / 1024).toFixed(0)} KB`,
        });
      };
      img.src = dataUrl;

      if (!title) {
        const now = new Intl.DateTimeFormat('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date());
        setTitle(`Visual Still — ${now}`);
      }
    };
    reader.readAsDataURL(file);
    setErrorMsg(null);
  }, [title]);

  // Global paste handler
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            handleImageBlob(blob);
            showToast('Pasted screenshot from clipboard!', 'info');
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleImageBlob, showToast]);

  const toggleCategory = (id: string) => {
    setSelectedCatIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCreateInlineCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setIsSavingCategory(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCatName.trim(),
          color: newCatColor,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create category');
      }

      const d = await res.json();
      const createdCat: Category = d.category;

      // Add to categories list
      setCategories((prev) => [...prev, createdCat]);
      // Immediately select it for this reference
      setSelectedCatIds((prev) => [...prev, createdCat.id]);

      showToast(`Category "${createdCat.name}" created and assigned!`, 'success');
      setNewCatName('');
      setIsCreatingCategory(false);
    } catch (err: any) {
      showToast(err.message || 'Error creating category', 'error');
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagePreview) {
      setErrorMsg('Please paste or upload a screenshot first.');
      return;
    }
    if (selectedCatIds.length === 0) {
      setErrorMsg('Please select at least one category.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // 1. Upload screenshot
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: imageBase64,
          filename: `capture-${Date.now()}.png`,
        }),
      });

      if (!uploadRes.ok) throw new Error('Failed to upload image file');
      const uploadData = await uploadRes.json();

      // 2. Create reference
      const refRes = await fetch('/api/references', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || 'Untitled Reference',
          source_url: sourceUrl.trim() || null,
          image_path: uploadData.url,
          notes: notes.trim() || null,
          category_ids: selectedCatIds,
        }),
      });

      if (!refRes.ok) throw new Error('Failed to save reference');

      showToast('Reference captured! Automatically queued for Figma sync.', 'success');

      // Reset capture form for next screenshot
      setImagePreview(null);
      setImageBase64(null);
      setImageMeta(null);
      setTitle('');
      setSourceUrl('');
      setNotes('');
      setSelectedCatIds([]);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Capture failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar
        onOpenCapture={() => {}}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
      />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-border pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-zinc-100">
                Visual Reference Capture Station
              </h1>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                PASTE ACTIVE (⌘V)
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Paste video clippings directly from your clipboard, categorize them, and sync straight into Figma boards.
            </p>
          </div>

          <Link
            href="/library"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-surface border border-border hover:border-zinc-600 text-xs text-zinc-300 hover:text-zinc-100 transition-colors self-start sm:self-auto shrink-0"
          >
            <Film className="w-3.5 h-3.5 text-indigo-400" />
            <span>Browse Library</span>
            <ArrowRight className="w-3 h-3 text-zinc-500" />
          </Link>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Screenshot Drop/Paste Area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-zinc-300">Screenshot Still</span>
              {imageMeta && (
                <span className="font-mono text-zinc-500 text-[11px]">
                  {imageMeta.width}×{imageMeta.height}px • {imageMeta.size}
                </span>
              )}
            </div>

            {imagePreview ? (
              <div className="relative group rounded-xl overflow-hidden border border-border bg-black/70">
                <div className="max-h-[380px] flex items-center justify-center p-3">
                  <img
                    src={imagePreview}
                    alt="Captured still preview"
                    className="max-h-[360px] w-auto object-contain rounded-lg shadow-xl"
                  />
                </div>
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null);
                      setImageBase64(null);
                      setImageMeta(null);
                    }}
                    className="px-3 py-1.5 text-xs rounded-md bg-black/80 hover:bg-rose-950 text-zinc-200 hover:text-rose-300 border border-white/10 backdrop-blur-md transition-colors"
                  >
                    Clear & Replace
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files?.[0]) handleImageBlob(e.dataTransfer.files[0]);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-border hover:border-zinc-500 bg-surface/30 hover:bg-surface/50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleImageBlob(e.target.files[0]);
                  }}
                />
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center text-zinc-400">
                    <UploadCloud className="w-7 h-7 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-200">
                      Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-indigo-300 border border-zinc-700 font-mono text-xs">⌘V</kbd> to paste screenshot
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      or drag & drop screenshot file, or click to browse (PNG, JPG, WebP)
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Title & Source URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Reference Title</label>
              <input
                type="text"
                placeholder="e.g. Dynamic 3D Match Cut — Car Stunt"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-lg bg-surface border border-border text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-zinc-400" />
                Original Source URL
              </label>
              <input
                type="url"
                placeholder="https://youtube.com/watch?v=... or Vimeo, Instagram"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-lg bg-surface border border-border text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Categories Section with Inline Creator */}
          <div className="space-y-3 p-4 rounded-xl bg-surface-card border border-border">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-zinc-400" />
                <span className="font-medium text-zinc-200">Assign Categories</span>
                <span className="text-rose-400">*</span>
                <span className="text-zinc-500 ml-1">({selectedCatIds.length} selected)</span>
              </div>

              {/* Inline Category Creation Toggle */}
              {!isCreatingCategory ? (
                <button
                  type="button"
                  onClick={() => setIsCreatingCategory(true)}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Category</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsCreatingCategory(false)}
                  className="text-xs text-zinc-500 hover:text-zinc-300"
                >
                  Cancel
                </button>
              )}
            </div>

            {/* Inline Category Form */}
            {isCreatingCategory && (
              <div className="p-3.5 rounded-lg bg-surface border border-indigo-500/40 space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-xs text-zinc-300 font-medium">
                  <span>Create Category & Select for Frame</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="text"
                    placeholder="New category name (e.g. Split Screen, Neon Glow...)"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs rounded bg-surface-elevated border border-border text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
                    autoFocus
                  />
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-zinc-500 mr-1">Color:</span>
                    <input
                      type="color"
                      value={newCatColor}
                      onChange={(e) => setNewCatColor(e.target.value)}
                      className="w-7 h-7 rounded border border-border cursor-pointer bg-transparent"
                    />
                    <button
                      type="button"
                      onClick={handleCreateInlineCategory}
                      disabled={isSavingCategory || !newCatName.trim()}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-colors ml-1"
                    >
                      {isSavingCategory ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                      Add & Select
                    </button>
                  </div>
                </div>

                {/* Quick Color Swatches */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-zinc-500">Presets:</span>
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewCatColor(c)}
                      className={`w-4 h-4 rounded-full border transition-transform ${
                        newCatColor === c ? 'scale-125 border-white' : 'border-transparent hover:scale-110'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Filter / Search Bar */}
            <input
              type="text"
              placeholder="Search or filter categories..."
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-md bg-surface border border-border text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
            />

            {/* Categories Pills Grid */}
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-1 rounded-md bg-surface/40 border border-border/50">
              {filteredCategories.map((cat) => {
                const isSelected = selectedCatIds.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white font-medium shadow-sm'
                        : 'bg-surface border border-border text-zinc-300 hover:border-zinc-600'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color || '#6366f1' }}
                    />
                    <span>{cat.name}</span>
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">
              Editing Notes & Inspiration Context
            </label>
            <textarea
              rows={3}
              placeholder="Explain why this frame reference is useful: color palette, lens choice, typography placement, speed ramps, sound design pairing..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-lg bg-surface border border-border text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Save Button */}
          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs text-zinc-500">
              Will automatically queue this reference to Figma category sections
            </span>
            <button
              type="submit"
              disabled={isSubmitting || !imagePreview || selectedCatIds.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-glow transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save to FrameVault</span>
              )}
            </button>
          </div>
        </form>

        {/* Recent Captures Feed */}
        {recentRefs.length > 0 && (
          <div className="mt-14 pt-8 border-t border-border space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-200">Recent Captures</h2>
              <Link href="/library" className="text-xs text-indigo-400 hover:underline">
                View All Library References →
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {recentRefs.map((r) => (
                <Link
                  key={r.id}
                  href={`/references/${r.id}`}
                  className="group rounded-lg overflow-hidden bg-surface-card border border-border hover:border-zinc-600 transition-all block"
                >
                  <div className="relative aspect-video bg-black/50 overflow-hidden">
                    <img
                      src={r.image_path}
                      alt={r.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-2.5">
                    <h3 className="text-[11px] font-medium text-zinc-200 truncate group-hover:text-indigo-300">
                      {r.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

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
