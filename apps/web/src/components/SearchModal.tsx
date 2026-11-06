'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Film, ExternalLink, Sparkles, ArrowRight } from 'lucide-react';
import { Reference } from '@/lib/types';
import { getDomainFromUrl } from '@/lib/utils';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectReference: (ref: Reference) => void;
}

export function SearchModal({ isOpen, onClose, onSelectReference }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Reference[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/references?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.references || []);
          setSelectedIndex(0);
        }
      } catch {
        // ignore search error
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      onSelectReference(results[selectedIndex]);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-surface-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]"
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border bg-surface/50">
          <Search className="w-4 h-4 text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search references by title, editing notes, categories, or source..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 divide-y divide-border/40">
          {isLoading && (
            <div className="py-8 text-center text-xs text-zinc-500">Searching library...</div>
          )}

          {!isLoading && query && results.length === 0 && (
            <div className="py-12 text-center space-y-1">
              <p className="text-sm font-medium text-zinc-400">No references match "{query}"</p>
              <p className="text-xs text-zinc-600">Try searching by category, editing technique, or source URL</p>
            </div>
          )}

          {!isLoading && !query && (
            <div className="py-8 text-center text-xs text-zinc-500">
              Type keywords to search across titles, categories, notes, and video links...
            </div>
          )}

          {!isLoading &&
            results.map((ref, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={ref.id}
                  onClick={() => {
                    onSelectReference(ref);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    isSelected ? 'bg-surface-elevated text-zinc-100' : 'text-zinc-300 hover:bg-surface'
                  }`}
                >
                  <img
                    src={ref.image_path}
                    alt={ref.title}
                    className="w-14 h-10 object-cover rounded bg-black/40 border border-border shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-medium text-zinc-200 truncate">{ref.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      {ref.categories.slice(0, 2).map((c) => (
                        <span
                          key={c.id}
                          className="text-[10px] px-1.5 py-0.2 rounded bg-surface border border-border text-zinc-400"
                        >
                          {c.name}
                        </span>
                      ))}
                      {ref.source_url && (
                        <span className="text-[10px] text-zinc-500 truncate max-w-[150px]">
                          {getDomainFromUrl(ref.source_url)}
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowRight
                    className={`w-4 h-4 transition-transform ${
                      isSelected ? 'text-indigo-400 translate-x-1' : 'text-zinc-600'
                    }`}
                  />
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
