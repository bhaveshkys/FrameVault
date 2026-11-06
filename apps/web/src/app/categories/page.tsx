'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { QuickCaptureModal } from '@/components/QuickCaptureModal';
import { SearchModal } from '@/components/SearchModal';
import { KeyboardShortcutsModal } from '@/components/KeyboardShortcutsModal';
import { Category } from '@/lib/types';
import { useToast } from '@/components/Toast';
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  Sparkles,
  Palette,
  Loader2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const COLOR_PALETTE = [
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#eab308', // Yellow
  '#84cc16', // Lime
  '#10b981', // Emerald
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#0ea5e9', // Sky
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#a855f7', // Purple
  '#78716c', // Stone
];

export default function CategoriesPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // New category creation state
  const [isCreating, setIsCreating] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(COLOR_PALETTE[12]);
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  // Edit category state
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const loadCategories = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const d = await res.json();
        setCategories(d.categories || []);
      }
    } catch {
      showToast('Failed to load categories', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setIsSubmittingNew(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCatName.trim(), color: newCatColor }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create category');
      }

      showToast(`Category "${newCatName}" created!`, 'success');
      setNewCatName('');
      setIsCreating(false);
      loadCategories();
    } catch (err: any) {
      showToast(err.message || 'Error creating category', 'error');
    } finally {
      setIsSubmittingNew(false);
    }
  };

  const handleStartEdit = (cat: Category) => {
    setEditingCatId(cat.id);
    setEditName(cat.name);
    setEditColor(cat.color || COLOR_PALETTE[12]);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return;
    setIsSubmittingEdit(true);
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), color: editColor }),
      });

      if (!res.ok) throw new Error('Failed to update category');
      showToast('Category updated.', 'success');
      setEditingCatId(null);
      loadCategories();
    } catch (err: any) {
      showToast(err.message || 'Update failed', 'error');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (
      !confirm(
        `Are you sure you want to delete the category "${name}"? References will not be deleted, but this tag will be detached.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast(`Category "${name}" removed.`, 'info');
        loadCategories();
      }
    } catch {
      showToast('Failed to delete category', 'error');
    }
  };

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar
        onOpenCapture={() => setIsCaptureOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              Category Management
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Organize video editing references into multi-category sections synchronized to Figma boards.
            </p>
          </div>

          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-sm transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            New Category
          </button>
        </div>

        {/* Create Modal / Inlined Card */}
        {isCreating && (
          <div className="mb-8 p-5 rounded-xl bg-surface-card border border-indigo-500/30 shadow-card animate-in fade-in slide-in-from-top-2">
            <h2 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider mb-3">
              Add New Reference Category
            </h2>
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs text-zinc-400">Category Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Speed Ramps, Match Cuts, Retro CRT..."
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-md bg-surface border border-border text-zinc-100 focus:outline-none focus:border-indigo-500"
                    autoFocus
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400">Section Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={newCatColor}
                      onChange={(e) => setNewCatColor(e.target.value)}
                      className="w-8 h-8 rounded border border-border cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={newCatColor}
                      onChange={(e) => setNewCatColor(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs font-mono rounded-md bg-surface border border-border text-zinc-200"
                    />
                  </div>
                </div>
              </div>

              {/* Color Presets */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-zinc-500 mr-2">Presets:</span>
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewCatColor(c)}
                    className={`w-5 h-5 rounded-full border transition-transform ${
                      newCatColor === c ? 'scale-125 border-white' : 'border-transparent hover:scale-110'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNew || !newCatName.trim()}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-md bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
                >
                  {isSubmittingNew ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Create Category
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search Categories */}
        <div className="mb-6 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
          <input
            type="text"
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-xs rounded-lg bg-surface border border-border text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Categories List */}
        {isLoading ? (
          <div className="py-20 text-center text-xs text-zinc-500">Loading categories...</div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((cat) => {
              const isEditing = editingCatId === cat.id;

              return (
                <div
                  key={cat.id}
                  className="p-3.5 rounded-xl bg-surface-card border border-border hover:border-border-hover transition-colors flex flex-col justify-between gap-3 group"
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded bg-surface border border-indigo-500 text-zinc-100"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={editColor}
                          onChange={(e) => setEditColor(e.target.value)}
                          className="w-6 h-6 rounded border border-border cursor-pointer bg-transparent"
                        />
                        <div className="flex items-center gap-1 ml-auto">
                          <button
                            onClick={() => setEditingCatId(null)}
                            className="p-1 rounded text-zinc-400 hover:text-zinc-200"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleSaveEdit(cat.id)}
                            disabled={isSubmittingEdit}
                            className="p-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                            style={{ backgroundColor: cat.color || '#6366f1' }}
                          />
                          <span className="text-xs font-semibold text-zinc-200 group-hover:text-zinc-100">
                            {cat.name}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-surface text-zinc-400 border border-border">
                          {cat.reference_count || 0} stills
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border-subtle text-[11px] text-zinc-500">
                        <span className="font-mono text-[10px] text-zinc-600">/{cat.slug}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleStartEdit(cat)}
                            className="p-1 rounded hover:bg-surface text-zinc-400 hover:text-zinc-200"
                            title="Rename / Change Color"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat.id, cat.name)}
                            className="p-1 rounded hover:bg-surface text-zinc-500 hover:text-rose-400"
                            title="Delete Category"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center text-xs text-zinc-500">
            No categories found matching "{search}"
          </div>
        )}
      </main>

      <QuickCaptureModal
        isOpen={isCaptureOpen}
        onClose={() => setIsCaptureOpen(false)}
        onReferenceCreated={loadCategories}
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

