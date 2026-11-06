'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { SearchModal } from '@/components/SearchModal';
import { KeyboardShortcutsModal } from '@/components/KeyboardShortcutsModal';
import { Category, Reference } from '@/lib/types';
import { useToast } from '@/components/Toast';
import {
  UploadCloud,
  Clipboard,
  Link as LinkIcon,
  Tag,
  Check,
  AlertCircle,
  Loader2,
  Film,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function DedicatedCapturePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCatIds, setSelectedCatIds] = useState<string[]>([]);
  const [categorySearch, setCategorySearch] = useState('');

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMeta, setImageMeta] = useState<{ width: number; height: number; size: string } | null>(null);

  const [title, setTitle] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Modals for navbar
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  useEffect(() => {
    async function fetchCats() {
      try {
        const res = await fetch('/api/categories');
        if (res.ok) {
          const d = await res.json();
          setCategories(d.categories || []);
        }
      } catch {}
    }
    fetchCats();
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagePreview) {
      setErrorMsg('Please paste or upload a screenshot.');
      return;
    }
    if (selectedCatIds.length === 0) {
      setErrorMsg('Please select at least one category.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // 1. Upload
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

      if (!refRes.ok) throw new Error('Failed to create reference');
      const refData = await refRes.json();

      showToast('Reference captured successfully! Redirecting to library...', 'success');
      setTimeout(() => {
        router.push('/');
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || 'Capture failed');
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

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8 space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-zinc-100">Quick Capture Station</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
              PASTE READY (⌘V)
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Paste screenshots directly from macOS clipboard or drag & drop video stills.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Screenshot upload zone */}
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
              <div className="relative group rounded-xl overflow-hidden border border-border bg-black/60">
                <div className="max-h-[400px] flex items-center justify-center p-2">
                  <img
                    src={imagePreview}
                    alt="Captured still preview"
                    className="max-h-[380px] w-auto object-contain rounded-lg"
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
                    className="px-3 py-1.5 text-xs rounded-md bg-black/80 hover:bg-rose-950 text-zinc-200 hover:text-rose-300 border border-white/10 backdrop-blur-md"
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
                      or drag & drop screenshot file, or click to browse
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
                placeholder="https://youtube.com/watch?v=... or Vimeo"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-lg bg-surface border border-border text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Categories Selector */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-medium text-zinc-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-zinc-400" />
                Assign Categories <span className="text-rose-400">*</span>
              </label>
              <span className="text-zinc-500">{selectedCatIds.length} selected</span>
            </div>

            <input
              type="text"
              placeholder="Search or filter categories..."
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-surface border border-border text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
            />

            <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-surface/30 border border-border">
              {filteredCategories.map((cat) => {
                const isSelected = selectedCatIds.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white font-medium shadow-sm'
                        : 'bg-surface border border-border text-zinc-300 hover:border-zinc-600'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
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
              rows={4}
              placeholder="Explain why this frame reference is useful: color palette, lens choice, typography placement, speed ramps, sound design pairing..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-lg bg-surface border border-border text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-border flex items-center justify-between">
            <Link
              href="/"
              className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              ← Back to Library
            </Link>
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
