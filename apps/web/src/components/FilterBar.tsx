'use client';

import React from 'react';
import { Category, FigmaSyncStatus } from '@/lib/types';
import { Heart, Sparkles, Filter, SlidersHorizontal, Check, X } from 'lucide-react';

interface FilterBarProps {
  categories: Category[];
  selectedCatIds: string[];
  onToggleCategory: (catId: string) => void;
  onClearCategories: () => void;
  isFavoriteOnly: boolean;
  onToggleFavoriteOnly: () => void;
  figmaFilter: string;
  onChangeFigmaFilter: (status: string) => void;
  sortBy: string;
  onChangeSortBy: (sort: string) => void;
  totalCount: number;
}

export function FilterBar({
  categories,
  selectedCatIds,
  onToggleCategory,
  onClearCategories,
  isFavoriteOnly,
  onToggleFavoriteOnly,
  figmaFilter,
  onChangeFigmaFilter,
  sortBy,
  onChangeSortBy,
  totalCount,
}: FilterBarProps) {
  const hasActiveFilters = selectedCatIds.length > 0 || isFavoriteOnly || figmaFilter !== 'all';

  return (
    <div className="space-y-4 mb-8">
      {/* Primary Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        {/* Left Side: Filter Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Favorites Only toggle */}
          <button
            onClick={onToggleFavoriteOnly}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
              isFavoriteOnly
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                : 'bg-surface border-border text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isFavoriteOnly ? 'fill-rose-400 text-rose-400' : ''}`} />
            <span>Favorites</span>
          </button>

          {/* Figma Sync Status Filter Dropdown / Buttons */}
          <div className="flex items-center bg-surface border border-border rounded-md p-0.5 text-xs">
            <span className="px-2 text-[11px] text-zinc-500 font-medium">Figma:</span>
            {['all', 'pending', 'synced', 'failed'].map((status) => (
              <button
                key={status}
                onClick={() => onChangeFigmaFilter(status)}
                className={`px-2.5 py-1 rounded text-[11px] capitalize transition-colors ${
                  figmaFilter === status
                    ? 'bg-surface-elevated text-zinc-100 font-medium border border-border-hover'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Clear filters if any active */}
          {hasActiveFilters && (
            <button
              onClick={() => {
                onClearCategories();
                if (isFavoriteOnly) onToggleFavoriteOnly();
                onChangeFigmaFilter('all');
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X className="w-3 h-3" />
              Reset filters
            </button>
          )}
        </div>

        {/* Right Side: Sorting & Total count */}
        <div className="flex items-center gap-4">
          <span className="text-xs text-zinc-500 font-mono">
            {totalCount} {totalCount === 1 ? 'Reference' : 'References'}
          </span>

          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500" />
            <select
              value={sortBy}
              onChange={(e) => onChangeSortBy(e.target.value)}
              className="bg-surface border border-border text-zinc-300 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-border-hover cursor-pointer"
            >
              <option value="recent">Recently Added</option>
              <option value="oldest">Oldest First</option>
              <option value="title">Title (A-Z)</option>
              <option value="modified">Recently Modified</option>
            </select>
          </div>
        </div>
      </div>

      {/* Horizontal Category Pill Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar">
        <span className="text-xs text-zinc-500 whitespace-nowrap flex items-center gap-1 shrink-0">
          <Filter className="w-3 h-3" />
          Categories:
        </span>

        {categories.map((cat) => {
          const isSelected = selectedCatIds.includes(cat.id);
          return (
            <button
              key={cat.id}
              onClick={() => onToggleCategory(cat.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs whitespace-nowrap transition-all shrink-0 ${
                isSelected
                  ? 'bg-indigo-600 text-white font-medium shadow-sm'
                  : 'bg-surface border border-border text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: cat.color || '#6366f1' }}
              />
              <span>{cat.name}</span>
              {cat.reference_count !== undefined && cat.reference_count > 0 && (
                <span className={`text-[10px] font-mono ${isSelected ? 'text-indigo-200' : 'text-zinc-500'}`}>
                  {cat.reference_count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
