import React, { useMemo, useState } from 'react';
import {
  Activity,
  Camera,
  Check,
  Command,
  Download,
  Gauge,
  Mail,
  Play,
  Search,
  Square,
  Wifi,
  X,
} from 'lucide-react';
import type {
  CatalogItem,
  MacroPreset,
  NavSection,
  RobloxGame,
  RobloxPlayer,
  RunningInstance,
} from '../../types/lunar';
import { HERO_SPACE_IMAGE } from '../../data/seedData';
import { validateWaitlistEmail } from '../../utils/clientLogic';
import { LunarLogoMark } from '../LunarBrand';

/* ==================== LIVE SECOND-SCREEN HUD OVERLAY ==================== */
export function SecondScreenHudModal({
  open,
  onClose,
  instances,
  macros,
  fpsBadgeText,
  onToggleMacro,
  onCaptureInstance,
  onStopInstance,
  onOpenInstances,
}: {
  open: boolean;
  onClose: () => void;
  instances: RunningInstance[];
  macros: MacroPreset[];
  fpsBadgeText: string;
  onToggleMacro: (macroId: string) => void;
  onCaptureInstance: (inst: RunningInstance) => void;
  onStopInstance: (instId: string) => void;
  onOpenInstances: () => void;
}) {
  if (!open) return null;
  const primary = instances[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Live Second-Screen HUD"
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-end p-4"
    >
      <div className="w-full max-w-md h-full max-h-[680px] rounded-2xl bg-[#131620] border border-white/[0.1] shadow-2xl flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.07] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#7FA6FF]" />
            <h2 className="text-sm font-bold text-white">Live Second-Screen HUD</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close second-screen HUD"
            className="p-1.5 rounded-lg text-[#8B94AB] hover:text-white hover:bg-white/[0.06]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Speedometer Readout */}
          <div className="rounded-2xl bg-[#0D1017] border border-white/[0.07] p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-[#7E879E] block">Frame Rate Output</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white font-mono-tabular">
                  {primary ? primary.liveFps : fpsBadgeText}
                </span>
                <span className="text-xs font-semibold text-[#7FA6FF]">FPS</span>
              </div>
              <p className="text-[11px] text-[#667085] mt-1">
                Cap mode: <strong className="text-[#C9D0E2]">{fpsBadgeText} FPS</strong>
              </p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-[#182033] border border-[#6E96FF]/30 flex items-center justify-center">
              <Gauge className="w-7 h-7 text-[#93B4FF]" />
            </div>
          </div>

          {/* Active Instances */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-[#A8B1C7]">
                Running Instances ({instances.length})
              </h3>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenInstances();
                }}
                className="text-[11px] text-[#7FA6FF] hover:underline"
              >
                Full Manager
              </button>
            </div>

            {instances.length === 0 ? (
              <p className="text-xs text-[#6E778E] py-4 text-center rounded-xl bg-[#171B26]">
                No running Roblox instances. Launch any game to monitor telemetry.
              </p>
            ) : (
              instances.map((inst) => (
                <div
                  key={inst.id}
                  className="p-3 rounded-xl bg-[#171B26] border border-white/[0.07] space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{inst.gameTitle}</p>
                      <p className="text-[11px] text-[#8B94AB] font-mono-tabular">
                        {inst.accountUsername} · {inst.liveFps} FPS ·{' '}
                        <span className="inline-flex items-center gap-0.5 text-[#4ADE80]">
                          <Wifi className="w-3 h-3" /> {inst.pingMs}ms
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onCaptureInstance(inst)}
                        aria-label={`Capture ${inst.gameTitle} from HUD`}
                        className="p-1.5 rounded-lg bg-[#22283A] hover:bg-[#2C344C] text-[#E2E7F4]"
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onStopInstance(inst.id)}
                        aria-label={`Stop ${inst.gameTitle} from HUD`}
                        className="p-1.5 rounded-lg bg-[#3E1A21] hover:bg-[#55222C] text-[#FCA5A5]"
                      >
                        <Square className="w-3 h-3 fill-current" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Quick Macro Toggles */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-[#A8B1C7]">Armed Macros</h3>
            {macros.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-[#171B26] border border-white/[0.06]"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Command className="w-3.5 h-3.5 text-[#7FA6FF] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white truncate">{m.name}</p>
                    <p className="text-[10px] text-[#7E879E] font-mono-tabular">{m.hotkey}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleMacro(m.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    m.enabled
                      ? 'bg-[#163626] text-[#4ADE80]'
                      : 'bg-[#232839] text-[#8B94AB] hover:text-white'
                  }`}
                >
                  {m.enabled ? 'Active' : 'Off'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ==================== GLOBAL QUICK SEARCH MODAL ==================== */
export function QuickSearchModal({
  open,
  onClose,
  games,
  players,
  catalog,
  onLaunchGame,
  onNavigate,
}: {
  open: boolean;
  onClose: () => void;
  games: RobloxGame[];
  players: RobloxPlayer[];
  catalog: CatalogItem[];
  onLaunchGame: (game: RobloxGame) => void;
  onNavigate: (section: NavSection) => void;
}) {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return {
      games: games.filter((g) => !q || g.title.toLowerCase().includes(q)).slice(0, 4),
      players: players
        .filter((p) => !q || p.displayName.toLowerCase().includes(q) || p.username.toLowerCase().includes(q))
        .slice(0, 4),
      items: catalog.filter((c) => !q || c.name.toLowerCase().includes(q)).slice(0, 4),
    };
  }, [query, games, players, catalog]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Global quick search"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-20 p-4"
    >
      <div className="w-full max-w-xl rounded-2xl bg-[#151822] border border-white/[0.1] shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 h-12 border-b border-white/[0.07]">
          <Search className="w-4 h-4 text-[#7FA6FF]" />
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to games, players, catalog items..."
            aria-label="Search Lunar for Roblox"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-[#667085] focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close quick search"
            className="p-1 rounded-md text-[#8B94AB] hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-4">
          {results.games.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-[#7E879E] px-2">Experiences</p>
              {results.games.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    onLaunchGame(g);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-white/[0.05] text-left"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={g.thumbnail}
                      alt={g.title}
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-lg object-cover"
                    />
                    <span className="text-xs font-medium text-white truncate">{g.title}</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#4ADE80] font-semibold">
                    <Play className="w-3 h-3 fill-current" /> Launch
                  </span>
                </button>
              ))}
            </div>
          )}

          {results.items.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-[#7E879E] px-2">Marketplace</p>
              {results.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onNavigate('marketplace');
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-white/[0.05] text-left text-xs"
                >
                  <span className="text-white">{item.name}</span>
                  <span className="font-mono-tabular text-[#8B94AB]">
                    {item.price === 0 ? 'Free' : `R$ ${item.price}`}
                  </span>
                </button>
              ))}
            </div>
          )}

          {results.players.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-[#7E879E] px-2">Players</p>
              {results.players.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onNavigate('players');
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-white/[0.05] text-left text-xs"
                >
                  <span className="text-white">{p.displayName}</span>
                  <span className="text-[#7E879E]">@{p.username}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ==================== 1:1 LUNAR.GG/ROBLOX WEBSITE SHOWCASE OVERLAY ==================== */
export function LunarWebsitePreviewModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [slideIdx, setSlideIdx] = useState(0);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [joined, setJoined] = useState(false);

  if (!open) return null;

  const slides = [
    { caption: 'A vibrant home experience!', label: 'Launchpad' },
    { caption: 'All the customization you need!', label: 'Marketplace' },
    { caption: 'Connect with friends!', label: 'Players' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = validateWaitlistEmail(email);
    if (!res.valid) {
      setEmailError(res.error ?? 'Invalid email');
      return;
    }
    setEmailError('');
    setJoined(true);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Lunar for Roblox official website showcase"
      className="fixed inset-0 z-50 lunar-starfield overflow-y-auto flex flex-col justify-between p-6"
    >
      {/* Floating Top Pill Navbar matching lunar.gg/roblox */}
      <div className="max-w-5xl w-full mx-auto rounded-full bg-[#11141E]/85 backdrop-blur-md border border-white/[0.09] px-5 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <LunarLogoMark className="w-6 h-6 text-white" />
          <div className="leading-none">
            <span className="block text-xs font-bold tracking-[0.22em] text-white">LUNAR</span>
            <span className="block text-[9px] tracking-[0.16em] text-[#94A3B8] mt-0.5">FOR ROBLOX</span>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-full border border-white/[0.14] text-xs font-semibold text-white hover:bg-white/[0.08] transition-colors whitespace-nowrap"
          >
            Back to Client
          </button>
          <button
            type="button"
            onClick={() => setWaitlistOpen(true)}
            className="px-4 py-1.5 rounded-full bg-white text-[#0B0D14] hover:bg-[#E0EAFF] text-xs font-bold inline-flex items-center gap-1.5 shadow-[0_0_24px_rgba(147,180,255,0.45)] whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            Join waitlist
          </button>
        </div>
      </div>

      {/* Main Split Hero matching lunar.gg/roblox */}
      <div className="max-w-5xl w-full mx-auto my-auto py-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-6 space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.1] text-xs text-[#C7D2FE]">
            <LunarLogoMark className="w-3.5 h-3.5 text-white" />
            <span>From the creators of Lunar Client</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.05] text-balance">
            <span className="block text-white">One launcher.</span>
            <span className="block text-[#A5BFFF]">All of Roblox.</span>
          </h1>

          <p className="text-sm sm:text-[15px] text-[#9CA6BE] leading-relaxed max-w-md">
            Unlimited isolated instances, uncapped FPS, the whole catalog and trades, macros, and a
            live second-screen HUD, all in one fast desktop app for Windows &amp; macOS.{' '}
            <strong className="text-white">Coming soon!</strong>
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => setWaitlistOpen(true)}
              className="px-5 py-3 rounded-xl bg-white text-[#0B0D14] hover:bg-[#E0EAFF] text-sm font-bold inline-flex items-center gap-2 shadow-[0_6px_28px_rgba(147,180,255,0.4)] transition-colors"
            >
              <Download className="w-4 h-4" />
              Join the waitlist
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.12] text-sm font-semibold text-white transition-colors"
            >
              Open Interactive Client
            </button>
          </div>

          <p className="text-xs text-[#7E879E] inline-flex items-center gap-2">
            <Mail className="w-3.5 h-3.5" />
            Are you a Roblox Creator or Developer? Reach out for early access!
          </p>
        </div>

        <div className="lg:col-span-6 relative">
          <div className="relative rounded-2xl overflow-hidden border border-[#6E96FF]/30 bg-[#12141B] shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
            <img
              src={HERO_SPACE_IMAGE}
              alt="Lunar for Roblox preview showcase"
              referrerPolicy="no-referrer"
              className="w-full aspect-[16/10] object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0D14]/85 via-transparent to-transparent flex flex-col justify-end p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {slides.map((s, idx) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => setSlideIdx(idx)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                        slideIdx === idx
                          ? 'bg-white text-[#0B0D14]'
                          : 'bg-black/60 text-[#CBD5E1] hover:text-white'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <span className="px-3 py-1 rounded-full bg-[#0E111B]/90 border border-[#6E96FF]/40 text-xs font-medium text-white">
                  {slides[slideIdx].caption}
                </span>
              </div>
            </div>
          </div>

          {/* Floating ∞ FPS Badge matching lunar.gg/roblox */}
          <div className="absolute -top-4 right-5 px-3.5 py-1.5 rounded-full bg-[#151925]/95 border border-white/[0.12] shadow-xl flex items-center gap-2">
            <Gauge className="w-4 h-4 text-[#7FA6FF]" />
            <span className="text-sm font-bold text-white font-mono-tabular">∞</span>
            <span className="text-xs text-[#9BA3B8]">FPS</span>
          </div>
        </div>
      </div>

      {/* Waitlist Inline Drawer */}
      {waitlistOpen && (
        <div className="max-w-md w-full mx-auto mb-4 rounded-2xl bg-[#141824] border border-white/[0.12] p-5 shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white">Join the Lunar for Roblox Waitlist</h2>
            <button
              type="button"
              onClick={() => setWaitlistOpen(false)}
              aria-label="Close waitlist form"
              className="text-[#8B94AB] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {joined ? (
            <div className="flex items-center gap-2 text-xs text-[#4ADE80] py-2">
              <Check className="w-4 h-4" />
              <span>You&apos;re on the early access list for {email}!</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-2.5">
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError('');
                  }}
                  placeholder="astronaut@example.com"
                  aria-label="Waitlist email address"
                  className="flex-1 h-9 px-3 rounded-lg bg-[#0E111A] border border-white/[0.1] text-xs text-white focus:outline-none focus:border-[#6E96FF]"
                />
                <button
                  type="submit"
                  className="h-9 px-4 rounded-lg bg-white text-[#0B0D14] text-xs font-bold whitespace-nowrap"
                >
                  Reserve Spot
                </button>
              </div>
              {emailError && <p className="text-[11px] text-[#F87171]">{emailError}</p>}
            </form>
          )}
        </div>
      )}

      {/* Footer matching lunar.gg/roblox */}
      <footer className="text-center text-xs text-[#737C94] space-y-1.5 pt-4">
        <p className="font-semibold text-[#9BA3B8]">© 2026 Moonsworth, LLC</p>
        <p>All rights reserved. Not affiliated with Roblox</p>
      </footer>
    </div>
  );
}
