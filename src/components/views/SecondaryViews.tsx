import React, { useMemo, useRef, useState } from 'react';
import {
  BadgeCheck,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Edit3,
  Gauge,
  ImagePlus,
  Loader2,
  Maximize2,
  Monitor,
  Play,
  Search,
  Send,
  Shield,
  Sliders,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import type {
  CaptureItem,
  ChatThread,
  ClientSettings,
  CommunityGroup,
  RobloxGame,
  RunningInstance,
} from '../../types/lunar';
import { calculatePerformanceProfile, formatCompactCount } from '../../utils/clientLogic';
import { sanitizeCaptureTitle } from '../../utils/robloxApiHelpers';
import {
  captureScreenFrame,
  copyCaptureToClipboard,
  downloadCaptureFile,
  processUploadedScreenshot,
} from '../../utils/captureUtils';
import { RobloxAvatar } from '../LunarBrand';

/* ==================== COMMUNITIES VIEW ==================== */
export function CommunitiesView({
  communities,
  onToggleJoin,
  onSearchGroups,
}: {
  communities: CommunityGroup[];
  onToggleJoin: (groupId: string) => void;
  onSearchGroups: (query: string) => Promise<void>;
}) {
  const [groupQuery, setGroupQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const handleGroupSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupQuery.trim()) return;
    setSearching(true);
    try {
      await onSearchGroups(groupQuery.trim());
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto px-5 py-4 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-white">Communities</h1>
          <p className="text-xs text-[#8B94AB]">
            Live Roblox groups and creator hubs queried via groups.roblox.com
          </p>
        </div>
        <form onSubmit={handleGroupSearch} className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="search"
            value={groupQuery}
            onChange={(e) => setGroupQuery(e.target.value)}
            placeholder="Search Roblox groups..."
            aria-label="Search Roblox groups"
            className="h-9 px-3 rounded-lg bg-[#171A23] border border-white/[0.08] text-xs text-white placeholder:text-[#667085] focus:outline-none focus:border-[#6E96FF] flex-1 sm:w-56"
          />
          <button
            type="submit"
            disabled={searching}
            className="h-9 px-3.5 rounded-lg bg-white text-[#0E1015] hover:bg-[#E5ECFF] disabled:opacity-50 text-xs font-semibold whitespace-nowrap"
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-6">
        {communities.map((grp) => (
          <article
            key={grp.id}
            className="rounded-2xl bg-[#161923] border border-white/[0.07] p-4 flex flex-col justify-between gap-4"
          >
            <div className="space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {grp.iconUrl ? (
                    <img
                      src={grp.iconUrl}
                      alt={grp.name}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-xl object-cover shrink-0 border border-white/10 bg-[#11141C]"
                    />
                  ) : (
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-base shrink-0"
                      style={{ backgroundColor: `${grp.accent}28`, border: `1px solid ${grp.accent}55` }}
                    >
                      {grp.name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-sm font-semibold text-white truncate">{grp.name}</h2>
                      {grp.verified && <BadgeCheck className="w-4 h-4 text-[#3B82F6] shrink-0" />}
                    </div>
                    <p className="text-xs text-[#7E879E] font-mono-tabular">
                      {formatCompactCount(grp.membersCount)} members · {grp.category}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleJoin(grp.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    grp.joined
                      ? 'bg-[#202536] hover:bg-[#2A3147] text-[#C9D0E2]'
                      : 'bg-white text-[#0E1015] hover:bg-[#E5ECFF]'
                  }`}
                >
                  {grp.joined ? 'Joined' : 'Join Group'}
                </button>
              </div>
              <p className="text-xs text-[#B8C0D6] leading-relaxed">{grp.description}</p>
            </div>

            <div className="p-3 rounded-xl bg-[#11141C] border border-white/[0.05] text-xs">
              <span className="text-[10px] font-semibold text-[#7FA6FF] block">Community Status</span>
              <p className="text-[#DCE1EE] mt-0.5">{grp.shout}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

/* ==================== MESSAGES VIEW ==================== */
export function MessagesView({
  threads,
  games,
  activeThreadId,
  onSelectThread,
  onSendMessage,
  onLaunchGame,
}: {
  threads: ChatThread[];
  games: RobloxGame[];
  activeThreadId: string;
  onSelectThread: (threadId: string) => void;
  onSendMessage: (threadId: string, text: string) => void;
  onLaunchGame: (game: RobloxGame) => void;
}) {
  const [draft, setDraft] = useState('');
  const current = threads.find((t) => t.id === activeThreadId) ?? threads[0];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!current || !draft.trim()) return;
    onSendMessage(current.id, draft.trim());
    setDraft('');
  };

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden">
      {/* Threads List */}
      <aside className="w-full md:w-72 shrink-0 border-b md:border-b-0 md:border-r border-white/[0.06] bg-[#101218] p-3 space-y-1.5 overflow-y-auto">
        <h1 className="px-2 py-1 text-xs font-semibold text-[#8B94AB]">Direct Messages</h1>
        {threads.map((thread) => {
          const isSelected = current?.id === thread.id;
          const lastMsg = thread.messages[thread.messages.length - 1];
          return (
            <button
              key={thread.id}
              type="button"
              onClick={() => onSelectThread(thread.id)}
              className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-colors ${
                isSelected ? 'bg-[#1D2231] text-white' : 'hover:bg-white/[0.04] text-[#B8C0D6]'
              }`}
            >
              <div className="relative shrink-0">
                <RobloxAvatar
                  style={thread.avatarStyle}
                  src={thread.avatarUrl}
                  alt={thread.displayName}
                  size={36}
                />
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#101218] ${
                    thread.online ? 'bg-[#22C55E]' : 'bg-[#64748B]'
                  }`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold truncate">{thread.displayName}</span>
                  {thread.unread > 0 && (
                    <span className="min-w-[16px] h-4 px-1 rounded-full bg-[#3B82F6] text-[10px] font-bold text-white flex items-center justify-center">
                      {thread.unread}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#7E879E] truncate mt-0.5">
                  {lastMsg?.text ?? 'Start chatting...'}
                </p>
              </div>
            </button>
          );
        })}
      </aside>

      {/* Active Chat Panel */}
      {current ? (
        <div className="flex-1 flex flex-col min-w-0 bg-[#12141B]">
          <div className="h-14 px-5 border-b border-white/[0.06] flex items-center gap-3 shrink-0">
            <RobloxAvatar
              style={current.avatarStyle}
              src={current.avatarUrl}
              alt={current.displayName}
              size={32}
            />
            <div>
              <p className="text-sm font-semibold text-white">{current.displayName}</p>
              <p className="text-[11px] text-[#7E879E]">
                @{current.username} · {current.online ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {current.messages.map((msg) => {
              const inviteGame = msg.gameInviteId
                ? games.find(
                    (g) =>
                      g.id === msg.gameInviteId ||
                      g.title.toLowerCase().includes(msg.gameInviteId!.toLowerCase()),
                  )
                : undefined;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'me' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-md rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      msg.sender === 'me'
                        ? 'bg-[#2563EB] text-white'
                        : 'bg-[#1A1E2B] text-[#E6EAF2] border border-white/[0.07]'
                    }`}
                  >
                    <p>{msg.text}</p>
                    {inviteGame && (
                      <div className="mt-2.5 p-2.5 rounded-xl bg-[#11141C] border border-white/[0.08] flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={inviteGame.thumbnail}
                            alt={inviteGame.title}
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-lg object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-white truncate">
                              {inviteGame.title}
                            </p>
                            <p className="text-[10px] text-[#4ADE80]">Server Invite</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onLaunchGame(inviteGame)}
                          className="px-3 py-1.5 rounded-lg bg-[#22C55E] hover:bg-[#16A34A] text-[#052E16] text-[11px] font-bold inline-flex items-center gap-1 shrink-0"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          Join
                        </button>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-[#667085] mt-1 px-1">{msg.time}</span>
                </div>
              );
            })}
          </div>

          <form
            onSubmit={handleSend}
            className="p-3.5 border-t border-white/[0.06] flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Message ${current.displayName}...`}
              aria-label={`Message ${current.displayName}`}
              className="flex-1 h-10 px-3.5 rounded-xl bg-[#171A24] border border-white/[0.08] text-xs text-white placeholder:text-[#667085] focus:outline-none focus:border-[#6E96FF]"
            />
            <button
              type="submit"
              aria-label="Send message"
              className="h-10 px-4 rounded-xl bg-white text-[#0E1015] hover:bg-[#E5ECFF] text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Send
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

/* ==================== CAPTURES VIEW ==================== */
export function CapturesView({
  captures,
  runningInstances,
  activeAccountUsername,
  onCaptureInstance,
  onAddCapture,
  onRenameCapture,
  onDeleteCapture,
  onNotify,
}: {
  captures: CaptureItem[];
  runningInstances: RunningInstance[];
  activeAccountUsername: string;
  onCaptureInstance: (inst: RunningInstance) => void | Promise<void>;
  onAddCapture: (capture: CaptureItem) => void;
  onRenameCapture: (captureId: string, nextTitle: string) => void;
  onDeleteCapture: (captureId: string) => void;
  onNotify: (msg: string) => void;
}) {
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>(
    runningInstances[0]?.id ?? '',
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGameFilter, setSelectedGameFilter] = useState<string>('All');
  const [capturingScreen, setCapturingScreen] = useState(false);
  const [capturingInstance, setCapturingInstance] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [lightboxId, setLightboxId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const targetInstance =
    runningInstances.find((i) => i.id === selectedInstanceId) ?? runningInstances[0] ?? null;

  const gameFilters = useMemo(() => {
    const names = Array.from(new Set(captures.map((c) => c.gameTitle).filter(Boolean)));
    return ['All', ...names];
  }, [captures]);

  const filteredCaptures = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return captures.filter((cap) => {
      if (selectedGameFilter !== 'All' && cap.gameTitle !== selectedGameFilter) {
        return false;
      }
      if (!q) return true;
      return (
        cap.title.toLowerCase().includes(q) ||
        cap.gameTitle.toLowerCase().includes(q) ||
        cap.accountUsername.toLowerCase().includes(q)
      );
    });
  }, [captures, searchQuery, selectedGameFilter]);

  const lightboxIndex = lightboxId
    ? filteredCaptures.findIndex((c) => c.id === lightboxId)
    : -1;
  const activeLightboxCapture = lightboxIndex >= 0 ? filteredCaptures[lightboxIndex] : null;

  const formatNowLabel = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `Just now · ${hh}:${mm}`;
  };

  const handleScreenCapture = async () => {
    setCapturingScreen(true);
    try {
      const result = await captureScreenFrame();
      const newCap: CaptureItem = {
        id: `cap-screen-${Date.now()}`,
        title: targetInstance
          ? `${targetInstance.gameTitle} Screen Capture`
          : 'Roblox Screen Capture',
        gameTitle: targetInstance?.gameTitle ?? 'Desktop / Roblox',
        thumbnail: result.dataUrl,
        capturedAt: formatNowLabel(),
        resolution: `${result.width}×${result.height}`,
        fpsAtCapture: targetInstance ? `${targetInstance.liveFps} FPS` : 'Live',
        accountUsername: targetInstance?.accountUsername ?? activeAccountUsername,
        source: 'screen',
      };
      onAddCapture(newCap);
      setLightboxId(newCap.id);
      onNotify(`Captured ${result.width}×${result.height} screenshot from screen`);
    } catch (err) {
      const msg =
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Screen capture was cancelled or blocked by browser permissions. You can also upload screenshots directly.'
          : err instanceof Error
            ? err.message
            : 'Unable to capture screen in this window.';
      onNotify(msg);
    } finally {
      setCapturingScreen(false);
    }
  };

  const handleFilesSelected = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    setUploadingFiles(true);
    let added = 0;
    let lastError: string | null = null;
    for (const file of list.slice(0, 8)) {
      try {
        const processed = await processUploadedScreenshot(file);
        const newCap: CaptureItem = {
          id: `cap-up-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: processed.title,
          gameTitle: targetInstance?.gameTitle ?? 'Roblox Screenshot',
          thumbnail: processed.dataUrl,
          capturedAt: formatNowLabel(),
          resolution: `${processed.width}×${processed.height}`,
          fpsAtCapture: 'Imported',
          accountUsername: activeAccountUsername,
          source: 'upload',
        };
        onAddCapture(newCap);
        added += 1;
      } catch (err) {
        lastError = err instanceof Error ? err.message : 'Failed to import image.';
      }
    }
    setUploadingFiles(false);
    if (added > 0) {
      onNotify(`Imported ${added} screenshot${added === 1 ? '' : 's'} into Captures`);
    } else if (lastError) {
      onNotify(lastError);
    }
  };

  const handleSnapshotClick = async () => {
    if (!targetInstance) return;
    setCapturingInstance(true);
    try {
      await onCaptureInstance(targetInstance);
    } finally {
      setCapturingInstance(false);
    }
  };

  const openLightbox = (cap: CaptureItem) => {
    setLightboxId(cap.id);
    setEditingTitle(false);
    setTitleDraft(cap.title);
  };

  const handleSaveRename = (cap: CaptureItem) => {
    const clean = sanitizeCaptureTitle(titleDraft, cap.title);
    onRenameCapture(cap.id, clean);
    setEditingTitle(false);
    onNotify('Updated capture title');
  };

  const handleCopy = async (cap: CaptureItem) => {
    const ok = await copyCaptureToClipboard(cap);
    if (ok) {
      setCopiedId(cap.id);
      onNotify('Copied screenshot image to clipboard');
      window.setTimeout(() => setCopiedId((prev) => (prev === cap.id ? null : prev)), 2000);
    } else {
      onNotify('Clipboard image copy unavailable here — use Download instead.');
    }
  };

  const sourceBadgeLabel = (source?: CaptureItem['source']) => {
    if (source === 'screen') return 'Screen Capture';
    if (source === 'upload') return 'Uploaded';
    return 'Instance';
  };

  return (
    <div
      className="h-full overflow-y-auto px-5 py-4 space-y-5 relative"
      onDragOver={(e) => {
        e.preventDefault();
        if (!isDragging) setIsDragging(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setIsDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.length) {
          void handleFilesSelected(e.dataTransfer.files);
        }
      }}
    >
      {/* Hidden file input for real screenshot imports */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        onChange={(e) => {
          if (e.target.files?.length) {
            void handleFilesSelected(e.target.files);
            e.target.value = '';
          }
        }}
        className="hidden"
      />

      {/* Drag-and-drop overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-40 bg-[#0E1015]/85 backdrop-blur-sm flex items-center justify-center p-6 pointer-events-none">
          <div className="rounded-2xl border-2 border-dashed border-[#6E96FF] bg-[#151A28] px-10 py-12 text-center space-y-2">
            <ImagePlus className="w-10 h-10 text-[#7FA6FF] mx-auto" />
            <p className="text-base font-bold text-white">Drop Roblox Screenshots Here</p>
            <p className="text-xs text-[#9BA3B8]">Supports PNG, JPG, and WebP up to 15 MB</p>
          </div>
        </div>
      )}

      {/* Header + Real Capture Controls */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-white">Captures</h1>
          <p className="text-xs text-[#8B94AB]">
            Capture your screen or Roblox window, snapshot active instances, or drop screenshots
            from your Pictures/Roblox folder
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleScreenCapture()}
            disabled={capturingScreen}
            className="h-9 px-3.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors"
          >
            {capturingScreen ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Monitor className="w-3.5 h-3.5" />
            )}
            Capture Screen / Window
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFiles}
            className="h-9 px-3.5 rounded-lg bg-[#1C2130] hover:bg-[#252C40] border border-white/[0.09] text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors"
          >
            {uploadingFiles ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ImagePlus className="w-3.5 h-3.5" />
            )}
            Upload Screenshot
          </button>

          {runningInstances.length > 0 && (
            <div className="flex items-center gap-1.5">
              {runningInstances.length > 1 && (
                <select
                  aria-label="Choose instance to snapshot"
                  value={targetInstance?.id ?? ''}
                  onChange={(e) => setSelectedInstanceId(e.target.value)}
                  className="h-9 px-2.5 rounded-lg bg-[#171A24] border border-white/[0.08] text-xs text-white max-w-[170px]"
                >
                  {runningInstances.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.gameTitle} (@{inst.accountUsername})
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                onClick={() => void handleSnapshotClick()}
                disabled={capturingInstance || !targetInstance}
                className="h-9 px-3.5 rounded-lg bg-white text-[#0E1015] hover:bg-[#E5ECFF] disabled:opacity-50 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors"
              >
                {capturingInstance ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5" />
                )}
                Snapshot Instance
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search & Game Filter Row */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center h-9 px-3 rounded-lg bg-[#171A23] border border-white/[0.08] focus-within:border-[#6E96FF]/60 gap-2 w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-[#747E96] shrink-0" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search captures by title or game..."
            aria-label="Search captures"
            className="w-full bg-transparent text-xs text-white placeholder:text-[#667085] focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear capture search"
              className="text-[#747E96] hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {gameFilters.map((gName) => {
            const active = selectedGameFilter === gName;
            return (
              <button
                key={gName}
                type="button"
                onClick={() => setSelectedGameFilter(gName)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
                  active
                    ? 'bg-[#262B3B] text-white border-white/[0.15]'
                    : 'bg-[#161923] text-[#8B94AB] border-white/[0.06] hover:text-white'
                }`}
              >
                {gName}
              </button>
            );
          })}
        </div>

        <span className="ml-auto text-xs text-[#7E879E] font-mono-tabular">
          {filteredCaptures.length} {filteredCaptures.length === 1 ? 'capture' : 'captures'}
        </span>
      </div>

      {/* Captures Grid */}
      {filteredCaptures.length === 0 ? (
        <div className="rounded-2xl bg-[#151822] border border-dashed border-white/[0.12] p-12 text-center space-y-3">
          <Camera className="w-8 h-8 text-[#7FA6FF] mx-auto opacity-75" />
          <div>
            <p className="text-sm font-semibold text-white">
              {captures.length === 0 ? 'No captures saved yet' : 'No captures match your filter'}
            </p>
            <p className="text-xs text-[#7E879E] mt-1">
              {captures.length === 0
                ? 'Capture your Roblox window, snapshot a running instance, or drag & drop PNG/JPG files here.'
                : 'Try clearing your search or selecting "All" games.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1">
            {captures.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedGameFilter('All');
                }}
                className="px-3.5 py-2 rounded-lg bg-[#232839] hover:bg-[#2C3348] text-xs font-medium text-white"
              >
                Reset Filters
              </button>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 rounded-lg bg-white text-[#0E1015] hover:bg-[#E5ECFF] text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <ImagePlus className="w-3.5 h-3.5" />
                Upload Screenshot
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 pb-6">
          {filteredCaptures.map((cap) => (
            <article
              key={cap.id}
              className="rounded-2xl bg-[#161923] border border-white/[0.07] hover:border-white/[0.16] overflow-hidden group transition-colors flex flex-col"
            >
              <div
                onClick={() => openLightbox(cap)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openLightbox(cap);
                  }
                }}
                className="relative aspect-video bg-[#0F121A] overflow-hidden cursor-pointer"
              >
                <img
                  src={cap.thumbnail}
                  alt={cap.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <span className="px-3 py-1.5 rounded-lg bg-black/75 border border-white/15 text-xs font-semibold text-white inline-flex items-center gap-1.5">
                    <Maximize2 className="w-3.5 h-3.5" />
                    Inspect
                  </span>
                </div>
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 border border-white/10 text-[10px] font-medium text-[#DCE4F7]">
                  {sourceBadgeLabel(cap.source)}
                </span>
                <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 border border-white/10 text-[10px] font-mono-tabular text-[#4ADE80]">
                  {cap.fpsAtCapture} · {cap.resolution}
                </span>
              </div>

              <div className="p-3.5 flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => openLightbox(cap)}
                  className="min-w-0 text-left flex-1"
                >
                  <h2 className="text-sm font-semibold text-white truncate hover:text-[#9EC0FF] transition-colors">
                    {cap.title}
                  </h2>
                  <p className="text-xs text-[#8B94AB] truncate mt-0.5">
                    {cap.gameTitle} · @{cap.accountUsername}
                  </p>
                  <p className="text-[11px] text-[#667085] mt-0.5">{cap.capturedAt}</p>
                </button>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => void downloadCaptureFile(cap)}
                    aria-label={`Download ${cap.title}`}
                    title="Download image"
                    className="p-1.5 rounded-lg text-[#8B94AB] hover:text-white hover:bg-white/[0.06]"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteCapture(cap.id)}
                    aria-label={`Delete capture ${cap.title}`}
                    title="Delete capture"
                    className="p-1.5 rounded-lg text-[#7E879E] hover:text-[#F87171] hover:bg-white/[0.06]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Full-Screen Capture Lightbox Viewer */}
      {activeLightboxCapture && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Viewing capture ${activeLightboxCapture.title}`}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl max-h-[92vh] rounded-2xl bg-[#141722] border border-white/[0.12] shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Lightbox Header */}
            <div className="px-5 py-3.5 border-b border-white/[0.08] flex items-center justify-between gap-3">
              {editingTitle ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSaveRename(activeLightboxCapture);
                  }}
                  className="flex items-center gap-2 flex-1 min-w-0"
                >
                  <input
                    type="text"
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    aria-label="Edit capture title"
                    autoFocus
                    className="flex-1 h-8 px-2.5 rounded-lg bg-[#0D1018] border border-[#6E96FF]/60 text-sm text-white focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="h-8 px-3 rounded-lg bg-white text-[#0E1015] text-xs font-semibold"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingTitle(false)}
                    className="h-8 px-2.5 rounded-lg bg-[#1F2433] text-xs text-[#9BA3B8]"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2 min-w-0">
                  <h2 className="text-sm sm:text-base font-bold text-white truncate">
                    {activeLightboxCapture.title}
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setTitleDraft(activeLightboxCapture.title);
                      setEditingTitle(true);
                    }}
                    aria-label="Rename capture"
                    title="Rename capture"
                    className="p-1 rounded-md text-[#8B94AB] hover:text-white hover:bg-white/[0.07]"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setLightboxId(null)}
                aria-label="Close capture viewer"
                className="p-1.5 rounded-lg text-[#8B94AB] hover:text-white hover:bg-white/[0.08]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Lightbox Image Stage */}
            <div className="relative bg-[#0B0D14] flex items-center justify-center flex-1 min-h-[260px] max-h-[62vh] overflow-hidden">
              <img
                src={activeLightboxCapture.thumbnail}
                alt={activeLightboxCapture.title}
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[62vh] object-contain"
              />
              {filteredCaptures.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const prevIdx =
                        (lightboxIndex - 1 + filteredCaptures.length) % filteredCaptures.length;
                      openLightbox(filteredCaptures[prevIdx]);
                    }}
                    aria-label="Previous capture"
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/70 hover:bg-black text-white border border-white/15 flex items-center justify-center"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const nextIdx = (lightboxIndex + 1) % filteredCaptures.length;
                      openLightbox(filteredCaptures[nextIdx]);
                    }}
                    aria-label="Next capture"
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/70 hover:bg-black text-white border border-white/15 flex items-center justify-center"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* Lightbox Footer Metadata & Actions */}
            <div className="px-5 py-3.5 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#9BA3B8]">
                <span className="font-semibold text-white">{activeLightboxCapture.gameTitle}</span>
                <span>@{activeLightboxCapture.accountUsername}</span>
                <span className="font-mono-tabular text-[#4ADE80]">
                  {activeLightboxCapture.fpsAtCapture} · {activeLightboxCapture.resolution}
                </span>
                <span className="text-[#6E778E]">{activeLightboxCapture.capturedAt}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleCopy(activeLightboxCapture)}
                  className="h-8 px-3 rounded-lg bg-[#1E2333] hover:bg-[#272E42] border border-white/[0.08] text-xs font-medium text-white inline-flex items-center gap-1.5"
                >
                  {copiedId === activeLightboxCapture.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#4ADE80]" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Image
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => void downloadCaptureFile(activeLightboxCapture)}
                  className="h-8 px-3 rounded-lg bg-white text-[#0E1015] hover:bg-[#E5ECFF] text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const idToDelete = activeLightboxCapture.id;
                    setLightboxId(null);
                    onDeleteCapture(idToDelete);
                    onNotify('Capture deleted');
                  }}
                  className="h-8 px-3 rounded-lg bg-[#3A1A21] hover:bg-[#4F212C] border border-[#EF4444]/30 text-xs font-medium text-[#FCA5A5] inline-flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ==================== SETTINGS VIEW ==================== */
const FPS_OPTIONS: Array<number | 'unlimited'> = ['unlimited', 360, 240, 144, 120, 60];

export function SettingsView({
  settings,
  onUpdateSettings,
}: {
  settings: ClientSettings;
  onUpdateSettings: (patch: Partial<ClientSettings>) => void;
}) {
  const perf = calculatePerformanceProfile(settings.fpsCap, settings.hardwareAcceleration);

  return (
    <div className="h-full overflow-y-auto px-5 py-4 space-y-5 max-w-4xl">
      <div>
        <h1 className="text-lg font-bold text-white">Client Settings &amp; FastFlags</h1>
        <p className="text-xs text-[#8B94AB]">
          Configure uncapped FPS, graphics pipeline, isolated profiles, and Second-Screen HUD modules
        </p>
      </div>

      {/* Performance & FPS Uncap */}
      <section className="rounded-2xl bg-[#151822] border border-white/[0.08] p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-[#4ADE80]" />
            <h2 className="text-sm font-semibold text-white">Frame Rate &amp; Rendering</h2>
          </div>
          <span className="font-mono-tabular text-xs font-semibold text-[#4ADE80]">
            Target: {perf.badgeText} FPS · ~{perf.frameTimeMs}ms pacing
          </span>
        </div>

        <div className="space-y-2">
          <span className="text-xs text-[#A8B1C7] block">FPS Cap</span>
          <div className="flex flex-wrap gap-2">
            {FPS_OPTIONS.map((cap) => {
              const active = settings.fpsCap === cap;
              return (
                <button
                  key={String(cap)}
                  type="button"
                  onClick={() => onUpdateSettings({ fpsCap: cap })}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold font-mono-tabular transition-colors border ${
                    active
                      ? 'bg-white text-[#0E1015] border-white'
                      : 'bg-[#1B1F2C] text-[#B8C0D6] border-white/[0.07] hover:text-white'
                  }`}
                >
                  {cap === 'unlimited' ? '∞ Uncapped' : `${cap} FPS`}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="space-y-1.5">
            <label htmlFor="set-renderer" className="text-xs text-[#A8B1C7]">
              Graphics Renderer (FastFlag)
            </label>
            <select
              id="set-renderer"
              value={settings.renderer}
              onChange={(e) =>
                onUpdateSettings({ renderer: e.target.value as ClientSettings['renderer'] })
              }
              className="w-full h-9 px-3 rounded-lg bg-[#1C202D] border border-white/[0.08] text-xs text-white"
            >
              <option value="Vulkan">Vulkan (Lowest Frame Time)</option>
              <option value="Direct3D 11">Direct3D 11</option>
              <option value="Metal">Metal (macOS Apple Silicon)</option>
              <option value="OpenGL">OpenGL</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="set-lighting" className="text-xs text-[#A8B1C7]">
              Lighting Engine Override
            </label>
            <select
              id="set-lighting"
              value={settings.lightingEngine}
              onChange={(e) =>
                onUpdateSettings({
                  lightingEngine: e.target.value as ClientSettings['lightingEngine'],
                })
              }
              className="w-full h-9 px-3 rounded-lg bg-[#1C202D] border border-white/[0.08] text-xs text-white"
            >
              <option value="Future">Future (High Fidelity)</option>
              <option value="ShadowMap">ShadowMap (Balanced)</option>
              <option value="Voxel">Voxel (Max FPS)</option>
              <option value="Compatibility">Compatibility</option>
            </select>
          </div>
        </div>
      </section>

      {/* Switches */}
      <section className="rounded-2xl bg-[#151822] border border-white/[0.08] p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Sliders className="w-4 h-4 text-[#7FA6FF]" />
          <h2 className="text-sm font-semibold text-white">Engine, Isolation &amp; HUD</h2>
        </div>

        {(
          [
            {
              key: 'hardwareAcceleration',
              label: 'Hardware GPU Acceleration',
              desc: 'Offload Roblox rendering & launcher UI compositing directly to your GPU.',
            },
            {
              key: 'isolatedStoragePerAccount',
              label: 'Strict Multi-Account Storage Isolation',
              desc: 'Assign separate cookies, LocalStorage, and temp directories per Roblox account.',
            },
            {
              key: 'secondScreenHudEnabled',
              label: 'Live Second-Screen HUD',
              desc: 'Keep real-time FPS, server ping, and active macros visible on a second display.',
            },
            {
              key: 'discordRichPresence',
              label: 'Discord Rich Presence',
              desc: 'Show your current Roblox experience, party size, and direct join link on Discord.',
            },
            {
              key: 'lowLatencyNetwork',
              label: 'Low-Latency Packet Pacing',
              desc: 'Prioritize Roblox UDP game traffic and pick lowest-RTT region servers automatically.',
            },
            {
              key: 'disableTelemetry',
              label: 'Disable Crash Analytics & Telemetry',
              desc: 'Strip background telemetry threads for cleaner frame pacing.',
            },
          ] as const
        ).map((item) => {
          const checked = settings[item.key];
          return (
            <div
              key={item.key}
              className="flex items-center justify-between gap-4 py-2.5 border-b border-white/[0.05] last:border-b-0"
            >
              <div>
                <p className="text-xs font-semibold text-white">{item.label}</p>
                <p className="text-[11px] text-[#7E879E] mt-0.5">{item.desc}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={item.label}
                onClick={() => onUpdateSettings({ [item.key]: !checked })}
                className={`w-10 h-5 rounded-full p-0.5 transition-colors shrink-0 ${
                  checked ? 'bg-[#3B82F6]' : 'bg-[#2A3042]'
                }`}
              >
                <span
                  className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                    checked ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          );
        })}
      </section>

      <div className="flex items-center gap-2 text-xs text-[#6E778E] pb-6">
        <Shield className="w-3.5 h-3.5" />
        <span>Lunar for Roblox · All settings saved locally for Windows &amp; macOS profiles.</span>
        <Check className="w-3.5 h-3.5 text-[#4ADE80] ml-auto" />
        <Users className="w-3.5 h-3.5" />
      </div>
    </div>
  );
}
