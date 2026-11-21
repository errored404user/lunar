import React, { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  Check,
  ExternalLink,
  Loader2,
  MessageSquare,
  Play,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import type { FriendRequest, RobloxPlayer } from '../../types/lunar';
import { filterPlayers } from '../../utils/clientLogic';
import { sortFriendsByPresence } from '../../utils/robloxApiHelpers';
import { searchLiveRobloxPlayers } from '../../services/robloxClient';
import { LunarLogoMark, RobloxAvatar } from '../LunarBrand';

interface PlayersViewProps {
  players: RobloxPlayer[];
  friendRequests: FriendRequest[];
  initialTab?: 'all' | 'friends';
  refreshingPresence: boolean;
  onAcceptRequest: (reqId: string) => void;
  onDeclineRequest: (reqId: string) => void;
  onDeclineAllRequests: () => void;
  onToggleFriend: (playerId: string, livePlayer?: RobloxPlayer) => void;
  onAddRobloxFriends: (identifiers: string) => Promise<{ added: number; error?: string }>;
  onRefreshFriendsPresence: () => Promise<void>;
  onClearDemoFriends: () => void;
  onJoinFriend: (player: RobloxPlayer) => void;
  onMessagePlayer: (player: RobloxPlayer) => void;
}

export function PlayersView({
  players,
  friendRequests,
  initialTab = 'all',
  refreshingPresence,
  onAcceptRequest,
  onDeclineRequest,
  onDeclineAllRequests,
  onToggleFriend,
  onAddRobloxFriends,
  onRefreshFriendsPresence,
  onClearDemoFriends,
  onJoinFriend,
  onMessagePlayer,
}: PlayersViewProps) {
  const [query, setQuery] = useState(initialTab === 'friends' ? '' : 'Physci');
  const [filterMode, setFilterMode] = useState<'all' | 'friends'>(initialTab);
  const [selectedPlayer, setSelectedPlayer] = useState<RobloxPlayer | null>(null);
  const [liveResults, setLiveResults] = useState<RobloxPlayer[] | null>(null);
  const [loadingLive, setLoadingLive] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [addInput, setAddInput] = useState('');
  const [addingFriends, setAddingFriends] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    setFilterMode(initialTab);
    if (initialTab === 'friends') {
      setQuery('');
    }
  }, [initialTab]);

  const friendMap = useMemo(
    () => new Map(players.filter((p) => p.isFriend).map((p) => [p.id, p])),
    [players],
  );

  const allFriends = useMemo(
    () => sortFriendsByPresence(players.filter((p) => p.isFriend)),
    [players],
  );
  const hasRealFriends = allFriends.some((f) => Boolean(f.robloxUserId));
  const hasDemoFriends = allFriends.some((f) => !f.robloxUserId);

  useEffect(() => {
    if (filterMode === 'friends') return;
    const trimmed = query.trim();
    if (!trimmed) {
      setLiveResults(null);
      setApiError(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoadingLive(true);
      setApiError(null);
      try {
        const fetched = await searchLiveRobloxPlayers(trimmed);
        if (!cancelled) {
          setLiveResults(fetched);
        }
      } catch {
        if (!cancelled) {
          setApiError('Using cached players (Roblox Users API rate-limited).');
          setLiveResults(null);
        }
      } finally {
        if (!cancelled) setLoadingLive(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, filterMode]);

  const visiblePlayers = useMemo(() => {
    if (filterMode === 'friends') {
      return sortFriendsByPresence(filterPlayers(allFriends, query));
    }
    if (liveResults && liveResults.length > 0) {
      return liveResults.map((p) => ({
        ...p,
        isFriend: friendMap.has(p.id),
      }));
    }
    return filterPlayers(players, query);
  }, [players, allFriends, filterMode, query, liveResults, friendMap]);

  const handleAddFriendsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = addInput.trim();
    if (!trimmed) return;
    setAddingFriends(true);
    setAddError(null);
    const res = await onAddRobloxFriends(trimmed);
    setAddingFriends(false);
    if (res.error) {
      setAddError(res.error);
    } else if (res.added > 0) {
      setAddInput('');
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-y-auto lg:overflow-hidden">
      {/* Main Players Search & Friends Grid powered by users.roblox.com + thumbnails.roblox.com + presence.roblox.com */}
      <div className="flex-1 min-w-0 lg:overflow-y-auto px-5 py-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex-1 min-w-[220px] flex items-center h-10 px-3 rounded-lg bg-[#171A23] border border-white/[0.08] focus-within:border-[#6E96FF]/60 gap-2">
            {loadingLive ? (
              <Loader2 className="w-4 h-4 text-[#7FA6FF] animate-spin shrink-0" />
            ) : (
              <Search className="w-4 h-4 text-[#747E96] shrink-0" />
            )}
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                filterMode === 'friends'
                  ? 'Filter your friends by name or @username...'
                  : 'Search live Roblox players via users.roblox.com...'
              }
              aria-label="Search players"
              className="w-full bg-transparent text-sm text-white placeholder:text-[#667085] focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear player search"
                className="text-[#747E96] hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center p-1 rounded-lg bg-[#161923] border border-white/[0.07]">
            <button
              type="button"
              onClick={() => {
                setFilterMode('all');
                if (!query.trim()) setQuery('Physci');
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                filterMode === 'all' ? 'bg-[#262B3B] text-white' : 'text-[#8B94AB] hover:text-white'
              }`}
            >
              Roblox Search
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterMode('friends');
                setQuery('');
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                filterMode === 'friends' ? 'bg-[#262B3B] text-white' : 'text-[#8B94AB] hover:text-white'
              }`}
            >
              Friends ({allFriends.length})
            </button>
          </div>
        </div>

        {/* Friends Management Bar (Add real Roblox friends by @username/ID + Refresh live presence) */}
        {filterMode === 'friends' && (
          <div className="rounded-2xl bg-[#151822] border border-white/[0.08] p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-xs font-semibold text-white">
                  Add Real Roblox Friends &amp; Live Presence
                </h2>
                <p className="text-[11px] text-[#7E879E] mt-0.5">
                  Roblox requires login cookies to scrape friend lists automatically, so add your
                  friends by @username or User ID (comma-separated) for live avatars &amp; online
                  status.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => void onRefreshFriendsPresence()}
                  disabled={refreshingPresence}
                  className="h-8 px-3 rounded-lg bg-[#1D2231] hover:bg-[#262D42] border border-white/[0.08] text-xs font-medium text-[#DCE4F7] inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshingPresence ? 'animate-spin' : ''}`} />
                  Refresh Status
                </button>
                {hasRealFriends && hasDemoFriends && (
                  <button
                    type="button"
                    onClick={onClearDemoFriends}
                    className="h-8 px-3 rounded-lg bg-[#2A1920] hover:bg-[#3A202A] border border-[#EF4444]/30 text-xs font-medium text-[#FCA5A5] inline-flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear Demo Friends
                  </button>
                )}
              </div>
            </div>

            <form onSubmit={handleAddFriendsSubmit} className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={addInput}
                onChange={(e) => setAddInput(e.target.value)}
                placeholder="e.g. Roblox, builderman, Shedletsky or User IDs (156, 261)..."
                aria-label="Roblox friend usernames or IDs"
                className="flex-1 min-w-[220px] h-9 px-3 rounded-lg bg-[#0F121A] border border-white/[0.08] text-xs text-white placeholder:text-[#667085] focus:outline-none focus:border-[#6E96FF]"
              />
              <button
                type="submit"
                disabled={addingFriends || !addInput.trim()}
                className="h-9 px-4 rounded-lg bg-white text-[#0E1015] hover:bg-[#E5ECFF] disabled:opacity-50 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                {addingFriends ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <UserPlus className="w-3.5 h-3.5" />
                )}
                Add Roblox Friend
              </button>
            </form>

            {addError && <p className="text-xs text-[#FCA5A5]">{addError}</p>}
          </div>
        )}

        {apiError && <p className="text-xs text-[#FBBF24]">{apiError}</p>}

        {/* 5-Column Avatar Card Grid */}
        {loadingLive && !liveResults && filterMode === 'all' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 pb-6">
            {Array.from({ length: 10 }).map((_, idx) => (
              <div
                key={idx}
                className="rounded-xl bg-[#161922] border border-white/[0.06] p-4 flex flex-col items-center animate-pulse"
              >
                <div className="w-16 h-16 rounded-full bg-[#222634]" />
                <div className="mt-3 h-3.5 w-20 rounded bg-[#222634]" />
                <div className="mt-1.5 h-3 w-16 rounded bg-[#1D212D]" />
              </div>
            ))}
          </div>
        ) : visiblePlayers.length === 0 ? (
          <div className="rounded-2xl bg-[#151822] border border-white/[0.06] p-10 text-center">
            <p className="text-sm font-semibold text-white">
              {filterMode === 'friends'
                ? query.trim()
                  ? `No friends matching "${query}"`
                  : 'No friends in your list yet'
                : `No players found for "${query}"`}
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery(filterMode === 'friends' ? '' : 'Physci');
                setFilterMode('all');
              }}
              className="mt-3 px-4 py-2 rounded-lg bg-[#232839] hover:bg-[#2C3348] text-xs font-medium text-white"
            >
              Browse Roblox Search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 pb-6">
            {visiblePlayers.map((player) => {
              const statusLine =
                player.status === 'in-game'
                  ? `Playing ${player.currentGameTitle || 'Roblox'}`
                  : player.presenceLabel === 'In Studio'
                    ? 'In Studio'
                    : player.status === 'online'
                      ? 'Online'
                      : 'Offline';

              return (
                <div
                  key={player.id}
                  onClick={() => setSelectedPlayer(player)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedPlayer(player);
                    }
                  }}
                  className="group rounded-xl bg-[#161922] hover:bg-[#1D2130] border border-white/[0.07] hover:border-white/[0.15] p-4 flex flex-col items-center text-center transition-colors cursor-pointer"
                >
                  <div className="relative">
                    <RobloxAvatar
                      style={player.avatarStyle}
                      src={player.avatarUrl}
                      alt={player.displayName}
                      size={64}
                    />
                    <span
                      title={statusLine}
                      className={`absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#161922] ${
                        player.status === 'in-game'
                          ? 'bg-[#22C55E]'
                          : player.status === 'online'
                            ? 'bg-[#38BDF8]'
                            : 'bg-[#475569]'
                      }`}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-center gap-1 max-w-full">
                    <p className="text-[13px] font-semibold text-[#F0F3FA] truncate">
                      {player.displayName}
                    </p>
                    {player.verifiedBadge && (
                      <BadgeCheck className="w-3.5 h-3.5 text-[#3B82F6] shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-[#788199] truncate w-full">@{player.username}</p>
                  <p
                    className={`mt-1.5 text-[10px] font-medium truncate w-full ${
                      player.status === 'in-game'
                        ? 'text-[#4ADE80]'
                        : player.status === 'online'
                          ? 'text-[#38BDF8]'
                          : 'text-[#64748B]'
                    }`}
                  >
                    {statusLine}
                  </p>

                  {filterMode === 'friends' ? (
                    <div className="mt-2.5 flex items-center gap-1.5 w-full">
                      {player.status === 'in-game' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onJoinFriend(player);
                          }}
                          className="flex-1 py-1 rounded-md bg-[#22C55E] hover:bg-[#16A34A] text-[#052E16] text-[11px] font-semibold inline-flex items-center justify-center gap-1"
                        >
                          <Play className="w-2.5 h-2.5 fill-current" />
                          Join
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMessagePlayer(player);
                        }}
                        className="flex-1 py-1 rounded-md bg-[#222738] hover:bg-[#2C3349] text-[#DCE4F7] text-[11px] font-medium"
                      >
                        Chat
                      </button>
                    </div>
                  ) : (
                    player.isFriend && (
                      <span className="mt-1.5 text-[10px] font-semibold text-[#7FA6FF]">
                        Friend
                      </span>
                    )
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right Sidebar: Friend Requests */}
      <aside className="w-full lg:w-[320px] xl:w-[348px] shrink-0 border-t lg:border-t-0 lg:border-l border-white/[0.06] bg-[#101218] p-4 flex flex-col gap-4 lg:overflow-y-auto">
        <div className="rounded-xl bg-[#151821] border border-white/[0.05] h-11 flex items-center justify-center">
          <LunarLogoMark className="w-5 h-5 text-white/15" />
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-white">
            Friend Requests ({friendRequests.length})
          </h2>

          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-[#8C95AD]">
              {friendRequests.length === 0
                ? 'No pending requests'
                : `${friendRequests.length} pending ${friendRequests.length === 1 ? 'request' : 'requests'}`}
            </span>
            {friendRequests.length > 0 && (
              <button
                type="button"
                onClick={onDeclineAllRequests}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#421B21] hover:bg-[#58222B] border border-[#EF4444]/30 text-xs font-medium text-[#FCA5A5] transition-colors whitespace-nowrap"
              >
                <X className="w-3.5 h-3.5" />
                Decline all
              </button>
            )}
          </div>

          {friendRequests.length === 0 ? (
            <div className="rounded-xl bg-[#151822] border border-white/[0.06] p-4 text-center text-xs text-[#737C94]">
              You&apos;re all caught up on friend requests.
            </div>
          ) : (
            <div className="space-y-2.5">
              {friendRequests.map((req) => (
                <div
                  key={req.id}
                  className="rounded-xl bg-[#161923] border border-white/[0.07] p-3 flex items-center justify-between gap-2.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <RobloxAvatar
                      style={req.avatarStyle}
                      src={req.avatarUrl}
                      alt={req.displayName}
                      size={36}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{req.displayName}</p>
                      <p className="text-[11px] text-[#8B94AB] truncate">@{req.username}</p>
                      <p className="text-[10px] text-[#667085] mt-0.5">Sent {req.sentDate}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onDeclineRequest(req.id)}
                      aria-label={`Decline friend request from ${req.displayName}`}
                      className="w-8 h-8 rounded-lg bg-[#3E1A21] hover:bg-[#55222C] border border-[#EF4444]/30 text-[#F87171] flex items-center justify-center transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onAcceptRequest(req.id)}
                      aria-label={`Accept friend request from ${req.displayName}`}
                      className="w-8 h-8 rounded-lg bg-[#163626] hover:bg-[#1E4B35] border border-[#22C55E]/35 text-[#4ADE80] flex items-center justify-center transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-auto rounded-2xl bg-[#141720] border border-white/[0.05] p-6 flex items-center justify-center min-h-[160px]">
          <LunarLogoMark className="w-20 h-20 text-white/[0.07]" />
        </div>
      </aside>

      {/* Player Quick Profile Modal */}
      {selectedPlayer && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Profile for ${selectedPlayer.displayName}`}
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="w-full max-w-sm rounded-2xl bg-[#151822] border border-white/[0.1] shadow-2xl p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <RobloxAvatar
                  style={selectedPlayer.avatarStyle}
                  src={selectedPlayer.avatarUrl}
                  alt={selectedPlayer.displayName}
                  size={56}
                />
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                    {selectedPlayer.displayName}
                    {selectedPlayer.verifiedBadge && (
                      <BadgeCheck className="w-4 h-4 text-[#3B82F6]" />
                    )}
                  </h3>
                  <p className="text-xs text-[#8B94AB]">@{selectedPlayer.username}</p>
                  <p className="text-[11px] text-[#747E96] mt-0.5 font-mono-tabular">
                    {selectedPlayer.robloxUserId
                      ? `Roblox ID #${selectedPlayer.robloxUserId}`
                      : `Joined ${selectedPlayer.joinedYear}`}{' '}
                    ·{' '}
                    <span
                      className={
                        selectedPlayer.status === 'in-game'
                          ? 'text-[#4ADE80]'
                          : selectedPlayer.status === 'online'
                            ? 'text-[#38BDF8]'
                            : 'text-[#64748B]'
                      }
                    >
                      {selectedPlayer.presenceLabel ||
                        (selectedPlayer.status === 'in-game'
                          ? 'In Game'
                          : selectedPlayer.status === 'online'
                            ? 'Online'
                            : 'Offline')}
                    </span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlayer(null)}
                aria-label="Close player profile"
                className="p-1.5 rounded-lg text-[#8B94AB] hover:text-white hover:bg-white/[0.06]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedPlayer.status === 'in-game' &&
              (selectedPlayer.currentGameTitle || selectedPlayer.currentPlaceId) && (
                <div className="p-3 rounded-xl bg-[#13291F] border border-[#22C55E]/25 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] text-[#4ADE80] font-semibold">Currently In-Game</p>
                    <p className="text-xs text-white font-medium truncate">
                      {selectedPlayer.currentGameTitle || `Place #${selectedPlayer.currentPlaceId}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onJoinFriend(selectedPlayer);
                      setSelectedPlayer(null);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#22C55E] hover:bg-[#16A34A] text-[#052E16] text-xs font-semibold inline-flex items-center gap-1 shrink-0"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    Join
                  </button>
                </div>
              )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onToggleFriend(selectedPlayer.id, selectedPlayer);
                  setSelectedPlayer((prev) =>
                    prev ? { ...prev, isFriend: !prev.isFriend } : null,
                  );
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors ${
                  selectedPlayer.isFriend
                    ? 'bg-[#1D2231] hover:bg-[#3A1E25] text-white border border-white/[0.08]'
                    : 'bg-white text-[#0E1015] hover:bg-[#E5ECFF]'
                }`}
              >
                {selectedPlayer.isFriend ? (
                  <>
                    <UserCheck className="w-3.5 h-3.5" />
                    Remove Friend
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    Add Friend
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  onMessagePlayer(selectedPlayer);
                  setSelectedPlayer(null);
                }}
                className="flex-1 py-2 rounded-xl bg-[#1D2231] hover:bg-[#262D40] border border-white/[0.08] text-xs font-semibold text-white inline-flex items-center justify-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Message
              </button>
            </div>

            {selectedPlayer.robloxUserId && (
              <a
                href={`https://www.roblox.com/users/${selectedPlayer.robloxUserId}/profile`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 rounded-xl bg-[#12151E] hover:bg-[#1B1F2E] border border-white/[0.07] text-xs font-medium text-[#93B4FF] inline-flex items-center justify-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View on Roblox.com
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
