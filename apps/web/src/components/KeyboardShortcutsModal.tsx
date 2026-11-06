'use client';

import React from 'react';
import { X, Command, Keyboard } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: '⌘ + K', desc: 'Open search and quick filter bar' },
    { key: '⌘ + Shift + C', desc: 'Open quick capture modal' },
    { key: '⌘ + V', desc: 'Paste copied screenshot directly from clipboard' },
    { key: '+ / -', desc: 'Zoom in / zoom out in high-res frame viewer' },
    { key: '0', desc: 'Reset zoom to fit screen' },
    { key: 'Esc', desc: 'Close any active modal or fullscreen view' },
  ];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-surface-card border border-border rounded-xl shadow-2xl p-6 space-y-5"
      >
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2 text-zinc-100">
            <Keyboard className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold">Keyboard Shortcuts</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {shortcuts.map((s, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">{s.desc}</span>
              <kbd className="px-2 py-1 rounded bg-surface border border-border text-indigo-300 font-mono text-[11px]">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-2 text-center text-[11px] text-zinc-500">
          Designed for high-speed editorial workflows.
        </div>
      </div>
    </div>
  );
}
