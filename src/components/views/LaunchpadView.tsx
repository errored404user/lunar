import React, { useMemo, useRef, useState } from 'react';
import {
  BadgeCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Heart,
  HelpCircle,
  Loader2,
  MessageSquare,
  Play,
  Plus,
  RefreshCw,
  Rocket,
  ThumbsUp,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import type {
  NavSection,
  RobloxAccount,
  RobloxGame,
  RobloxPlayer,
  RunningInstance,
} from '../../types/lunar';
import { HERO_SPACE_IMAGE } from '../../data/seedData';
import { formatCompactCount } from '../../utils/clientLogic';
import { sortFriendsByPresence } from '../../utils/robloxApiHelpers';
import { LunarLogoMark, RobloxAvatar } from '../LunarBrand';

interface LaunchpadViewProps {
  activeAccount: RobloxAccount;
  accounts: RobloxAccount[];
  onSwitchAccount: (id: string) => void;
  games: RobloxGame[];
  friends: RobloxPlayer[];
  runningInstances: RunningInstance[];
  fpsBadgeText: string;
  refreshingPresence: boolean;
  onLaunchGame: (game: RobloxGame) => void;
  onJoinFriend: (friend: RobloxPlayer) => void;
  onMessageFriend: (friend: RobloxPlayer) => void;
  onAddRobloxFriends: (identifiers: string) => Promise<{ added: number; error?: string }>;
  onRefreshFriendsPresence: () => Promise<void>;
  onOpenFriendsTab: () => void;
  onSelectGameDetails: (game: RobloxGame) => void;
  onToggleFavorite: (gameId: string) => void;
  onNavigate: (section: NavSection) => void;
  onOpenHud: () => void;
  onOpenConnectAccount: () => void;
}

export function LaunchpadView({
  activeAccount,
  accounts,
  onSwitchAccount,
  games,
  friends,
  runningInstances,
  fpsBadgeText,
  refreshingPresence,
  onLaunchGame,
  onJoinFriend,
  onMessageFriend,
  onAddRobloxFriends,
  onRefreshFriendsPresence,
  onOpenFriendsTab,
  onSelectGameDetails,
  onToggleFavorite,
  onNavigate,
  onOpenHud,
  onOpenConnectAccount,
}: LaunchpadViewProps) {
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [exploreDropdownOpen, setExploreDropdownOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddValue, setQuickAddValue] = useState('');
  const [addingFriend, setAddingFriend] = useState(false);
  const [quickAddError, setQuickAddError] = useState<string | null>(null);
  const continueRowRef = useRef<HTMLDivElement>(null);
  const favoritesRowRef = useRef<HTMLDivElement>(null);

  const continueGames = games.filter((g) => g.isContinue);
  const favoriteGames = games.filter((g) => g.isFavorite);
  const partneredGame = games.find((g) => g.isPartnered) ?? games[0];
  const sortedFriends = useMemo(() => sortFriendsByPresence(friends), [friends]);
  const onlineFriends = sortedFriends.filter((f) => f.status !== 'offline');

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickAddValue.trim();
    if (!trimmed) return;
    setAddingFriend(true);
    setQuickAddError(null);
    const res = await onAddRobloxFriends(trimmed);
    setAddingFriend(false);
    if (res.error) {
      setQuickAddError(res.error);
    } else if (res.added > 0) {
      setQuickAddValue('');
      setQuickAddOpen(false);
    }
  };

  const scrollRow = (ref: React.RefObject<HTMLDivElement | null>, dir: 'left' | 'right') => {
    if (!ref.current) return;
    ref.current.scrollBy({ left: dir === 'left' ? -360 : 360, behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-y-auto lg:overflow-hidden">
      {/* Main Left Launchpad Feed */}
      <div className="flex-1 min-w-0 lg:overflow-y-auto px-5 py-4 space-y-5">
        {/* Welcome Row matching home-1200.webp */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-[#9BA3B8] relative flex-wrap">
            <span>Welcome Back Astronaut,</span>
            <button
              type="button"
              onClick={() => setAccountDropdownOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 font-semibold text-white hover:text-[#93B4FF] transition-colors"
            >
              <RobloxAvatar
                style={activeAccount.avatarStyle}
                src={activeAccount.avatarUrl}
                alt={activeAccount.displayName}
                size={22}
              />
              <span>{activeAccount.displayName}</span>
              {activeAccount.verifiedBadge && (
                <BadgeCheck className="w-3.5 h-3.5 text-[#38BDF8]" />
              )}
              <ChevronDown className="w-3.5 h-3.5 text-[#7C859C]" />
            </button>
            {!activeAccount.robloxUserId && (
              <button
                type="button"
                onClick={onOpenConnectAccount}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1D2436] hover:bg-[#27314A] border border-[#6E96FF]/35 text-[11px] font-semibold text-[#9EC0FF] hover:text-white transition-colors"
              >
                <UserPlus className="w-3 h-3" />
                Use My Roblox Account
              </button>
            )}

            {accountDropdownOpen && (
              <div className="absolute left-36 top-full mt-1.5 w-60 rounded-xl bg-[#181B25] border border-white/[0.09] shadow-2xl p-1.5 z-30">
                {accounts.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => {
                      onSwitchAccount(acc.id);
                      setAccountDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-left transition-colors ${
                      acc.id === activeAccount.id
                        ? 'bg-white/[0.09] text-white font-semibold'
                        : 'text-[#B8C0D4] hover:bg-white/[0.05]'
                    }`}
                  >
                    <RobloxAvatar
                      style={acc.avatarStyle}
                      src={acc.avatarUrl}
                      alt={acc.displayName}
                      size={22}
                    />
                    <span className="truncate">{acc.displayName}</span>
                  </button>
                ))}
                <div className="border-t border-white/[0.06] mt-1 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setAccountDropdownOpen(false);
                      onOpenConnectAccount();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-[#9EC0FF] hover:bg-white/[0.06]"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Connect Your Roblox Account
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setExploreDropdownOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#9BA3B8] hover:text-white transition-colors"
            >
              <span>Explore the Lunarverse</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {exploreDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl bg-[#181B25] border border-white/[0.09] shadow-2xl p-1.5 z-30">
                <button
                  type="button"
                  onClick={() => {
                    setExploreDropdownOpen(false);
                    onNavigate('discovery');
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs text-[#DCE1EE] hover:bg-white/[0.06]"
                >
                  Browse Top Experiences
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExploreDropdownOpen(false);
                    onNavigate('marketplace');
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs text-[#DCE1EE] hover:bg-white/[0.06]"
                >
                  Open Avatar Fitting Room
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExploreDropdownOpen(false);
                    onNavigate('instances');
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs text-[#DCE1EE] hover:bg-white/[0.06]"
                >
                  Multi-Instance Isolation
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExploreDropdownOpen(false);
                    onNavigate('macros');
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs text-[#DCE1EE] hover:bg-white/[0.06]"
                >
                  Configure Macros
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Hero Banner matching home-1200.webp */}
        <section
          aria-label="Welcome banner"
          className="relative rounded-2xl overflow-hidden border border-white/[0.07] bg-[#0B0D14] min-h-[216px] sm:h-60 flex items-center group"
        >
          <img
            src={HERO_SPACE_IMAGE}
            alt="Blocky astronauts floating in starry space near a pixelated moon"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover object-right transition-transform duration-500 group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B0D14]/95 via-[#0B0D14]/75 to-[#0B0D14]/25 sm:to-transparent" />
          <div className="relative z-10 p-5 sm:p-7 flex flex-col justify-center max-w-lg">
            <h1 className="text-xl sm:text-[26px] font-bold tracking-tight text-white leading-tight text-balance">
              Welcome to Lunar for Roblox
            </h1>
            <p className="mt-2 text-xs sm:text-[13px] text-[#B8C0D6] leading-relaxed">
              Blast off with Lunar for Roblox for an awesome Roblox experience — uncapped{' '}
              <span className="font-mono-tabular text-white font-semibold">{fpsBadgeText} FPS</span>,
              unlimited isolated instances, and a live second-screen HUD.
            </p>
            <div className="mt-4 flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={() => onLaunchGame(continueGames[0] ?? games[0])}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-[#0E1015] text-xs font-semibold hover:bg-[#E5ECFF] transition-colors whitespace-nowrap"
              >
                <Rocket className="w-3.5 h-3.5" />
                Quick Launch
              </button>
              <button
                type="button"
                onClick={onOpenHud}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/[0.08] border border-white/[0.1] text-white text-xs font-medium hover:bg-white/[0.14] transition-colors whitespace-nowrap"
              >
                Open Second-Screen HUD
              </button>
            </div>
          </div>
        </section>

        {/* Continue Playing Section */}
        <section aria-labelledby="continue-heading" className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#9BA3B8]" />
              <h2 id="continue-heading" className="text-sm font-semibold text-white">
                Continue
              </h2>
              <span
                title="Recently played Roblox experiences on this account"
                className="text-[#646D82] hover:text-[#9BA3B8] transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigate('discovery')}
                className="text-xs text-[#8C95AD] hover:text-white transition-colors inline-flex items-center gap-0.5 whitespace-nowrap"
              >
                <span>Visit Recent Games</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => scrollRow(continueRowRef, 'left')}
                  aria-label="Scroll Continue games left"
                  className="w-6 h-6 rounded-full bg-[#1B1F2B] border border-white/[0.07] flex items-center justify-center text-[#9BA3B8] hover:text-white hover:bg-[#252B3B] transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollRow(continueRowRef, 'right')}
                  aria-label="Scroll Continue games right"
                  className="w-6 h-6 rounded-full bg-[#1B1F2B] border border-white/[0.07] flex items-center justify-center text-[#9BA3B8] hover:text-white hover:bg-[#252B3B] transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div
            ref={continueRowRef}
            className="flex gap-3.5 overflow-x-auto no-scrollbar pb-1"
          >
            {continueGames.map((game) => (
              <GameTileCard
                key={game.id}
                game={game}
                isRunning={runningInstances.some((i) => i.gameId === game.id)}
                onPlay={() => onLaunchGame(game)}
                onDetails={() => onSelectGameDetails(game)}
                onToggleFavorite={() => onToggleFavorite(game.id)}
              />
            ))}
          </div>
        </section>

        {/* Favorites Section */}
        <section aria-labelledby="favorites-heading" className="space-y-3 pb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-[#9BA3B8]" />
              <h2 id="favorites-heading" className="text-sm font-semibold text-white">
                Favorites
              </h2>
              <span
                title="Your favorited Roblox experiences"
                className="text-[#646D82] hover:text-[#9BA3B8] transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigate('discovery')}
                className="text-xs text-[#8C95AD] hover:text-white transition-colors inline-flex items-center gap-0.5 whitespace-nowrap"
              >
                <span>Browse Favorites</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => scrollRow(favoritesRowRef, 'left')}
                  aria-label="Scroll Favorites left"
                  className="w-6 h-6 rounded-full bg-[#1B1F2B] border border-white/[0.07] flex items-center justify-center text-[#9BA3B8] hover:text-white hover:bg-[#252B3B] transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollRow(favoritesRowRef, 'right')}
                  aria-label="Scroll Favorites right"
                  className="w-6 h-6 rounded-full bg-[#1B1F2B] border border-white/[0.07] flex items-center justify-center text-[#9BA3B8] hover:text-white hover:bg-[#252B3B] transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div
            ref={favoritesRowRef}
            className="flex gap-3.5 overflow-x-auto no-scrollbar pb-1"
          >
            {favoriteGames.map((game) => (
              <GameTileCard
                key={game.id}
                game={game}
                isRunning={runningInstances.some((i) => i.gameId === game.id)}
                onPlay={() => onLaunchGame(game)}
                onDetails={() => onSelectGameDetails(game)}
                onToggleFavorite={() => onToggleFavorite(game.id)}
              />
            ))}
          </div>
        </section>
      </div>

      {/* Right Sidebar matching home-1200.webp */}
      <aside className="w-full lg:w-[320px] xl:w-[348px] shrink-0 border-t lg:border-t-0 lg:border-l border-white/[0.06] bg-[#101218] p-4 flex flex-col gap-4 lg:overflow-y-auto">
        {/* Top subtle status slot */}
        <div className="rounded-xl bg-[#151821] border border-white/[0.05] px-3.5 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[#9BA3B8]">
            <LunarLogoMark className="w-4 h-4 text-[#7FA6FF]" />
            <span>FPS Engine</span>
          </div>
          <span className="font-mono-tabular text-xs font-semibold text-white">
            {fpsBadgeText} FPS · Ready
          </span>
        </div>

        {/* Friends Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-white">
              Friends{' '}
              <span className="text-xs font-normal text-[#7E879E]">
                ({onlineFriends.length} online)
              </span>
            </h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => void onRefreshFriendsPresence()}
                disabled={refreshingPresence}
                title="Refresh live Roblox presence"
                aria-label="Refresh friends online status"
                className="w-6 h-6 rounded-md text-[#8C95AD] hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshingPresence ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuickAddOpen((v) => !v);
                  setQuickAddError(null);
                }}
                title="Add real Roblox friend by @username or ID"
                aria-label="Add Roblox friend"
                className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
                  quickAddOpen
                    ? 'bg-[#25314B] text-[#9EC0FF]'
                    : 'text-[#8C95AD] hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                {quickAddOpen ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={onOpenFriendsTab}
                className="text-xs text-[#8C95AD] hover:text-white inline-flex items-center gap-0.5 transition-colors ml-0.5"
              >
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {quickAddOpen && (
            <form
              onSubmit={handleQuickAddSubmit}
              className="rounded-xl bg-[#151924] border border-white/[0.08] p-2.5 space-y-2"
            >
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={quickAddValue}
                  onChange={(e) => setQuickAddValue(e.target.value)}
                  placeholder="@username or User ID..."
                  aria-label="Add Roblox friend username or ID"
                  className="flex-1 min-w-0 h-8 px-2.5 rounded-lg bg-[#0F121A] border border-white/[0.08] text-xs text-white placeholder:text-[#667085] focus:outline-none focus:border-[#6E96FF]"
                />
                <button
                  type="submit"
                  disabled={addingFriend || !quickAddValue.trim()}
                  className="h-8 px-2.5 rounded-lg bg-white text-[#0E1015] hover:bg-[#E5ECFF] disabled:opacity-50 text-xs font-semibold inline-flex items-center gap-1 shrink-0"
                >
                  {addingFriend ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <UserPlus className="w-3 h-3" />
                  )}
                  Add
                </button>
              </div>
              {quickAddError && (
                <p className="text-[11px] text-[#FCA5A5] leading-snug">{quickAddError}</p>
              )}
            </form>
          )}

          {sortedFriends.length === 0 ? (
            <div className="rounded-xl bg-[#151822] border border-white/[0.06] p-3.5 text-center space-y-2">
              <p className="text-xs text-[#8C95AD]">No friends added yet.</p>
              <button
                type="button"
                onClick={() => setQuickAddOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-[#1E2538] hover:bg-[#28324C] text-[11px] font-semibold text-[#9EC0FF]"
              >
                + Add Roblox Friend
              </button>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-0.5">
              {sortedFriends.slice(0, 6).map((friend) => {
                const statusText =
                  friend.status === 'in-game'
                    ? `Playing ${friend.currentGameTitle || 'Roblox'}`
                    : friend.presenceLabel === 'In Studio'
                      ? 'In Roblox Studio'
                      : friend.status === 'online'
                        ? 'Online'
                        : 'Offline';

                return (
                  <div
                    key={friend.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-xl hover:bg-white/[0.04] transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        <RobloxAvatar
                          style={friend.avatarStyle}
                          src={friend.avatarUrl}
                          alt={friend.displayName}
                          size={34}
                        />
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#101218] ${
                            friend.status === 'in-game'
                              ? 'bg-[#22C55E]'
                              : friend.status === 'online'
                                ? 'bg-[#38BDF8]'
                                : 'bg-[#64748B]'
                          }`}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="text-xs font-semibold text-[#EDF0F7] truncate">
                            {friend.displayName}
                          </p>
                          {friend.verifiedBadge && (
                            <BadgeCheck className="w-3 h-3 text-[#38BDF8] shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-[#7E879E] truncate">{statusText}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {friend.status === 'in-game' &&
                        (friend.currentGameId || friend.currentPlaceId || friend.currentGameTitle) && (
                          <button
                            type="button"
                            onClick={() => onJoinFriend(friend)}
                            className="px-2.5 py-1 rounded-md bg-[#1F2536] hover:bg-[#22C55E] hover:text-[#052E16] text-[11px] font-semibold text-[#93B4FF] transition-colors"
                          >
                            Join
                          </button>
                        )}
                      <button
                        type="button"
                        onClick={() => onMessageFriend(friend)}
                        aria-label={`Message ${friend.displayName}`}
                        title={`Message ${friend.displayName}`}
                        className="w-6 h-6 rounded-md text-[#7E879E] hover:text-white hover:bg-white/[0.08] flex items-center justify-center opacity-75 group-hover:opacity-100 transition-all"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Partnered Game Spotlight Card matching FIFA Soccer in home-1200.webp */}
        {partneredGame && (
          <div className="space-y-2.5 pt-1">
            <div
              className="relative rounded-2xl overflow-hidden border border-white/[0.08] bg-[#161A24] aspect-[16/9] group cursor-pointer"
              onClick={() => onSelectGameDetails(partneredGame)}
            >
              <img
                src={partneredGame.bannerImage || partneredGame.thumbnail}
                alt={partneredGame.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/25" />
              <div className="absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-sm border border-white/10 text-[10px] font-semibold tracking-wide text-white">
                <LunarLogoMark className="w-3 h-3 text-white" />
                <span>PARTNERED</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 px-0.5">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-white truncate">
                  {partneredGame.title}
                </h3>
                <p className="text-xs text-[#7E879E] truncate">by {partneredGame.creator}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onLaunchGame(partneredGame)}
                  aria-label={`Play ${partneredGame.title}`}
                  className="w-8 h-8 rounded-lg bg-[#1C202C] hover:bg-white hover:text-[#0E1015] text-[#DCE1EE] border border-white/[0.07] flex items-center justify-center transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                </button>
                <button
                  type="button"
                  onClick={() => onSelectGameDetails(partneredGame)}
                  aria-label={`Inspect ${partneredGame.title} details`}
                  className="w-8 h-8 rounded-lg bg-[#1C202C] hover:bg-[#262C3D] text-[#9BA3B8] hover:text-white border border-white/[0.07] flex items-center justify-center transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Lunar Crest Panel / Active Instances Mini-Summary */}
        <div className="mt-auto rounded-2xl bg-[#141720] border border-white/[0.06] p-4 flex flex-col items-center justify-center text-center min-h-[150px] relative overflow-hidden">
          <LunarLogoMark className="w-16 h-16 text-white/[0.06] mb-2" />
          <p className="text-xs font-semibold text-[#C9D0E2]">
            {runningInstances.length} Isolated {runningInstances.length === 1 ? 'Instance' : 'Instances'} Active
          </p>
          <p className="text-[11px] text-[#737C94] mt-1 max-w-[220px]">
            Launch unlimited accounts simultaneously with independent profiles and HUD telemetry.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('instances')}
            className="mt-3 px-3 py-1.5 rounded-lg bg-[#1D2230] hover:bg-[#262D40] border border-white/[0.07] text-xs font-medium text-[#DDE4F5] transition-colors"
          >
            Manage Instances
          </button>
        </div>
      </aside>
    </div>
  );
}

function GameTileCard({
  game,
  isRunning,
  onPlay,
  onDetails,
  onToggleFavorite,
}: {
  game: RobloxGame;
  isRunning: boolean;
  onPlay: () => void;
  onDetails: () => void;
  onToggleFavorite: () => void;
}) {
  return (
    <article className="w-[156px] sm:w-[164px] shrink-0 group">
      <div className="relative aspect-square rounded-xl overflow-hidden bg-[#181B24] border border-white/[0.07]">
        <img
          src={game.thumbnail}
          alt={game.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/45 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
          <button
            type="button"
            onClick={onPlay}
            aria-label={`Play ${game.title}`}
            className="w-10 h-10 rounded-full bg-[#22C55E] hover:bg-[#16A34A] text-[#052E16] flex items-center justify-center shadow-lg transition-transform hover:scale-105"
          >
            <Play className="w-4 h-4 fill-current ml-0.5" />
          </button>
          <button
            type="button"
            onClick={onDetails}
            aria-label={`View servers for ${game.title}`}
            className="w-8 h-8 rounded-full bg-[#141720]/90 hover:bg-[#1F2536] text-white border border-white/15 flex items-center justify-center transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={onToggleFavorite}
          aria-label={game.isFavorite ? `Remove ${game.title} from favorites` : `Favorite ${game.title}`}
          className={`absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 focus-visible:opacity-100 ${
            game.isFavorite
              ? 'bg-black/70 text-[#F43F5E]'
              : 'bg-black/55 text-white/75 hover:text-white'
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${game.isFavorite ? 'fill-current' : ''}`} />
        </button>

        {isRunning && (
          <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/75 border border-[#4ADE80]/40 text-[10px] font-semibold text-[#4ADE80]">
            Running
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={onDetails}
        className="mt-2 block w-full text-left"
      >
        <h3 className="text-[13px] font-medium text-[#EDF0F7] truncate group-hover:text-white">
          {game.title}
        </h3>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[#7E879E] font-mono-tabular">
          <span className="inline-flex items-center gap-1">
            <Users className="w-3 h-3" />
            {formatCompactCount(game.playingCount)}
          </span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1 text-[#4ADE80]">
            <ThumbsUp className="w-2.5 h-2.5" />
            {game.ratingPct}%
          </span>
        </div>
      </button>
    </article>
  );
}
