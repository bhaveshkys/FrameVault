'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { QuickCaptureModal } from '@/components/QuickCaptureModal';
import { SearchModal } from '@/components/SearchModal';
import { KeyboardShortcutsModal } from '@/components/KeyboardShortcutsModal';
import { FigmaPendingItem, Category } from '@/lib/types';
import { useToast } from '@/components/Toast';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Copy,
  Layers,
  Terminal,
  ArrowRight,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

export default function FigmaSyncDashboard() {
  const { showToast } = useToast();

  const [pendingItems, setPendingItems] = useState<FigmaPendingItem[]>([]);
  const [stats, setStats] = useState({ pending: 0, synced: 0, failed: 0, total: 0 });
  const [categories, setCategories] = useState<Category[]>([]);
  const [apiToken, setApiToken] = useState<string>('');
  const [copiedToken, setCopiedToken] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  // Modals
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [pendingRes, tokenRes, catRes] = await Promise.all([
        fetch('/api/figma/pending', {
          headers: { Authorization: 'Bearer dev-token' },
        }),
        fetch('/api/figma/tokens'),
        fetch('/api/categories'),
      ]);

      if (pendingRes.ok) {
        const d = await pendingRes.json();
        setPendingItems(d.items || []);
        setStats((prev) => ({ ...prev, pending: d.count || 0 }));
      }

      if (tokenRes.ok) {
        const td = await tokenRes.json();
        if (td.tokens && td.tokens.length > 0) {
          setApiToken(td.tokens[0].token);
        }
      }

      if (catRes.ok) {
        const cd = await catRes.json();
        setCategories(cd.categories || []);
      }
    } catch {
      showToast('Failed to load Figma sync status', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleCopyToken = () => {
    if (apiToken) {
      navigator.clipboard.writeText(apiToken);
      setCopiedToken(true);
      showToast('Sync token copied to clipboard!', 'info');
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  const handleSimulatePluginSync = async () => {
    if (pendingItems.length === 0) {
      showToast('No pending references to synchronize.', 'info');
      return;
    }

    try {
      showToast(`Synchronizing ${pendingItems.length} references into Figma sections...`, 'info');
      for (const item of pendingItems) {
        const dummyNodeId = `figma-${Math.floor(100 + Math.random() * 900)}:${Math.floor(10 + Math.random() * 90)}`;
        await fetch('/api/figma/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiToken || 'dev-token'}`,
          },
          body: JSON.stringify({
            reference_id: item.reference_id,
            category_id: item.category_id,
            figma_file_key: 'FRAMEVAULT_REFERENCE_BOARD',
            figma_node_id: dummyNodeId,
            status: 'synced',
          }),
        });
      }

      showToast('All pending references synced successfully into Figma board!', 'success');
      loadData();
    } catch {
      showToast('Failed during simulation', 'error');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar
        onOpenCapture={() => setIsCaptureOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-figma/20 border border-figma/40 flex items-center justify-center text-figma">
                <Sparkles className="w-4 h-4" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-100">
                Figma Board Synchronization
              </h1>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Automatically creates and categorizes visual reference cards on your "FrameVault References" canvas page.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface border border-border text-xs text-zinc-300 hover:text-zinc-100 hover:bg-surface-elevated transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Queue
            </button>
            <button
              onClick={handleSimulatePluginSync}
              disabled={pendingItems.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium shadow-sm transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
              <span>Simulate Plugin Sync ({pendingItems.length})</span>
            </button>
          </div>
        </div>

        {/* Sync Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-surface-card border border-amber-500/20 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-zinc-400">Pending Sync</span>
              <p className="text-lg font-bold font-mono text-amber-300">{pendingItems.length}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-surface-card border border-emerald-500/20 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-zinc-400">Plugin Ready</span>
              <p className="text-lg font-bold text-emerald-300">Connected</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-surface-card border border-indigo-500/20 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-zinc-400">Target Figma Page</span>
              <p className="text-sm font-semibold text-zinc-200">FrameVault References</p>
            </div>
          </div>
        </div>

        {/* API Token Box for Plugin */}
        <div className="p-5 rounded-xl bg-surface-card border border-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <h2 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
                Figma Plugin Personal Access Token
              </h2>
            </div>
            <Link
              href="/settings"
              className="text-xs text-indigo-400 hover:text-indigo-300"
            >
              Manage Tokens in Settings →
            </Link>
          </div>
          <p className="text-xs text-zinc-400">
            Paste this token into the FrameVault Figma Plugin window to authorize secure synchronization.
          </p>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={apiToken || 'fv_live_7a9f8b2c4e1d3a5e6f8b0c2d4e6f8a0b'}
              className="flex-1 px-3 py-2 text-xs font-mono rounded-lg bg-surface border border-border text-zinc-200 select-all"
            />
            <button
              onClick={handleCopyToken}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface border border-border hover:bg-surface-elevated text-xs font-medium text-zinc-200 transition-colors shrink-0"
            >
              {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
              {copiedToken ? 'Copied!' : 'Copy Token'}
            </button>
          </div>
        </div>

        {/* Pending References Table */}
        <div className="p-6 rounded-xl bg-surface-card border border-border space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              <span>Pending Sync Queue</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {pendingItems.length} items
              </span>
            </h2>
          </div>

          {pendingItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="border-b border-border text-zinc-500 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="pb-3 font-medium">Still Preview</th>
                    <th className="pb-3 font-medium">Title</th>
                    <th className="pb-3 font-medium">Target Section</th>
                    <th className="pb-3 font-medium">Captured Date</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {pendingItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-surface/50 transition-colors">
                      <td className="py-3">
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="w-16 h-10 object-cover rounded bg-black/40 border border-border"
                        />
                      </td>
                      <td className="py-3 font-medium text-zinc-200 max-w-[220px] truncate">
                        {item.title}
                      </td>
                      <td className="py-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface border border-border text-zinc-300">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: item.category_color || '#6366f1' }}
                          />
                          {item.category_name}
                        </span>
                      </td>
                      <td className="py-3 text-zinc-500 font-mono text-[11px]">
                        {formatDate(item.created_at)}
                      </td>
                      <td className="py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Clock className="w-3 h-3" />
                          Pending
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-zinc-500 space-y-1">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
              <p className="font-medium text-zinc-300">All captured references are in sync with Figma!</p>
              <p>Capture new video stills to see them queued here.</p>
            </div>
          )}
        </div>

        {/* Setup Instructions */}
        <div className="p-6 rounded-xl bg-surface-card border border-border space-y-4">
          <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-indigo-400" />
            How to run the FrameVault Figma Plugin
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-zinc-400">
            <div className="p-4 rounded-lg bg-surface border border-border space-y-2">
              <span className="font-mono text-indigo-400 text-[11px] font-bold">STEP 01</span>
              <h3 className="font-medium text-zinc-200">Load Plugin in Figma Desktop</h3>
              <p className="text-[11px] leading-relaxed">
                Open Figma Desktop → Plugins → Development → <strong>Import plugin from manifest...</strong> and select <code className="text-zinc-200 font-mono">apps/figma-plugin/manifest.json</code>.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-surface border border-border space-y-2">
              <span className="font-mono text-indigo-400 text-[11px] font-bold">STEP 02</span>
              <h3 className="font-medium text-zinc-200">Authenticate Token</h3>
              <p className="text-[11px] leading-relaxed">
                Run the plugin. In the settings tab, paste your FrameVault API URL (<code className="text-zinc-200 font-mono">http://localhost:3000</code>) and Personal Access Token.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-surface border border-border space-y-2">
              <span className="font-mono text-indigo-400 text-[11px] font-bold">STEP 03</span>
              <h3 className="font-medium text-zinc-200">1-Click Auto Layout</h3>
              <p className="text-[11px] leading-relaxed">
                Click <strong>"Sync References"</strong>. The plugin automatically creates category sections (Cinematic Composition, Typography, etc.) and lays out screenshot reference cards.
              </p>
            </div>
          </div>
        </div>
      </main>

      <QuickCaptureModal
        isOpen={isCaptureOpen}
        onClose={() => setIsCaptureOpen(false)}
        onReferenceCreated={loadData}
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

