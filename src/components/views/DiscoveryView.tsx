import React, { useEffect, useMemo, useState } from 'react';
import {
  ExternalLink,
  Heart,
  Loader2,
  Play,
  RefreshCw,
  Search,
  Server,
  ThumbsUp,
  Users,
  Wifi,
  X,
} from 'lucide-react';
import type { GameServer, RobloxAccount, RobloxGame } from '../../types/lunar';
import { formatCompactCount } from '../../utils/clientLogic';
import { buildRobloxLaunchUri } from '../../utils/robloxApiHelpers';
import {
  fetchLiveRobloxServers,
  searchLiveRobloxGames,
} from '../../services/robloxClient';

interface DiscoveryViewProps {
  games: RobloxGame[];
  accounts: RobloxAccount[];
  activeAccount: RobloxAccount;
  selectedGame: RobloxGame | null;
  onSelectGame: (game: RobloxGame | null) => void;
  onLaunchGame: (game: RobloxGame, server?: GameServer, accountId?: string) => void;
  onToggleFavorite: (gameId: string) => void;
}

const GENRES = ['All', 'Simulator', 'Roleplay', 'Fighting', 'FPS', 'Obby', 'Sports', 'Survival'] as const;

export function DiscoveryView({
  games,
  accounts,
  activeAccount,
  selectedGame,
  onSelectGame,
  onLaunchGame,
  onToggleFavorite,
}: DiscoveryViewProps) {
  const [genre, setGenre] = useState<(typeof GENRES)[number]>('All');
  const [search, setSearch] = useState('');
  const [liveSearchGames, setLiveSearchGames] = useState<RobloxGame[] | null>(null);
  const [searchingLive, setSearchingLive] = useState(false);

  const [launchAccountId, setLaunchAccountId] = useState(activeAccount.id);
  const [liveServers, setLiveServers] = useState<GameServer[] | null>(null);
  const [loadingServers, setLoadingServers] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Live Roblox omni-search when typing >= 2 characters
  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setLiveSearchGames(null);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSearchingLive(true);
      try {
        const fetched = await searchLiveRobloxGames(q);
        if (!cancelled) setLiveSearchGames(fetched);
      } catch {
        if (!cancelled) setLiveSearchGames(null);
      } finally {
        if (!cancelled) setSearchingLive(false);
      }
    }, 360);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [search]);

  // Fetch real live public servers whenever a game modal opens
  const loadServersForGame = async (game: RobloxGame) => {
    if (!game.placeId) {
      setLiveServers(null);
      setServerError(null);
      return;
    }
    setLoadingServers(true);
    setServerError(null);
    try {
      const fetched = await fetchLiveRobloxServers(game.placeId);
      setLiveServers(fetched);
    } catch {
      setServerError('Unable to load live public servers right now — showing cached servers.');
      setLiveServers(null);
    } finally {
      setLoadingServers(false);
    }
  };

  useEffect(() => {
    if (!selectedGame) {
      setLiveServers(null);
      setServerError(null);
      return;
    }
    loadServersForGame(selectedGame);
  }, [selectedGame?.id]);

  const filtered = useMemo(() => {
    if (liveSearchGames && search.trim().length >= 2) {
      return liveSearchGames;
    }
    const q = search.trim().toLowerCase();
    return games.filter((g) => {
      if (genre !== 'All' && g.genre !== genre) return false;
      if (q && !g.title.toLowerCase().includes(q) && !g.creator.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [games, genre, search, liveSearchGames]);

  const modalServers =
    liveServers && liveServers.length > 0 ? liveServers : selectedGame?.servers ?? [];

  return (
    <div className="h-full overflow-y-auto px-5 py-4 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-white">Discovery</h1>
          <p className="text-xs text-[#8B94AB]">
            Live Roblox experiences, concurrent player counts, and public server browser
          </p>
        </div>
        <div className="flex items-center h-9 px-3 rounded-lg bg-[#171A23] border border-white/[0.08] w-full sm:w-72 gap-2">
          {searchingLive ? (
            <Loader2 className="w-3.5 h-3.5 text-[#7FA6FF] animate-spin shrink-0" />
          ) : (
            <Search className="w-3.5 h-3.5 text-[#747E96] shrink-0" />
          )}
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search live Roblox games..."
            aria-label="Search experiences"
            className="w-full bg-transparent text-xs text-white placeholder:text-[#667085] focus:outline-none"
          />
        </div>
      </div>

      {/* Genre filter buttons */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {GENRES.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              setGenre(item);
              setSearch('');
              setLiveSearchGames(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              genre === item && !search
                ? 'bg-[#262C3E] text-white border border-white/[0.12]'
                : 'bg-[#151822] text-[#8B94AB] hover:text-white border border-white/[0.06]'
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {/* Games Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-6">
        {filtered.map((game) => (
          <article
            key={game.id}
            className="rounded-2xl bg-[#161923] border border-white/[0.07] overflow-hidden flex flex-col hover:border-white/[0.15] transition-colors"
          >
            <div className="relative aspect-[16/10] bg-[#101219] overflow-hidden group">
              {game.bannerImage || game.thumbnail ? (
                <img
                  src={game.bannerImage || game.thumbnail}
                  alt={game.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.05]"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#181C27] text-xs text-[#7E879E]">
                  {game.title}
                </div>
              )}
              <button
                type="button"
                onClick={() => onToggleFavorite(game.id)}
                aria-label={game.isFavorite ? `Remove ${game.title} from favorites` : `Favorite ${game.title}`}
                className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-lg flex items-center justify-center backdrop-blur-sm ${
                  game.isFavorite ? 'bg-black/70 text-[#F43F5E]' : 'bg-black/55 text-white/80 hover:text-white'
                }`}
              >
                <Heart className={`w-4 h-4 ${game.isFavorite ? 'fill-current' : ''}`} />
              </button>
            </div>

            <div className="p-3.5 flex-1 flex flex-col justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-white truncate">{game.title}</h2>
                <p className="text-xs text-[#7E879E] mt-0.5 truncate">
                  {game.creator} · {game.genre}
                </p>
                <div className="mt-2 flex items-center gap-3 text-xs text-[#9BA3B8] font-mono-tabular">
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {formatCompactCount(game.playingCount)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[#4ADE80]">
                    <ThumbsUp className="w-3 h-3" />
                    {game.ratingPct}%
                  </span>
                  <span className="text-[#7E879E]">{game.visitsLabel}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onLaunchGame(game)}
                  className="flex-1 py-2 rounded-lg bg-[#22C55E] hover:bg-[#16A34A] text-[#052E16] text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Play
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLaunchAccountId(activeAccount.id);
                    onSelectGame(game);
                  }}
                  className="px-3 py-2 rounded-lg bg-[#1F2433] hover:bg-[#293044] text-xs font-medium text-[#DCE1EE] inline-flex items-center gap-1.5 transition-colors"
                >
                  <Server className="w-3.5 h-3.5" />
                  Servers
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Game Detail & Live Roblox Public Server Browser Modal */}
      {selectedGame && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${selectedGame.title} server browser`}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="w-full max-w-2xl rounded-2xl bg-[#151822] border border-white/[0.1] shadow-2xl overflow-hidden">
            <div className="relative h-44 bg-[#0D0F16]">
              {(selectedGame.bannerImage || selectedGame.thumbnail) && (
                <img
                  src={selectedGame.bannerImage || selectedGame.thumbnail}
                  alt={selectedGame.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#151822] via-[#151822]/55 to-transparent" />
              <button
                type="button"
                onClick={() => onSelectGame(null)}
                aria-label="Close game details"
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white hover:bg-black/80 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-3 left-5 right-5 flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-white truncate">{selectedGame.title}</h2>
                  <p className="text-xs text-[#B8C0D6]">
                    by {selectedGame.creator} · {formatCompactCount(selectedGame.playingCount)} active ·{' '}
                    {selectedGame.ratingPct}% positive
                    {selectedGame.placeId ? ` · Place #${selectedGame.placeId}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedGame.placeId && (
                    <a
                      href={buildRobloxLaunchUri(selectedGame.placeId)}
                      className="px-3.5 py-2.5 rounded-xl bg-[#1E2435] hover:bg-[#283047] border border-white/10 text-xs font-semibold text-white inline-flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Roblox Client
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      onLaunchGame(selectedGame, modalServers[0], launchAccountId);
                      onSelectGame(null);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-[#22C55E] hover:bg-[#16A34A] text-[#052E16] text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Launch Instance
                  </button>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              <p className="text-xs text-[#B8C0D6] leading-relaxed">{selectedGame.description}</p>

              {/* Account isolation selector */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-[#1A1E2B] border border-white/[0.07]">
                <label htmlFor="server-launch-account" className="text-xs font-medium text-[#DCE1EE]">
                  Isolated Launch Account
                </label>
                <select
                  id="server-launch-account"
                  value={launchAccountId}
                  onChange={(e) => setLaunchAccountId(e.target.value)}
                  className="h-8 px-3 rounded-lg bg-[#12151E] border border-white/[0.08] text-xs text-white focus:outline-none"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id} className="bg-[#12151E]">
                      {acc.username}
                    </option>
                  ))}
                </select>
              </div>

              {/* Live Public Servers Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-[#A8B1C7]">
                    Live Public Servers ({modalServers.length})
                  </h3>
                  {selectedGame.placeId && (
                    <button
                      type="button"
                      onClick={() => loadServersForGame(selectedGame)}
                      disabled={loadingServers}
                      className="inline-flex items-center gap-1 text-[11px] text-[#7FA6FF] hover:text-white disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${loadingServers ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                  )}
                </div>

                {serverError && <p className="text-[11px] text-[#FBBF24]">{serverError}</p>}

                {loadingServers ? (
                  <div className="py-6 flex items-center justify-center gap-2 text-xs text-[#8B94AB]">
                    <Loader2 className="w-4 h-4 animate-spin text-[#7FA6FF]" />
                    <span>Querying games.roblox.com public server list...</span>
                  </div>
                ) : modalServers.length === 0 ? (
                  <p className="text-xs text-[#7E879E] py-4 text-center rounded-xl bg-[#1A1E2B]">
                    No public servers returned for this place right now.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {modalServers.slice(0, 8).map((srv) => (
                      <div
                        key={srv.id}
                        className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#1A1E2B] border border-white/[0.07]"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{srv.region}</p>
                          <p className="text-[11px] text-[#7E879E] font-mono-tabular">
                            {srv.players}/{srv.maxPlayers} players · Server {srv.fpsEstimate} FPS
                          </p>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-mono-tabular font-semibold ${
                              srv.pingMs <= 50 ? 'text-[#4ADE80]' : srv.pingMs <= 100 ? 'text-[#FBBF24]' : 'text-[#F87171]'
                            }`}
                          >
                            <Wifi className="w-3.5 h-3.5" />
                            {srv.pingMs}ms
                          </span>
                          {selectedGame.placeId && (
                            <a
                              href={buildRobloxLaunchUri(selectedGame.placeId, srv.id)}
                              title="Open directly in local Roblox Player"
                              className="px-2.5 py-1.5 rounded-lg bg-[#23283A] hover:bg-[#2F364E] text-xs font-medium text-[#CBD5E1]"
                            >
                              roblox://
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              onLaunchGame(selectedGame, srv, launchAccountId);
                              onSelectGame(null);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-white text-[#0E1015] hover:bg-[#E5ECFF] text-xs font-semibold"
                          >
                            Join
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
