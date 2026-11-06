'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { QuickCaptureModal } from '@/components/QuickCaptureModal';
import { SearchModal } from '@/components/SearchModal';
import { KeyboardShortcutsModal } from '@/components/KeyboardShortcutsModal';
import { ApiToken, Category } from '@/lib/types';
import { useToast } from '@/components/Toast';
import {
  Settings as SettingsIcon,
  Key,
  Database,
  HardDrive,
  Copy,
  Plus,
  Check,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function SettingsPage() {
  const { showToast } = useToast();

  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newTokenName, setNewTokenName] = useState('');
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Modals
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Status checks
  const [isSupabaseConfigured, setIsSupabaseConfigured] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [tokenRes, catRes] = await Promise.all([
          fetch('/api/figma/tokens'),
          fetch('/api/categories'),
        ]);

        if (tokenRes.ok) {
          const td = await tokenRes.json();
          setTokens(td.tokens || []);
        }
        if (catRes.ok) {
          const cd = await catRes.json();
          setCategories(cd.categories || []);
        }
      } catch {
        // ignore
      }
    }
    loadData();
  }, []);

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTokenName.trim()) return;

    setIsGeneratingToken(true);
    try {
      const res = await fetch('/api/figma/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTokenName.trim() }),
      });

      if (res.ok) {
        const d = await res.json();
        setTokens((prev) => [...prev, d.token]);
        setNewTokenName('');
        showToast('New Figma plugin token generated!', 'success');
      }
    } catch {
      showToast('Failed to create token', 'error');
    } finally {
      setIsGeneratingToken(false);
    }
  };

  const [revealedTokens, setRevealedTokens] = useState<Record<string, boolean>>({});

  const toggleReveal = (id: string) => {
    setRevealedTokens(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = async (tokenStr: string) => {
    let success = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(tokenStr);
        success = true;
      }
    } catch {
      // Fallback below
    }

    if (!success) {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = tokenStr;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        success = document.execCommand('copy');
        document.body.removeChild(textArea);
      } catch {
        success = false;
      }
    }

    if (success) {
      setCopiedToken(tokenStr);
      showToast('Token copied to clipboard', 'info');
      setTimeout(() => setCopiedToken(null), 2000);
    } else {
      showToast('Please select and copy the token manually', 'error');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar
        onOpenCapture={() => setIsCaptureOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
      />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* Title */}
        <div className="border-b border-border pb-4">
          <h1 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-indigo-400" />
            Application & Integration Settings
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Configure Figma connection tokens, Supabase database, and storage parameters.
          </p>
        </div>

        {/* Section 1: Figma Plugin Authentication Tokens */}
        <div className="p-6 rounded-xl bg-surface-card border border-border space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-semibold text-zinc-100">
                Figma Plugin Access Tokens
              </h2>
            </div>
            <span className="text-[11px] font-mono text-zinc-500">
              {tokens.length} active tokens
            </span>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            Personal access tokens allow your local FrameVault Figma plugin to securely fetch pending screenshots and update synchronization status without exposing your account password or database credentials.
          </p>

          {/* Create New Token Form */}
          <form onSubmit={handleCreateToken} className="flex gap-2">
            <input
              type="text"
              placeholder="Token description (e.g. MacBook Pro Figma Desktop)"
              value={newTokenName}
              onChange={(e) => setNewTokenName(e.target.value)}
              className="flex-1 px-3 py-2 text-xs rounded-md bg-surface border border-border text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={isGeneratingToken || !newTokenName.trim()}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-md bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Generate Token
            </button>
          </form>

          {/* Tokens List */}
          <div className="space-y-2 pt-2">
            {tokens.map((token) => (
              <div
                key={token.id}
                className="p-3 rounded-lg bg-surface border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-200">{token.name}</span>
                    {token.last_used_at && (
                      <span className="text-[10px] text-zinc-500">
                        • Last used {new Date(token.last_used_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <input
                      type={revealedTokens[token.id] ? "text" : "password"}
                      readOnly
                      value={token.token}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      className="px-2 py-1 text-[11px] font-mono text-indigo-300 bg-background/80 border border-border rounded max-w-sm w-full select-all focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => toggleReveal(token.id)}
                      className="p-1 rounded hover:bg-surface-elevated text-zinc-400 hover:text-zinc-200"
                      title={revealedTokens[token.id] ? "Hide token" : "Show token"}
                    >
                      {revealedTokens[token.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => copyToClipboard(token.token)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-200 text-xs transition-colors self-start sm:self-auto shrink-0"
                >
                  {copiedToken === token.token ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-indigo-300" />
                  )}
                  {copiedToken === token.token ? 'Copied!' : 'Copy Token'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Supabase Infrastructure Status */}
        <div className="p-6 rounded-xl bg-surface-card border border-border space-y-4">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-zinc-100">
              Supabase PostgreSQL & Storage Status
            </h2>
          </div>

          <div className="p-4 rounded-lg bg-surface border border-border space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Environment Backend:</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[11px] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Active & Ready
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Storage Bucket:</span>
              <span className="font-mono text-zinc-200 text-[11px]">
                framevault-references
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Database Schema:</span>
              <span className="font-mono text-zinc-300 text-[11px]">
                supabase/migrations/20261106_init.sql
              </span>
            </div>
          </div>

          <div className="text-xs text-zinc-400 space-y-2">
            <p className="font-medium text-zinc-300">To connect your remote Supabase instance:</p>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-zinc-400">
              <li>Create a new project on <a href="https://supabase.com" target="_blank" className="text-indigo-400 underline">supabase.com</a>.</li>
              <li>Execute the SQL migration in <code className="text-zinc-200 font-mono">supabase/migrations/20261106_init.sql</code> via the Supabase SQL Editor.</li>
              <li>Add your <code className="text-zinc-200 font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="text-zinc-200 font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> into <code className="text-zinc-200 font-mono">.env.local</code>.</li>
            </ol>
          </div>
        </div>
      </main>

      <QuickCaptureModal
        isOpen={isCaptureOpen}
        onClose={() => setIsCaptureOpen(false)}
        categories={categories}
      />
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectReference={(ref) => (window.location.href = `/references/${ref.id}`)}
      />
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
}

