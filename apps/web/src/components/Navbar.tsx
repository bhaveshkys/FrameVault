'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Film,
  Bookmark,
  Layers,
  Sparkles,
  Settings,
  Plus,
  Search,
  Command,
  HelpCircle,
} from 'lucide-react';

interface NavbarProps {
  onOpenCapture: () => void;
  onOpenSearch: () => void;
  onOpenShortcuts: () => void;
}

export function Navbar({ onOpenCapture, onOpenSearch, onOpenShortcuts }: NavbarProps) {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Fetch pending count for badge
    async function checkPending() {
      try {
        const res = await fetch('/api/figma/pending', {
          headers: { Authorization: 'Bearer dev-token' },
        });
        if (res.ok) {
          const data = await res.json();
          setPendingCount(data.count || 0);
        }
      } catch {
        // Ignore background fetch error
      }
    }
    checkPending();
    const interval = setInterval(checkPending, 8000);
    return () => clearInterval(interval);
  }, []);

  const navLinks = [
    { href: '/', label: 'Library', icon: Film },
    { href: '/favorites', label: 'Favorites', icon: Bookmark },
    { href: '/categories', label: 'Categories', icon: Layers },
    {
      href: '/figma',
      label: 'Figma Sync',
      icon: Sparkles,
      badge: pendingCount > 0 ? pendingCount : null,
    },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/85 backdrop-blur-md">
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-md bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-indigo-400 group-hover:border-indigo-500/50 group-hover:text-indigo-300 transition-all">
              <Film className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm tracking-tight text-zinc-100 flex items-center gap-1.5">
                FrameVault
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  PRO
                </span>
              </span>
              <span className="text-[10px] text-zinc-500 -mt-0.5">Reference Library</span>
            </div>
          </Link>

          {/* Navigation links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-surface-elevated text-zinc-100 border border-border-hover'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-surface'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-400' : 'text-zinc-500'}`} />
                  {link.label}
                  {link.badge && (
                    <span className="ml-1 px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Search Trigger */}
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-surface border border-border text-xs text-zinc-400 hover:text-zinc-200 hover:border-border-hover transition-all group"
          >
            <Search className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300" />
            <span className="hidden sm:inline">Search references...</span>
            <span className="inline sm:hidden">Search</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
              <Command className="w-2.5 h-2.5" /> K
            </kbd>
          </button>

          {/* Shortcuts Info */}
          <button
            onClick={onOpenShortcuts}
            title="Keyboard Shortcuts"
            className="p-2 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-surface transition-colors hidden sm:block"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Capture CTA */}
          <button
            onClick={onOpenCapture}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-sm transition-all active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Capture</span>
            <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono rounded bg-indigo-700 text-indigo-200">
              ⌘⇧C
            </kbd>
          </button>
        </div>
      </div>
    </header>
  );
}

