'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  UploadCloud,
  Clipboard,
  Link as LinkIcon,
  Check,
  AlertCircle,
  FileImage,
  Tag,
  Loader2,
} from 'lucide-react';
import { Category } from '@/lib/types';
import { useToast } from './Toast';

interface QuickCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReferenceCreated?: () => void;
  categories: Category[];
}

export function QuickCaptureModal({
  isOpen,
  onClose,
  onReferenceCreated,
  categories,
}: QuickCaptureModalProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageMetadata, setImageMetadata] = useState<{
    width?: number;
    height?: number;
    size?: string;
  } | null>(null);

  const [title, setTitle] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedCatIds, setSelectedCatIds] = useState<string[]>([]);
  const [categorySearch, setCategorySearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Process an image File or Blob
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

      // Extract image dimensions
      const img = new Image();
      img.onload = () => {
        setImageMetadata({
          width: img.naturalWidth,
          height: img.naturalHeight,
          size: `${(file.size / 1024).toFixed(0)} KB`,
        });
      };
      img.src = dataUrl;

      // Auto-populate default title if empty
      if (!title) {
        const timeString = new Intl.DateTimeFormat('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date());
        setTitle(`Visual Still — ${timeString}`);
      }
    };
    reader.readAsDataURL(file);
    setErrorMsg(null);
  }, [title]);

  // Global clipboard paste listener
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            handleImageBlob(blob);
            showToast('Screenshot pasted from clipboard!', 'info');
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, handleImageBlob, showToast]);

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleImageBlob(files[0]);
    }
  };

  const toggleCategory = (id: string) => {
    setSelectedCatIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const resetForm = () => {
    setImagePreview(null);
    setImageBase64(null);
    setImageFile(null);
    setImageMetadata(null);
    setTitle('');
    setSourceUrl('');
    setNotes('');
    setSelectedCatIds([]);
    setCategorySearch('');
    setErrorMsg(null);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagePreview) {
      setErrorMsg('Please capture or paste a screenshot first.');
      return;
    }

    if (selectedCatIds.length === 0) {
      setErrorMsg('Please select at least one category for reference organization.');
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

      if (!uploadRes.ok) {
        const uploadErr = await uploadRes.json();
        throw new Error(uploadErr.error || 'Failed to upload screenshot');
      }

      const uploadData = await uploadRes.json();
      const imagePath = uploadData.url;

      // 2. Create reference
      const refRes = await fetch('/api/references', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || 'Untitled Frame Reference',
          source_url: sourceUrl.trim() || null,
          image_path: imagePath,
          notes: notes.trim() || null,
          category_ids: selectedCatIds,
        }),
      });

      if (!refRes.ok) {
        const refErr = await refRes.json();
        throw new Error(refErr.error || 'Failed to save reference');
      }

      showToast('Reference saved to library! Queued for Figma sync.', 'success');
      onReferenceCreated?.();
      handleClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-3xl bg-surface-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Clipboard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                Quick Capture Reference
                <span className="text-[11px] font-normal text-zinc-400">
                  (Paste anywhere with ⌘V)
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Capture video frames, documentary stills, or motion graphics inspiration
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Screenshot Drop/Paste Area */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-300 flex items-center justify-between">
              <span>Screenshot Still</span>
              {imageMetadata && (
                <span className="text-[11px] text-zinc-500 font-mono">
                  {imageMetadata.width}×{imageMetadata.height}px • {imageMetadata.size}
                </span>
              )}
            </label>

            {imagePreview ? (
              <div className="relative group rounded-lg overflow-hidden border border-border bg-black/40">
                {/* Image preview with max-height to avoid taking over modal */}
                <div className="max-h-[260px] flex items-center justify-center overflow-hidden bg-zinc-950">
                  <img
                    src={imagePreview}
                    alt="Captured frame preview"
                    className="object-contain max-h-[260px] w-full"
                  />
                </div>
                {/* Overlay controls */}
                <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null);
                      setImageBase64(null);
                      setImageMetadata(null);
                    }}
                    className="px-2.5 py-1 text-xs rounded-md bg-black/75 hover:bg-rose-950/80 text-zinc-200 hover:text-rose-300 border border-white/10 backdrop-blur-sm transition-all"
                  >
                    Replace Image
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-500/5'
                    : 'border-border hover:border-zinc-500 bg-surface/30 hover:bg-surface/60'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImageBlob(f);
                  }}
                />
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-zinc-800/80 border border-zinc-700/80 flex items-center justify-center text-zinc-400">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-200">
                      Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-indigo-300 border border-zinc-700 font-mono text-xs">⌘V</kbd> to paste screenshot
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      or drag & drop here, or click to browse (PNG, JPG, WebP)
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Reference Title & Source URL */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">
                Reference Title <span className="text-zinc-500">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Anamorphic Letterbox Title Card"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-md bg-surface border border-border text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                <LinkIcon className="w-3 h-3 text-zinc-400" />
                <span>Original Source URL</span>
              </label>
              <input
                type="url"
                placeholder="https://youtube.com/watch?v=... or Vimeo, Instagram"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-md bg-surface border border-border text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Categories Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                <Tag className="w-3 h-3 text-zinc-400" />
                <span>Assign Categories</span>
                <span className="text-rose-400">*</span>
              </label>
              <span className="text-[11px] text-zinc-500">
                {selectedCatIds.length} selected
              </span>
            </div>

            {/* Quick search input */}
            <input
              type="text"
              placeholder="Filter categories..."
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-md bg-surface border border-border text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
            />

            {/* Category Pills Grid */}
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 rounded-md bg-surface/30 border border-border/50">
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
                        : 'bg-surface border border-border text-zinc-300 hover:border-zinc-600 hover:text-zinc-100'
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
              Editing Notes / Why this reference is interesting
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Note the tungsten rim light against cold shadows, 2-frame match cut transition, or typographic layout..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-md bg-surface border border-border text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
            />
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-border flex items-center justify-between">
            <span className="text-[11px] text-zinc-500">
              Will automatically queue reference into Figma category sections
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-medium rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-surface transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !imagePreview || selectedCatIds.length === 0}
                className="flex items-center gap-2 px-5 py-2 text-xs font-medium rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-sm transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Reference...</span>
                  </>
                ) : (
                  <span>Save to FrameVault</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

