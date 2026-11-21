import React, { useEffect, useMemo, useState } from 'react';
import {
  INITIAL_ACCOUNTS,
  INITIAL_CAPTURES,
  INITIAL_CATALOG_ITEMS,
  INITIAL_CHAT_THREADS,
  INITIAL_COMMUNITIES,
  INITIAL_FRIEND_REQUESTS,
  INITIAL_GAMES,
  INITIAL_MACROS,
  INITIAL_PLAYERS,
  INITIAL_RUNNING_INSTANCES,
  INITIAL_SAVED_OUTFITS,
  INITIAL_SETTINGS,
  INITIAL_TRADES,
} from './data/seedData';
import type {
  CaptureItem,
  CatalogItem,
  ChatThread,
  ClientSettings,
  CommunityGroup,
  FriendRequest,
  GameServer,
  MacroPreset,
  NavSection,
  RobloxAccount,
  RobloxGame,
  RobloxPlayer,
  RunningInstance,
  SavedOutfit,
  TradeOffer,
} from './types/lunar';
import { calculatePerformanceProfile, checkInstanceLaunch } from './utils/clientLogic';
import {
  buildRobloxLaunchUri,
  sanitizeCaptureImageUrl,
  sanitizeCaptureTitle,
} from './utils/robloxApiHelpers';
import { composeInstanceSnapshot } from './utils/captureUtils';
import {
  fetchLiveRobloxGames,
  fetchLiveRobloxGroups,
  fetchLiveRobloxPresence,
  logoutRobloxSession,
  resolveLiveRobloxAccount,
  resolveRobloxFriendsBatch,
  type ResolvedRobloxAccountPayload,
} from './services/robloxClient';
import { TopBar } from './components/TopBar';
import { LeftRail } from './components/LeftRail';
import { LaunchpadView } from './components/views/LaunchpadView';
import { MarketplaceView } from './components/views/MarketplaceView';
import { PlayersView } from './components/views/PlayersView';
import { DiscoveryView } from './components/views/DiscoveryView';
import { InstancesView } from './components/views/InstancesView';
import { MacrosView } from './components/views/MacrosView';
import {
  CapturesView,
  CommunitiesView,
  MessagesView,
  SettingsView,
} from './components/views/SecondaryViews';
import {
  LunarWebsitePreviewModal,
  QuickSearchModal,
  SecondScreenHudModal,
} from './components/overlays/ClientOverlays';
import { AccountConnectModal } from './components/overlays/AccountConnectModal';

const STORAGE_ACCOUNTS_KEY = 'lunar_roblox_accounts_v2';
const STORAGE_ACTIVE_ACC_KEY = 'lunar_roblox_active_account_v2';
const STORAGE_PLAYERS_KEY = 'lunar_roblox_friends_v1';
const STORAGE_CAPTURES_KEY = 'lunar_roblox_captures_v1';

function loadInitialAccounts(): RobloxAccount[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_ACCOUNTS_KEY);
    if (!raw) return INITIAL_ACCOUNTS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as RobloxAccount[];
    }
  } catch {
    // Ignore storage read errors
  }
  return INITIAL_ACCOUNTS;
}

function loadInitialActiveAccountId(loaded: RobloxAccount[]): string {
  try {
    const saved = window.localStorage.getItem(STORAGE_ACTIVE_ACC_KEY);
    if (saved && loaded.some((a) => a.id === saved)) return saved;
  } catch {
    // Ignore storage read errors
  }
  return loaded[0]?.id ?? INITIAL_ACCOUNTS[0].id;
}

function loadInitialPlayers(): RobloxPlayer[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_PLAYERS_KEY);
    if (!raw) return INITIAL_PLAYERS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as RobloxPlayer[];
    }
  } catch {
    // Ignore storage read errors
  }
  return INITIAL_PLAYERS;
}

function loadInitialCaptures(): CaptureItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_CAPTURES_KEY);
    if (!raw) return INITIAL_CAPTURES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return (parsed as CaptureItem[])
        .filter((c) => c && typeof c.id === 'string' && sanitizeCaptureImageUrl(c.thumbnail))
        .map((c) => ({
          ...c,
          title: sanitizeCaptureTitle(c.title),
          thumbnail: sanitizeCaptureImageUrl(c.thumbnail)!,
        }));
    }
  } catch {
    // Ignore storage read errors
  }
  return INITIAL_CAPTURES;
}

export default function App() {
  // Navigation history stack so TopBar ← and → actually work
  const [history, setHistory] = useState<NavSection[]>(['launchpad']);
  const [historyIdx, setHistoryIdx] = useState(0);
  const activeSection = history[historyIdx];

  // Core client state
  const [accounts, setAccounts] = useState<RobloxAccount[]>(loadInitialAccounts);
  const [activeAccountId, setActiveAccountId] = useState<string>(() =>
    loadInitialActiveAccountId(loadInitialAccounts()),
  );
  const [connectAccountOpen, setConnectAccountOpen] = useState(false);
  // Ephemeral in-memory Bearer tokens for authenticated Roblox sessions (never stored in localStorage)
  const [sessionTokens, setSessionTokens] = useState<Record<string, string>>({});
  const [games, setGames] = useState<RobloxGame[]>(INITIAL_GAMES);
  const [selectedDiscoveryGame, setSelectedDiscoveryGame] = useState<RobloxGame | null>(null);
  const [players, setPlayers] = useState<RobloxPlayer[]>(loadInitialPlayers);
  const [playersInitialTab, setPlayersInitialTab] = useState<'all' | 'friends'>('all');
  const [refreshingPresence, setRefreshingPresence] = useState(false);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>(INITIAL_FRIEND_REQUESTS);
  const [catalog, setCatalog] = useState<CatalogItem[]>(INITIAL_CATALOG_ITEMS);
  const [cartItemIds, setCartItemIds] = useState<string[]>([
    'cat-silly-fun',
    'cat-john',
    'cat-man-face',
    'cat-knit-sweater',
    'cat-roblox-cap',
    'cat-orange-beanie',
  ]);
  const [equipped, setEquipped] = useState<Partial<Record<CatalogItem['equipSlot'], string>>>({
    face: 'cat-silly-fun',
    hat: 'cat-roblox-cap',
    shirt: 'cat-knit-sweater',
  });
  const [savedOutfits, setSavedOutfits] = useState<SavedOutfit[]>(INITIAL_SAVED_OUTFITS);
  const [trades, setTrades] = useState<TradeOffer[]>(INITIAL_TRADES);
  const [runningInstances, setRunningInstances] = useState<RunningInstance[]>(
    INITIAL_RUNNING_INSTANCES,
  );
  const [macros, setMacros] = useState<MacroPreset[]>(INITIAL_MACROS);
  const [captures, setCaptures] = useState<CaptureItem[]>(loadInitialCaptures);
  const [chatThreads, setChatThreads] = useState<ChatThread[]>(INITIAL_CHAT_THREADS);
  const [activeThreadId, setActiveThreadId] = useState<string>(INITIAL_CHAT_THREADS[0].id);
  const [communities, setCommunities] = useState<CommunityGroup[]>(INITIAL_COMMUNITIES);
  const [settings, setSettings] = useState<ClientSettings>(INITIAL_SETTINGS);
  const [unreadNotifications, setUnreadNotifications] = useState(2);

  // Overlays & toast feedback
  const [hudOpen, setHudOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [landingPreviewOpen, setLandingPreviewOpen] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('view') === 'landing';
  });
  const [toast, setToast] = useState<string | null>(null);

  const activeAccount = useMemo(
    () => accounts.find((a) => a.id === activeAccountId) ?? accounts[0],
    [accounts, activeAccountId],
  );

  const perfProfile = useMemo(
    () => calculatePerformanceProfile(settings.fpsCap, settings.hardwareAcceleration),
    [settings.fpsCap, settings.hardwareAcceleration],
  );

  const showToast = (msg: string) => {
    setToast(msg);
  };

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  // Persist linked accounts & active selection
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_ACCOUNTS_KEY, JSON.stringify(accounts));
      window.localStorage.setItem(STORAGE_ACTIVE_ACC_KEY, activeAccountId);
    } catch {
      // Ignore quota errors
    }
  }, [accounts, activeAccountId]);

  // Persist friends & players list
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_PLAYERS_KEY, JSON.stringify(players));
    } catch {
      // Ignore quota errors
    }
  }, [players]);

  // Persist captures with graceful quota handling for large data URLs
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_CAPTURES_KEY, JSON.stringify(captures));
    } catch {
      try {
        // Keep newest 8 captures if storage quota is tight
        window.localStorage.setItem(STORAGE_CAPTURES_KEY, JSON.stringify(captures.slice(0, 8)));
      } catch {
        // Ignore storage errors if full
      }
    }
  }, [captures]);

  // Refresh live Roblox presence for all friends that have a real robloxUserId
  const refreshFriendsPresence = async (silent = false) => {
    const realFriendIds = players
      .filter((p) => p.isFriend && typeof p.robloxUserId === 'number')
      .map((p) => p.robloxUserId as number);

    if (realFriendIds.length === 0) {
      if (!silent) showToast('Add real Roblox friends by @username to poll live online presence.');
      return;
    }

    setRefreshingPresence(true);
    try {
      const presenceMap = await fetchLiveRobloxPresence(realFriendIds);
      setPlayers((prev) =>
        prev.map((p) => {
          if (!p.robloxUserId) return p;
          const live = presenceMap[String(p.robloxUserId)];
          if (!live) return p;
          return {
            ...p,
            status: live.status,
            presenceLabel: live.presenceLabel,
            currentGameId: live.universeId ? `rbx-${live.universeId}` : undefined,
            currentGameTitle:
              live.status === 'in-game' ? live.lastLocation || 'Roblox Experience' : undefined,
            currentPlaceId: live.placeId,
            currentUniverseId: live.universeId,
            currentGameInstanceId: live.gameId,
          };
        }),
      );
      if (!silent) {
        const onlineCount = Object.values(presenceMap).filter((v) => v.status !== 'offline').length;
        showToast(
          `Synced live Roblox status for ${realFriendIds.length} friend${realFriendIds.length === 1 ? '' : 's'} (${onlineCount} online)`,
        );
      }
    } catch {
      if (!silent) showToast('Unable to refresh live Roblox presence right now.');
    } finally {
      setRefreshingPresence(false);
    }
  };

  // Auto-poll live presence on mount and every 45s for real Roblox friends
  const realFriendIdKey = useMemo(
    () =>
      players
        .filter((p) => p.isFriend && p.robloxUserId)
        .map((p) => p.robloxUserId)
        .sort()
        .join(','),
    [players],
  );

  useEffect(() => {
    if (!realFriendIdKey) return;
    void refreshFriendsPresence(true);
    const timer = window.setInterval(() => {
      void refreshFriendsPresence(true);
    }, 45_000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realFriendIdKey]);

  const applyAccountSyncPayload = (
    payload: ResolvedRobloxAccountPayload,
    authMode: RobloxAccount['authMode'] = 'roblox-linked',
    silent = false,
    sessionToken?: string,
  ) => {
    if (sessionToken) {
      setSessionTokens((prev) => ({ ...prev, [payload.account.id]: sessionToken }));
    }

    setAccounts((prev) => {
      const hadRealBefore = prev.some((a) => Boolean(a.robloxUserId));
      const existingIdx = prev.findIndex((a) => a.id === payload.account.id);
      const preservedMode: RobloxAccount['authMode'] =
        authMode === 'roblox-authenticated'
          ? 'roblox-authenticated'
          : existingIdx >= 0 && prev[existingIdx].authMode === 'roblox-authenticated'
            ? 'roblox-authenticated'
            : existingIdx >= 0 && prev[existingIdx].authMode === 'roblox-verified'
              ? 'roblox-verified'
              : authMode;
      const linkedAccount: RobloxAccount = {
        ...payload.account,
        authMode: preservedMode,
      };
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = linkedAccount;
        return next;
      }
      // Replace premade demo accounts when the user links their first real Roblox account
      if (!hadRealBefore) {
        return [linkedAccount];
      }
      return [linkedAccount, ...prev];
    });
    setActiveAccountId(payload.account.id);

    // Sync real favorited Roblox experiences into Launchpad Favorites if public
    if (payload.favoriteGames.length > 0) {
      setGames((prev) => {
        const byId = new Map<string, RobloxGame>();
        for (const g of prev) {
          byId.set(g.id, { ...g, isFavorite: false });
        }
        for (const fav of payload.favoriteGames) {
          const existing = byId.get(fav.id);
          byId.set(fav.id, {
            ...fav,
            isContinue: existing?.isContinue ?? false,
            isFavorite: true,
            isPartnered: existing?.isPartnered ?? false,
            servers: existing?.servers ?? [],
          });
        }
        return Array.from(byId.values());
      });
    }

    // Sync real joined Roblox groups into Communities
    if (payload.groups.length > 0) {
      setCommunities(payload.groups);
    }

    // Sync real authenticated Roblox friends & incoming friend requests if returned
    if (payload.friends && payload.friends.length > 0) {
      setPlayers(payload.friends);
    }
    if (payload.friendRequests) {
      setFriendRequests(payload.friendRequests);
    }

    if (!silent) {
      const notes: string[] = [];
      if (payload.friends && payload.friends.length > 0) {
        notes.push(`${payload.friends.length} friends`);
      }
      if (payload.favoriteGames.length > 0) {
        notes.push(`${payload.favoriteGames.length} favorites`);
      }
      if (payload.groups.length > 0) {
        notes.push(`${payload.groups.length} groups`);
      }
      const suffix = notes.length > 0 ? ` · ${notes.join(' · ')}` : '';
      showToast(`Signed in as @${payload.account.username}${suffix}`);
    }
  };

  // Hydrate Launchpad/Discovery Games & Communities live from Roblox APIs on startup
  useEffect(() => {
    let cancelled = false;
    fetchLiveRobloxGames()
      .then((liveGames) => {
        if (cancelled || liveGames.length === 0) return;
        setGames((prev) => {
          const partneredFallback = prev.find((g) => g.isPartnered);
          const hydrated = liveGames.map((lg, idx) => ({
            ...lg,
            thumbnail: lg.thumbnail || prev[idx % prev.length]?.thumbnail || '',
            servers: prev[idx % prev.length]?.servers ?? [],
          }));
          if (partneredFallback && !hydrated.some((g) => g.isPartnered)) {
            hydrated.push(partneredFallback);
          }
          return hydrated;
        });
      })
      .catch(() => {
        // Keep seed fallback cleanly if Roblox API is temporarily unreachable
      });

    // If user previously linked a real Roblox account, refresh their profile, favorites & groups automatically
    const initialAcc = loadInitialAccounts().find(
      (a) => a.id === loadInitialActiveAccountId(loadInitialAccounts()),
    );
    if (initialAcc?.robloxUserId) {
      resolveLiveRobloxAccount(String(initialAcc.robloxUserId))
        .then((payload) => {
          if (!cancelled) {
            applyAccountSyncPayload(
              payload,
              initialAcc.authMode === 'roblox-verified' ? 'roblox-verified' : 'roblox-linked',
              true,
            );
          }
        })
        .catch(() => {});
    } else {
      fetchLiveRobloxGroups('Roblox')
        .then((liveGroups) => {
          if (cancelled || liveGroups.length === 0) return;
          setCommunities(liveGroups);
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, []);

  // Subtle live FPS telemetry fluctuation for active instances (every 2.2s)
  useEffect(() => {
    const interval = window.setInterval(() => {
      setRunningInstances((prev) =>
        prev.map((inst) => {
          if (inst.status !== 'running') return inst;
          const cap = inst.fpsTarget === 'unlimited' ? settings.fpsCap : inst.fpsTarget;
          const base =
            cap === 'unlimited'
              ? perfProfile.estimatedFps
              : Math.min(perfProfile.estimatedFps, cap);
          const jitter = cap === 'unlimited' ? Math.floor(Math.random() * 14) - 6 : Math.floor(Math.random() * 3) - 1;
          return {
            ...inst,
            liveFps: Math.max(30, base + jitter),
          };
        }),
      );
    }, 2200);
    return () => window.clearInterval(interval);
  }, [settings.fpsCap, perfProfile.estimatedFps]);

  // Keyboard shortcut Ctrl+K / Cmd+K for quick search
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
      } else if (e.key === 'Escape') {
        setSearchOpen(false);
        setHudOpen(false);
        setConnectAccountOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const navigateTo = (section: NavSection) => {
    if (section === activeSection) return;
    const nextHistory = history.slice(0, historyIdx + 1);
    nextHistory.push(section);
    setHistory(nextHistory);
    setHistoryIdx(nextHistory.length - 1);
  };

  const handleGoBack = () => {
    if (historyIdx > 0) setHistoryIdx((i) => i - 1);
  };

  const handleGoForward = () => {
    if (historyIdx < history.length - 1) setHistoryIdx((i) => i + 1);
  };

  /* ==================== INSTANCE ACTIONS ==================== */
  const handleLaunchGame = (
    game: RobloxGame,
    server?: GameServer,
    accountIdOverride?: string,
  ) => {
    const targetAccount =
      accounts.find((a) => a.id === (accountIdOverride ?? activeAccount.id)) ?? activeAccount;

    const check = checkInstanceLaunch(runningInstances, targetAccount.id, game.id);
    if (!check.allowed) {
      showToast(check.reason ?? 'Instance already running on this account.');
      return;
    }

    const chosenServer = server ?? game.servers[0];
    const newInst: RunningInstance = {
      id: `inst-${Date.now()}`,
      pid: 42000 + Math.floor(Math.random() * 25000),
      accountId: targetAccount.id,
      accountUsername: targetAccount.username,
      gameId: game.id,
      gameTitle: game.title,
      gameThumbnail: game.thumbnail,
      gameBanner: game.bannerImage,
      serverRegion: chosenServer?.region ?? 'US-East (Ashburn)',
      pingMs: chosenServer?.pingMs ?? 24,
      fpsTarget: settings.fpsCap,
      liveFps: perfProfile.estimatedFps,
      memoryMb: 520 + Math.floor(Math.random() * 190),
      startedAt: Date.now(),
      status: 'running',
      windowMode: 'Borderless',
    };

    setRunningInstances((prev) => [newInst, ...prev]);
    setGames((prev) =>
      prev.map((g) => (g.id === game.id ? { ...g, isContinue: true } : g)),
    );
    showToast(`Launched ${game.title} as ${targetAccount.username} (${perfProfile.badgeText} FPS)`);
  };

  const handleLaunchIsolated = (
    accountId: string,
    gameId: string,
    windowMode: RunningInstance['windowMode'],
  ) => {
    const game = games.find((g) => g.id === gameId);
    const acc = accounts.find((a) => a.id === accountId);
    if (!game || !acc) return;

    const check = checkInstanceLaunch(runningInstances, acc.id, game.id);
    if (!check.allowed) {
      showToast(check.reason ?? 'Switch account to spawn a second isolated container.');
      return;
    }

    const srv = game.servers[0];
    const inst: RunningInstance = {
      id: `inst-${Date.now()}`,
      pid: 45000 + Math.floor(Math.random() * 30000),
      accountId: acc.id,
      accountUsername: acc.username,
      gameId: game.id,
      gameTitle: game.title,
      gameThumbnail: game.thumbnail,
      gameBanner: game.bannerImage,
      serverRegion: srv?.region ?? 'US-East (Ashburn)',
      pingMs: srv?.pingMs ?? 24,
      fpsTarget: settings.fpsCap,
      liveFps: perfProfile.estimatedFps,
      memoryMb: 540 + Math.floor(Math.random() * 160),
      startedAt: Date.now(),
      status: 'running',
      windowMode,
    };

    setRunningInstances((prev) => [inst, ...prev]);
    showToast(`Isolated container #${check.isolatedContainerIndex} started for ${acc.username}`);
  };

  const handleCaptureInstance = async (inst: RunningInstance) => {
    const matchedGame = games.find((g) => g.id === inst.gameId || g.title === inst.gameTitle);
    const preferredImage =
      inst.gameBanner || matchedGame?.bannerImage || inst.gameThumbnail || matchedGame?.thumbnail || '';
    const composed = await composeInstanceSnapshot(inst, preferredImage);

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const newCapture: CaptureItem = {
      id: `cap-${Date.now()}`,
      title: `${inst.gameTitle} Snapshot`,
      gameTitle: inst.gameTitle,
      thumbnail: composed.thumbnail,
      capturedAt: `Just now · ${hh}:${mm}`,
      resolution: composed.resolution,
      fpsAtCapture: `${inst.liveFps} FPS`,
      accountUsername: inst.accountUsername,
      source: 'instance',
    };
    setCaptures((prev) => [newCapture, ...prev]);
    showToast(`Saved ${composed.resolution} snapshot of ${inst.gameTitle} to Captures`);
  };

  /* ==================== PLAYERS & FRIENDS ACTIONS ==================== */
  const handleAddRobloxFriends = async (
    identifiers: string,
  ): Promise<{ added: number; error?: string }> => {
    try {
      const { friends: resolved, notFound } = await resolveRobloxFriendsBatch(identifiers);
      if (resolved.length === 0) {
        const error =
          notFound.length > 0
            ? `Could not find Roblox user(s): ${notFound.join(', ')}`
            : 'No matching Roblox users found.';
        return { added: 0, error };
      }

      setPlayers((prev) => {
        const byId = new Map(prev.map((p) => [p.id, p]));
        for (const friend of resolved) {
          const existing = byId.get(friend.id);
          byId.set(friend.id, {
            ...(existing ?? friend),
            ...friend,
            isFriend: true,
          });
        }
        return Array.from(byId.values());
      });

      const names = resolved.map((f) => `@${f.username}`).join(', ');
      const suffix = notFound.length > 0 ? ` (not found: ${notFound.join(', ')})` : '';
      showToast(`Added ${names} to Friends${suffix}`);
      return { added: resolved.length };
    } catch (err) {
      return {
        added: 0,
        error: err instanceof Error ? err.message : 'Unable to add Roblox friend right now.',
      };
    }
  };

  const handleClearDemoFriends = () => {
    setPlayers((prev) => prev.filter((p) => Boolean(p.robloxUserId)));
    showToast('Cleared premade demo friends');
  };

  const handleJoinFriend = (friend: RobloxPlayer) => {
    const matchedGame = games.find(
      (g) =>
        (friend.currentGameId && g.id === friend.currentGameId) ||
        (friend.currentUniverseId && g.universeId === friend.currentUniverseId) ||
        (friend.currentPlaceId && g.placeId === friend.currentPlaceId) ||
        (friend.currentGameTitle &&
          g.title.toLowerCase() === friend.currentGameTitle.toLowerCase()),
    );

    if (matchedGame) {
      handleLaunchGame(matchedGame);
      showToast(`Joining ${friend.displayName} in ${matchedGame.title}`);
      return;
    }

    if (friend.currentPlaceId) {
      const launchUri = buildRobloxLaunchUri(friend.currentPlaceId, friend.currentGameInstanceId);
      const adHocGame: RobloxGame = {
        id: friend.currentUniverseId ? `rbx-${friend.currentUniverseId}` : `place-${friend.currentPlaceId}`,
        universeId: friend.currentUniverseId,
        placeId: friend.currentPlaceId,
        title: friend.currentGameTitle || `Place #${friend.currentPlaceId}`,
        creator: 'Roblox Experience',
        thumbnail: games[0]?.thumbnail ?? '',
        genre: 'Simulator',
        playingCount: 1,
        ratingPct: 90,
        visitsLabel: 'Live',
        description: `Joining ${friend.displayName}'s live Roblox server.`,
        servers: [],
        source: 'roblox-live',
      };
      handleLaunchGame(adHocGame);
      showToast(`Joining ${friend.displayName} (${launchUri})`);
      return;
    }

    showToast(`${friend.displayName} is not currently in a joinable server.`);
  };

  const handleAcceptRequest = (reqId: string) => {
    const req = friendRequests.find((r) => r.id === reqId);
    if (!req) return;
    setFriendRequests((prev) => prev.filter((r) => r.id !== reqId));
    setPlayers((prev) => {
      const exists = prev.some((p) => p.id === req.playerId);
      if (exists) {
        return prev.map((p) => (p.id === req.playerId ? { ...p, isFriend: true } : p));
      }
      return [
        {
          id: req.playerId,
          displayName: req.displayName,
          username: req.username,
          avatarStyle: req.avatarStyle,
          avatarBg: '#1d212d',
          status: 'online',
          presenceLabel: 'Online',
          isFriend: true,
          mutualFriends: 4,
          joinedYear: 2021,
        },
        ...prev,
      ];
    });
    showToast(`Accepted friend request from ${req.displayName}`);
  };

  const handleDeclineRequest = (reqId: string) => {
    setFriendRequests((prev) => prev.filter((r) => r.id !== reqId));
    showToast('Friend request declined');
  };

  const handleDeclineAllRequests = () => {
    setFriendRequests([]);
    showToast('Declined all pending friend requests');
  };

  /* ==================== MARKETPLACE ACTIONS ==================== */
  const handleToggleCart = (itemId: string) => {
    setCartItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId],
    );
  };

  const handleCheckoutCart = () => {
    const total = cartItemIds.reduce((sum, id) => {
      const found = catalog.find((c) => c.id === id);
      return sum + (found?.price ?? 0);
    }, 0);

    if (total > activeAccount.robux) {
      showToast('Insufficient Robux for this batch purchase.');
      return;
    }

    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === activeAccount.id ? { ...acc, robux: acc.robux - total } : acc,
      ),
    );
    const count = cartItemIds.length;
    setCartItemIds([]);
    showToast(`Purchased ${count} catalog items for R$ ${total.toLocaleString()}`);
  };

  const handleEquipItem = (item: CatalogItem) => {
    setEquipped((prev) => ({
      ...prev,
      [item.equipSlot]: prev[item.equipSlot] === item.id ? undefined : item.id,
    }));
  };

  const handleSaveOutfit = (name: string) => {
    const created: SavedOutfit = {
      id: `out-${Date.now()}`,
      name,
      createdAt: 'Just now',
      equipped: { ...equipped },
    };
    setSavedOutfits((prev) => [created, ...prev]);
    showToast(`Saved outfit "${name}"`);
  };

  const handleRespondTrade = (tradeId: string, decision: 'accept' | 'decline') => {
    setTrades((prev) =>
      decision === 'decline'
        ? prev.filter((t) => t.id !== tradeId)
        : prev.map((t) => (t.id === tradeId ? { ...t, status: 'Completed' } : t)),
    );
    showToast(decision === 'accept' ? 'Trade completed successfully' : 'Trade offer declined');
  };

  /* ==================== CHAT ACTIONS ==================== */
  const handleMessagePlayer = (player: RobloxPlayer) => {
    const existing = chatThreads.find((t) => t.playerId === player.id);
    if (existing) {
      setChatThreads((prev) =>
        prev.map((t) =>
          t.id === existing.id
            ? {
                ...t,
                avatarUrl: player.avatarUrl ?? t.avatarUrl,
                online: player.status !== 'offline',
              }
            : t,
        ),
      );
      setActiveThreadId(existing.id);
    } else {
      const created: ChatThread = {
        id: `th-${player.id}`,
        playerId: player.id,
        displayName: player.displayName,
        username: player.username,
        avatarStyle: player.avatarStyle,
        avatarUrl: player.avatarUrl,
        online: player.status !== 'offline',
        unread: 0,
        messages: [],
      };
      setChatThreads((prev) => [created, ...prev]);
      setActiveThreadId(created.id);
    }
    navigateTo('messages');
  };

  const handleSendMessage = (threadId: string, text: string) => {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setChatThreads((prev) =>
      prev.map((t) =>
        t.id === threadId
          ? {
              ...t,
              unread: 0,
              messages: [...t.messages, { id: `m-${Date.now()}`, sender: 'me', text, time }],
            }
          : t,
      ),
    );
  };

  const unreadMessagesCount = chatThreads.reduce((sum, t) => sum + t.unread, 0);
  const friendsList = useMemo(() => players.filter((p) => p.isFriend), [players]);

  const breadcrumbSub =
    activeSection === 'players'
      ? 'Search'
      : activeSection === 'instances'
        ? `${runningInstances.length} Active`
        : undefined;

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#0E1015] text-[#F3F5F9]">
      {/* Exact 1:1 Lunar for Roblox Top Bar */}
      <TopBar
        activeSection={activeSection}
        breadcrumbSub={breadcrumbSub}
        canGoBack={historyIdx > 0}
        canGoForward={historyIdx < history.length - 1}
        onGoBack={handleGoBack}
        onGoForward={handleGoForward}
        accounts={accounts}
        activeAccount={activeAccount}
        onSwitchAccount={(id) => {
          setActiveAccountId(id);
          const acc = accounts.find((a) => a.id === id);
          if (acc) showToast(`Switched active sandbox to ${acc.username}`);
        }}
        runningInstances={runningInstances}
        fpsBadgeText={perfProfile.badgeText}
        unreadNotifications={unreadNotifications}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenHud={() => setHudOpen(true)}
        onOpenLandingPreview={() => setLandingPreviewOpen(true)}
        onOpenConnectAccount={() => setConnectAccountOpen(true)}
        onNavigate={navigateTo}
        onClearNotifications={() => setUnreadNotifications(0)}
      />

      {/* Main App Body: Left Icon Rail + Active Workspace */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <LeftRail
          activeSection={activeSection}
          onSelectSection={navigateTo}
          pendingFriendRequests={friendRequests.length}
          unreadMessages={unreadMessagesCount}
          runningInstancesCount={runningInstances.length}
        />

        <main className="flex-1 min-w-0 bg-[#12141B] overflow-hidden relative">
          {activeSection === 'launchpad' && (
            <LaunchpadView
              activeAccount={activeAccount}
              accounts={accounts}
              onSwitchAccount={(id) => setActiveAccountId(id)}
              games={games}
              friends={friendsList}
              runningInstances={runningInstances}
              fpsBadgeText={perfProfile.badgeText}
              refreshingPresence={refreshingPresence}
              onLaunchGame={(game) => handleLaunchGame(game)}
              onJoinFriend={handleJoinFriend}
              onMessageFriend={handleMessagePlayer}
              onAddRobloxFriends={handleAddRobloxFriends}
              onRefreshFriendsPresence={() => refreshFriendsPresence(false)}
              onOpenFriendsTab={() => {
                setPlayersInitialTab('friends');
                navigateTo('players');
              }}
              onSelectGameDetails={(game) => {
                setSelectedDiscoveryGame(game);
                navigateTo('discovery');
              }}
              onToggleFavorite={(gameId) =>
                setGames((prev) =>
                  prev.map((g) => (g.id === gameId ? { ...g, isFavorite: !g.isFavorite } : g)),
                )
              }
              onNavigate={navigateTo}
              onOpenHud={() => setHudOpen(true)}
              onOpenConnectAccount={() => setConnectAccountOpen(true)}
            />
          )}

          {activeSection === 'discovery' && (
            <DiscoveryView
              games={games}
              accounts={accounts}
              activeAccount={activeAccount}
              selectedGame={selectedDiscoveryGame}
              onSelectGame={setSelectedDiscoveryGame}
              onLaunchGame={handleLaunchGame}
              onToggleFavorite={(gameId) =>
                setGames((prev) =>
                  prev.map((g) => (g.id === gameId ? { ...g, isFavorite: !g.isFavorite } : g)),
                )
              }
            />
          )}

          {activeSection === 'players' && (
            <PlayersView
              players={players}
              friendRequests={friendRequests}
              initialTab={playersInitialTab}
              refreshingPresence={refreshingPresence}
              onAcceptRequest={handleAcceptRequest}
              onDeclineRequest={handleDeclineRequest}
              onDeclineAllRequests={handleDeclineAllRequests}
              onToggleFriend={(playerId, livePlayer) =>
                setPlayers((prev) => {
                  const exists = prev.some((p) => p.id === playerId);
                  if (exists) {
                    return prev.map((p) =>
                      p.id === playerId ? { ...p, isFriend: !p.isFriend } : p,
                    );
                  }
                  if (livePlayer) {
                    return [{ ...livePlayer, isFriend: true }, ...prev];
                  }
                  return prev;
                })
              }
              onAddRobloxFriends={handleAddRobloxFriends}
              onRefreshFriendsPresence={() => refreshFriendsPresence(false)}
              onClearDemoFriends={handleClearDemoFriends}
              onJoinFriend={handleJoinFriend}
              onMessagePlayer={handleMessagePlayer}
            />
          )}

          {activeSection === 'communities' && (
            <CommunitiesView
              communities={communities}
              onToggleJoin={(groupId) =>
                setCommunities((prev) =>
                  prev.map((g) =>
                    g.id === groupId
                      ? {
                          ...g,
                          joined: !g.joined,
                          membersCount: g.joined ? g.membersCount - 1 : g.membersCount + 1,
                        }
                      : g,
                  ),
                )
              }
              onSearchGroups={async (q) => {
                try {
                  const results = await fetchLiveRobloxGroups(q);
                  if (results.length > 0) {
                    setCommunities(results);
                    showToast(`Loaded ${results.length} live Roblox groups for "${q}"`);
                  } else {
                    showToast(`No Roblox groups found for "${q}"`);
                  }
                } catch {
                  showToast('Roblox Groups API temporarily unavailable.');
                }
              }}
            />
          )}

          {activeSection === 'marketplace' && (
            <MarketplaceView
              catalog={catalog}
              onRegisterLiveCatalog={(liveItems) => {
                setCatalog((prev) => {
                  const map = new Map(prev.map((i) => [i.id, i]));
                  for (const item of liveItems) map.set(item.id, item);
                  return Array.from(map.values());
                });
              }}
              cartItemIds={cartItemIds}
              onToggleCart={handleToggleCart}
              onCheckoutCart={handleCheckoutCart}
              equipped={equipped}
              onEquipItem={handleEquipItem}
              onResetFittingRoom={() => setEquipped({})}
              savedOutfits={savedOutfits}
              onSaveOutfit={handleSaveOutfit}
              onApplyOutfit={(outfit) => {
                setEquipped({ ...outfit.equipped });
                showToast(`Equipped outfit "${outfit.name}"`);
              }}
              trades={trades}
              onRespondTrade={handleRespondTrade}
              accountRobux={activeAccount.robux}
              activeAccount={activeAccount}
            />
          )}

          {activeSection === 'messages' && (
            <MessagesView
              threads={chatThreads}
              games={games}
              activeThreadId={activeThreadId}
              onSelectThread={(id) => {
                setActiveThreadId(id);
                setChatThreads((prev) =>
                  prev.map((t) => (t.id === id ? { ...t, unread: 0 } : t)),
                );
              }}
              onSendMessage={handleSendMessage}
              onLaunchGame={(game) => handleLaunchGame(game)}
            />
          )}

          {activeSection === 'captures' && (
            <CapturesView
              captures={captures}
              runningInstances={runningInstances}
              activeAccountUsername={activeAccount.username}
              onCaptureInstance={handleCaptureInstance}
              onAddCapture={(newCap) => setCaptures((prev) => [newCap, ...prev])}
              onRenameCapture={(id, nextTitle) =>
                setCaptures((prev) =>
                  prev.map((c) => (c.id === id ? { ...c, title: nextTitle } : c)),
                )
              }
              onDeleteCapture={(id) => setCaptures((prev) => prev.filter((c) => c.id !== id))}
              onNotify={showToast}
            />
          )}

          {activeSection === 'instances' && (
            <InstancesView
              instances={runningInstances}
              accounts={accounts}
              games={games}
              fpsBadgeText={perfProfile.badgeText}
              onLaunchIsolated={handleLaunchIsolated}
              onTogglePauseInstance={(id) =>
                setRunningInstances((prev) =>
                  prev.map((inst) =>
                    inst.id === id
                      ? { ...inst, status: inst.status === 'running' ? 'paused' : 'running' }
                      : inst,
                  ),
                )
              }
              onStopInstance={(id) => {
                setRunningInstances((prev) => prev.filter((inst) => inst.id !== id));
                showToast('Isolated instance stopped');
              }}
              onCaptureInstance={handleCaptureInstance}
              onOpenHud={() => setHudOpen(true)}
              onOpenConnectAccount={() => setConnectAccountOpen(true)}
            />
          )}

          {activeSection === 'macros' && (
            <MacrosView
              macros={macros}
              onToggleMacro={(id) =>
                setMacros((prev) =>
                  prev.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m)),
                )
              }
              onAddMacro={(macro) => {
                setMacros((prev) => [macro, ...prev]);
                showToast(`Added macro "${macro.name}"`);
              }}
              onDeleteMacro={(id) => setMacros((prev) => prev.filter((m) => m.id !== id))}
            />
          )}

          {activeSection === 'settings' && (
            <SettingsView
              settings={settings}
              onUpdateSettings={(patch) => {
                setSettings((prev) => ({ ...prev, ...patch }));
                if (patch.fpsCap !== undefined) {
                  const nextCap = patch.fpsCap;
                  setRunningInstances((prev) =>
                    prev.map((inst) => ({ ...inst, fpsTarget: nextCap })),
                  );
                  showToast(
                    nextCap === 'unlimited'
                      ? 'FPS uncapped (∞ FPS)'
                      : `FPS cap updated to ${nextCap} FPS`,
                  );
                }
              }}
            />
          )}
        </main>
      </div>

      {/* Overlays */}
      <SecondScreenHudModal
        open={hudOpen}
        onClose={() => setHudOpen(false)}
        instances={runningInstances}
        macros={macros}
        fpsBadgeText={perfProfile.badgeText}
        onToggleMacro={(id) =>
          setMacros((prev) => prev.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m)))
        }
        onCaptureInstance={handleCaptureInstance}
        onStopInstance={(id) =>
          setRunningInstances((prev) => prev.filter((inst) => inst.id !== id))
        }
        onOpenInstances={() => navigateTo('instances')}
      />

      <QuickSearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        games={games}
        players={players}
        catalog={catalog}
        onLaunchGame={(game) => handleLaunchGame(game)}
        onNavigate={navigateTo}
      />

      <LunarWebsitePreviewModal
        open={landingPreviewOpen}
        onClose={() => setLandingPreviewOpen(false)}
      />

      <AccountConnectModal
        open={connectAccountOpen}
        onClose={() => setConnectAccountOpen(false)}
        accounts={accounts}
        activeAccountId={activeAccount.id}
        sessionTokens={sessionTokens}
        onAccountLinked={(payload, authMode, sessionToken) => {
          applyAccountSyncPayload(payload, authMode, false, sessionToken);
        }}
        onMarkAccountVerified={(accountId) => {
          setAccounts((prev) =>
            prev.map((a) => (a.id === accountId ? { ...a, authMode: 'roblox-verified' } : a)),
          );
          showToast('Roblox account ownership verified via Bio!');
        }}
        onSwitchAccount={(id) => {
          setActiveAccountId(id);
          const target = accounts.find((a) => a.id === id);
          if (target?.robloxUserId) {
            resolveLiveRobloxAccount(String(target.robloxUserId))
              .then((payload) =>
                applyAccountSyncPayload(
                  payload,
                  target.authMode ?? 'roblox-linked',
                  true,
                ),
              )
              .catch(() => {});
          }
          showToast(`Switched active account to ${target?.displayName ?? 'Roblox Account'}`);
        }}
        onRemoveAccount={(id) => {
          const existingToken = sessionTokens[id];
          if (existingToken) {
            void logoutRobloxSession(existingToken);
            setSessionTokens((prev) => {
              const next = { ...prev };
              delete next[id];
              return next;
            });
          }
          setAccounts((prev) => {
            const target = prev.find((a) => a.id === id);
            const next = prev.filter((a) => a.id !== id);
            if (next.length === 0) {
              if (target?.robloxUserId) {
                setActiveAccountId(INITIAL_ACCOUNTS[0].id);
                return INITIAL_ACCOUNTS;
              }
              return prev;
            }
            if (activeAccountId === id && next[0]) {
              setActiveAccountId(next[0].id);
            }
            return next;
          });
          showToast('Signed out & removed account from launcher');
        }}
        onClearDemoAccounts={() => {
          setAccounts((prev) => {
            const realOnly = prev.filter((a) => Boolean(a.robloxUserId));
            if (realOnly.length === 0) return prev;
            if (!realOnly.some((a) => a.id === activeAccountId)) {
              setActiveAccountId(realOnly[0].id);
            }
            return realOnly;
          });
          showToast('Removed premade demo accounts');
        }}
      />

      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 right-4 z-50 px-4 py-2.5 rounded-xl bg-[#1A1F2E] border border-[#6E96FF]/35 text-xs font-medium text-white shadow-2xl"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
