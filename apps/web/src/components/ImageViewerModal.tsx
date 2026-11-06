'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Heart,
  ExternalLink,
  Copy,
  Trash2,
  Edit2,
  Save,
  Check,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Clock,
  Layers,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { Reference, Category } from '@/lib/types';
import { formatDate, getDomainFromUrl } from '@/lib/utils';
import { useToast } from './Toast';

interface ImageViewerModalProps {
  reference: Reference | null;
  allCategories: Category[];
  onClose: () => void;
  onUpdate: (updated: Reference) => void;
  onDelete: (id: string) => void;
}

export function ImageViewerModal({
  reference,
  allCategories,
  onClose,
  onUpdate,
  onDelete,
}: ImageViewerModalProps) {
  const { showToast } = useToast();

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editSourceUrl, setEditSourceUrl] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editCatIds, setEditCatIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isRetryingSync, setIsRetryingSync] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reference) {
      setEditTitle(reference.title);
      setEditSourceUrl(reference.source_url || '');
      setEditNotes(reference.notes || '');
      setEditCatIds(reference.categories.map((c) => c.id));
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setIsEditing(false);
    }
  }, [reference]);

  // Keyboard navigation & zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      } else if (e.key === '+' || e.key === '=') {
        setZoom((z) => Math.min(z + 0.25, 4));
      } else if (e.key === '-') {
        setZoom((z) => Math.max(z - 0.25, 0.5));
      } else if (e.key === '0') {
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, onClose]);

  if (!reference) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleCopyUrl = () => {
    if (reference.source_url) {
      navigator.clipboard.writeText(reference.source_url);
      showToast('Source URL copied to clipboard!', 'info');
    }
  };

  const handleToggleFavorite = async () => {
    try {
      const res = await fetch(`/api/references/${reference.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: !reference.is_favorite }),
      });
      if (res.ok) {
        const data = await res.json();
        onUpdate(data.reference);
        showToast(
          data.reference.is_favorite ? 'Added to favorites' : 'Removed from favorites',
          'success'
        );
      }
    } catch {
      showToast('Failed to update favorite', 'error');
    }
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/references/${reference.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          source_url: editSourceUrl.trim() || null,
          notes: editNotes.trim() || null,
          category_ids: editCatIds,
        }),
      });

      if (!res.ok) throw new Error('Failed to update reference');
      const data = await res.json();
      onUpdate(data.reference);
      setIsEditing(false);
      showToast('Reference updated! Figma sync updated accordingly.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Update failed', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this reference? This action cannot be undone.')) {
      return;
    }
    try {
      const res = await fetch(`/api/references/${reference.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast('Reference deleted.', 'info');
        onDelete(reference.id);
        onClose();
      }
    } catch {
      showToast('Failed to delete reference', 'error');
    }
  };

  const handleRetrySync = async (categoryId: string) => {
    setIsRetryingSync(true);
    try {
      const res = await fetch('/api/figma/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference_id: reference.id, category_id: categoryId }),
      });
      if (res.ok) {
        showToast('Figma sync queued for retry.', 'success');
        // Refresh reference data
        const refRes = await fetch(`/api/references/${reference.id}`);
        if (refRes.ok) {
          const d = await refRes.json();
          onUpdate(d.reference);
        }
      }
    } catch {
      showToast('Failed to retry sync', 'error');
    } finally {
      setIsRetryingSync(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full h-full max-w-[1920px] flex flex-col overflow-hidden">
        {/* Top Control Bar */}
        <div className="h-14 px-6 border-b border-border/80 flex items-center justify-between bg-surface-card/60 backdrop-blur-md z-20">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-zinc-400">
              FRAME ID: <span className="text-zinc-200">{reference.id}</span>
            </span>
            <div className="h-4 w-px bg-border" />
            <span className="text-xs text-zinc-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(reference.created_at)}
            </span>
          </div>

          {/* Center Zoom Controls */}
          <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-1">
            <button
              onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
              className="p-1.5 rounded hover:bg-surface-elevated text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono px-2 text-zinc-300 min-w-[50px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(z + 0.25, 4))}
              className="p-1.5 rounded hover:bg-surface-elevated text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <div className="h-4 w-px bg-border mx-1" />
            <button
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              className="px-2 py-1 text-[11px] font-medium rounded hover:bg-surface-elevated text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Reset Zoom (0)"
            >
              Fit
            </button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded hover:bg-surface-elevated text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Toggle Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Right Action Buttons */}
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
              onClick={onClose}
              className="p-2 rounded-lg bg-surface border border-border text-zinc-400 hover:text-zinc-100 hover:bg-surface-elevated transition-colors"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Body */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left / Center: Interactive High-Res Canvas */}
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className={`flex-1 relative bg-black/60 overflow-hidden flex items-center justify-center p-6 ${
              zoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
            }`}
          >
            <div
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transition: isDragging ? 'none' : 'transform 0.15s ease-out',
              }}
              className="relative max-w-full max-h-full flex items-center justify-center select-none"
            >
              <img
                src={reference.image_path}
                alt={reference.title}
                className="max-w-[85vw] lg:max-w-[65vw] max-h-[82vh] object-contain rounded-lg shadow-2xl pointer-events-none"
              />
            </div>

            {/* Bottom floating hint */}
            {zoom > 1 && (
              <div className="absolute bottom-6 left-6 px-3 py-1.5 rounded-md bg-black/80 border border-white/10 text-[11px] text-zinc-400 backdrop-blur-md">
                Click & drag to pan • Scroll or +/- to zoom
              </div>
            )}
          </div>

          {/* Right Sidebar: Details & Metadata */}
          {!isFullscreen && (
            <div className="w-full lg:w-[420px] bg-surface-card border-t lg:border-t-0 lg:border-l border-border flex flex-col h-[40vh] lg:h-full overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* Title Header with Edit Mode */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider font-mono text-zinc-500">
                      Visual Reference
                    </span>
                    {!isEditing ? (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md bg-surface hover:bg-surface-elevated text-zinc-300 border border-border transition-colors"
                      >
                        <Edit2 className="w-3 h-3 text-zinc-400" />
                        Edit
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsEditing(false)}
                          className="px-2.5 py-1 text-xs rounded-md text-zinc-400 hover:text-zinc-200"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveEdit}
                          disabled={isSaving}
                          className="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md bg-indigo-600 hover:bg-indigo-500 text-white"
                        >
                          <Save className="w-3 h-3" />
                          Save
                        </button>
                      </div>
                    )}
                  </div>

                  {!isEditing ? (
                    <h2 className="text-base font-semibold text-zinc-100 leading-snug">
                      {reference.title}
                    </h2>
                  ) : (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-md bg-surface border border-indigo-500 text-zinc-100 focus:outline-none"
                    />
                  )}
                </div>

                {/* Source Link */}
                <div className="space-y-2">
                  <span className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5" />
                    Source URL
                  </span>
                  {!isEditing ? (
                    reference.source_url ? (
                      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-surface border border-border group">
                        <a
                          href={reference.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline truncate flex-1"
                        >
                          {reference.source_url}
                        </a>
                        <button
                          onClick={handleCopyUrl}
                          className="p-1 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
                          title="Copy Link"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-600 italic">No source URL added</span>
                    )
                  ) : (
                    <input
                      type="url"
                      value={editSourceUrl}
                      onChange={(e) => setEditSourceUrl(e.target.value)}
                      placeholder="https://youtube.com/..."
                      className="w-full px-3 py-2 text-xs rounded-md bg-surface border border-border text-zinc-100"
                    />
                  )}
                </div>

                {/* Categories */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      Categories
                    </span>
                  </div>

                  {!isEditing ? (
                    <div className="flex flex-wrap gap-1.5">
                      {reference.categories.map((cat) => (
                        <span
                          key={cat.id}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-surface border border-border text-zinc-300"
                        >
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: cat.color || '#6366f1' }}
                          />
                          {cat.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-1 rounded-md bg-surface/40 border border-border">
                      {allCategories.map((cat) => {
                        const isSelected = editCatIds.includes(cat.id);
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setEditCatIds((prev) =>
                                isSelected ? prev.filter((id) => id !== cat.id) : [...prev, cat.id]
                              );
                            }}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all ${
                              isSelected
                                ? 'bg-indigo-600 text-white font-medium'
                                : 'bg-surface border border-border text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: cat.color || '#6366f1' }}
                            />
                            {cat.name}
                            {isSelected && <Check className="w-3 h-3" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Editing Notes */}
                <div className="space-y-2">
                  <span className="text-xs font-medium text-zinc-400">Research Notes</span>
                  {!isEditing ? (
                    <div className="p-3.5 rounded-lg bg-surface border border-border">
                      <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
                        {reference.notes || (
                          <span className="text-zinc-600 italic">No notes recorded for this frame.</span>
                        )}
                      </p>
                    </div>
                  ) : (
                    <textarea
                      rows={4}
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Add observations on lighting, pacing, transition, sound sync..."
                      className="w-full px-3 py-2 text-xs rounded-md bg-surface border border-border text-zinc-100 resize-none"
                    />
                  )}
                </div>

                {/* Figma Sync Section Breakdown */}
                <div className="space-y-3 pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-figma" />
                      Figma Board Synchronization
                    </span>
                  </div>

                  <div className="space-y-2">
                    {reference.figma_sync && reference.figma_sync.length > 0 ? (
                      reference.figma_sync.map((sync) => (
                        <div
                          key={sync.id}
                          className="p-3 rounded-lg bg-surface border border-border flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex flex-col gap-0.5 overflow-hidden">
                            <span className="font-medium text-zinc-200 truncate">
                              Section: {sync.category_name || 'Category'}
                            </span>
                            <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                              <span
                                className={`flex items-center gap-1 capitalize font-medium ${
                                  sync.status === 'synced'
                                    ? 'text-emerald-400'
                                    : sync.status === 'failed'
                                    ? 'text-rose-400'
                                    : 'text-amber-400'
                                }`}
                              >
                                {sync.status === 'synced' && <CheckCircle2 className="w-3 h-3" />}
                                {sync.status === 'failed' && <AlertCircle className="w-3 h-3" />}
                                {sync.status === 'pending' && <Clock className="w-3 h-3" />}
                                {sync.status}
                              </span>
                              {sync.figma_node_id && (
                                <span className="font-mono text-zinc-500">
                                  Node: {sync.figma_node_id}
                                </span>
                              )}
                            </div>
                            {sync.last_error && (
                              <p className="text-[10px] text-rose-400 mt-1">{sync.last_error}</p>
                            )}
                          </div>

                          {sync.status === 'failed' && (
                            <button
                              onClick={() => handleRetrySync(sync.category_id)}
                              disabled={isRetryingSync}
                              className="flex items-center gap-1 px-2.5 py-1 text-[11px] rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-colors shrink-0"
                            >
                              <RefreshCw className={`w-3 h-3 ${isRetryingSync ? 'animate-spin' : ''}`} />
                              Retry
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-3 rounded-lg bg-surface border border-border text-xs text-zinc-500">
                        No Figma sync records yet.
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Delete Button */}
                <div className="pt-4 border-t border-border flex items-center justify-between">
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete reference
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

