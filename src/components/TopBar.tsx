import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Gauge,
  Plus,
  Search,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import type { NavSection, RobloxAccount, RunningInstance } from '../types/lunar';
import { LunarLogoMark, RobloxAvatar } from './LunarBrand';

interface TopBarProps {
  activeSection: NavSection;
  breadcrumbSub?: string;
  canGoBack: boolean;
  canGoForward: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  accounts: RobloxAccount[];
  activeAccount: RobloxAccount;
  onSwitchAccount: (accountId: string) => void;
  runningInstances: RunningInstance[];
  fpsBadgeText: string;
  unreadNotifications: number;
  onOpenSearch: () => void;
  onOpenHud: () => void;
  onOpenLandingPreview: () => void;
  onOpenConnectAccount: () => void;
  onNavigate: (section: NavSection) => void;
  onClearNotifications: () => void;
}

const SECTION_LABELS: Record<NavSection, string> = {
  launchpad: 'Launchpad',
  discovery: 'Discovery',
  players: 'Players',
  communities: 'Communities',
  marketplace: 'Marketplace',
  messages: 'Messages',
  captures: 'Captures',
  instances: 'Instances',
  macros: 'Macros',
  settings: 'Settings',
};

export function TopBar({
  activeSection,
  breadcrumbSub,
  canGoBack,
  canGoForward,
  onGoBack,
  onGoForward,
  accounts,
  activeAccount,
  onSwitchAccount,
  runningInstances,
  fpsBadgeText,
  unreadNotifications,
  onOpenSearch,
  onOpenHud,
  onOpenLandingPreview,
  onOpenConnectAccount,
  onNavigate,
  onClearNotifications,
}: TopBarProps) {
  const [appMenuOpen, setAppMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const barRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (barRef.current && !barRef.current.contains(event.target as Node)) {
        setAppMenuOpen(false);
        setAccountMenuOpen(false);
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const runningCount = runningInstances.length;

  return (
    <header
      ref={barRef}
      className="h-12 shrink-0 bg-[#0E1015] border-b border-white/[0.06] px-3.5 flex items-center justify-between gap-4 select-none relative z-40"
    >
      {/* Left Zone: Brand Dropdown + History Arrows + Breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => {
              setAppMenuOpen((v) => !v);
              setAccountMenuOpen(false);
              setNotifOpen(false);
            }}
            aria-expanded={appMenuOpen}
            aria-label="Lunar for Roblox menu"
            className="flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2 py-1.5 rounded-lg text-[13px] font-medium text-[#E6EAF2] hover:bg-white/[0.06] transition-colors whitespace-nowrap shrink-0"
          >
            <LunarLogoMark className="w-[18px] h-[18px] text-white shrink-0" />
            <span className="hidden sm:inline">Lunar for Roblox</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#7C859C]" />
          </button>

          {appMenuOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-64 rounded-xl bg-[#161923] border border-white/[0.09] shadow-2xl p-1.5 z-50">
              <div className="px-2.5 py-2 border-b border-white/[0.06] mb-1">
                <p className="text-xs font-semibold text-white">Lunar for Roblox</p>
                <p className="text-[11px] text-[#8B94AB] mt-0.5">
                  Windows &amp; macOS Desktop Client · FPS {fpsBadgeText}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAppMenuOpen(false);
                  onNavigate('instances');
                }}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs text-[#DCE1EE] hover:bg-white/[0.06] transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Plus className="w-3.5 h-3.5 text-[#7FA6FF]" />
                  New Isolated Instance
                </span>
                <span className="text-[11px] text-[#6E778E] font-mono-tabular">{runningCount} active</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAppMenuOpen(false);
                  onNavigate('settings');
                }}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs text-[#DCE1EE] hover:bg-white/[0.06] transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Gauge className="w-3.5 h-3.5 text-[#4ADE80]" />
                  FPS Uncap &amp; FastFlags
                </span>
                <span className="text-[11px] text-[#4ADE80] font-mono-tabular">{fpsBadgeText} FPS</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAppMenuOpen(false);
                  onOpenLandingPreview();
                }}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs text-[#DCE1EE] hover:bg-white/[0.06] transition-colors"
              >
                <span className="flex items-center gap-2">
                  <ExternalLink className="w-3.5 h-3.5 text-[#93B4FF]" />
                  Preview lunar.gg/roblox Page
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Back / Forward navigation buttons */}
        <div className="hidden md:flex items-center gap-0.5 text-[#7C859C]">
          <button
            type="button"
            onClick={onGoBack}
            disabled={!canGoBack}
            aria-label="Navigate back"
            className="p-1.5 rounded-md hover:bg-white/[0.06] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onGoForward}
            disabled={!canGoForward}
            aria-label="Navigate forward"
            className="p-1.5 rounded-md hover:bg-white/[0.06] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-[13px] min-w-0">
          <span className="text-[#A8B1C7] font-medium truncate">{SECTION_LABELS[activeSection]}</span>
          {breadcrumbSub && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-[#586075] shrink-0" />
              <span className="text-[#E6EAF2] font-medium truncate">{breadcrumbSub}</span>
            </>
          )}
        </nav>
      </div>

      {/* Right Zone: Search + Bell + Robux + Account Switcher + Live Instances HUD Pill */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button
          type="button"
          onClick={onOpenSearch}
          aria-label="Quick search"
          title="Quick search (Ctrl+K)"
          className="w-8 h-8 rounded-full bg-[#181B24] border border-white/[0.06] flex items-center justify-center text-[#9CA4BA] hover:text-white hover:bg-[#222736] transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setNotifOpen((v) => !v);
              setAccountMenuOpen(false);
              setAppMenuOpen(false);
            }}
            aria-label="Notifications"
            className="w-8 h-8 rounded-full bg-[#181B24] border border-white/[0.06] flex items-center justify-center text-[#9CA4BA] hover:text-white hover:bg-[#222736] transition-colors relative"
          >
            <Bell className="w-3.5 h-3.5" />
            {unreadNotifications > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#EF4444] text-[9px] font-bold text-white flex items-center justify-center">
                {unreadNotifications}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-72 rounded-xl bg-[#161923] border border-white/[0.09] shadow-2xl p-3 z-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-white">Notifications</span>
                <button
                  type="button"
                  onClick={onClearNotifications}
                  className="text-[11px] text-[#7FA6FF] hover:underline"
                >
                  Mark read
                </button>
              </div>
              <div className="space-y-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setNotifOpen(false);
                    onNavigate('players');
                  }}
                  className="w-full text-left p-2 rounded-lg bg-[#1D212E] hover:bg-[#242938] transition-colors"
                >
                  <p className="font-medium text-white">KaesoDev sent a friend request</p>
                  <p className="text-[11px] text-[#8B94AB] mt-0.5">Open Players to accept or decline</p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNotifOpen(false);
                    onNavigate('marketplace');
                  }}
                  className="w-full text-left p-2 rounded-lg bg-[#1D212E] hover:bg-[#242938] transition-colors"
                >
                  <p className="font-medium text-white">Inbound Trade Offer</p>
                  <p className="text-[11px] text-[#8B94AB] mt-0.5">KaesoDev offered Valkyrie Orbit Helm</p>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Robux Balance or Connect Real Account Trigger */}
        {activeAccount.robloxUserId ? (
          <button
            type="button"
            onClick={onOpenConnectAccount}
            aria-label={`Roblox profile ID ${activeAccount.robloxUserId}`}
            className="hidden sm:flex h-8 px-2.5 rounded-full bg-[#181B24] border border-white/[0.06] items-center gap-1.5 text-xs font-medium text-[#E6EAF2] hover:bg-[#222736] transition-colors whitespace-nowrap shrink-0"
          >
            <span className="w-2 h-2 rounded-full bg-[#4ADE80]" />
            <span className="font-mono-tabular text-[11px] text-[#B8C0D6]">
              ID #{activeAccount.robloxUserId}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenConnectAccount}
            aria-label="Connect your Roblox account"
            className="hidden sm:flex h-8 px-2.5 rounded-full bg-[#1E2538] border border-[#6E96FF]/35 items-center gap-1.5 text-xs font-semibold text-[#A8C4FF] hover:bg-[#26304A] hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Connect Roblox</span>
          </button>
        )}

        {/* Account Switcher (Multi-Account Isolation) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setAccountMenuOpen((v) => !v);
              setAppMenuOpen(false);
              setNotifOpen(false);
            }}
            aria-expanded={accountMenuOpen}
            aria-label={`Active account ${activeAccount.username}`}
            className="h-8 pl-1.5 pr-2.5 rounded-full bg-[#181B24] border border-white/[0.06] flex items-center gap-2 text-xs font-medium text-[#F3F5F9] hover:bg-[#222736] transition-colors whitespace-nowrap shrink-0"
          >
            <RobloxAvatar
              style={activeAccount.avatarStyle}
              src={activeAccount.avatarUrl}
              alt={activeAccount.displayName}
              size={22}
            />
            <span className="hidden sm:inline">{activeAccount.displayName}</span>
            {activeAccount.verifiedBadge && (
              <BadgeCheck className="hidden sm:inline w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
            )}
            <ChevronDown className="w-3.5 h-3.5 text-[#7C859C]" />
          </button>

          {accountMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-68 rounded-xl bg-[#161923] border border-white/[0.09] shadow-2xl p-1.5 z-50">
              <div className="px-2.5 py-1.5 text-[11px] font-medium text-[#7C859C]">
                Isolated Roblox Accounts
              </div>
              {accounts.map((acc) => {
                const isSelected = acc.id === activeAccount.id;
                const accRunning = runningInstances.some((i) => i.accountId === acc.id);
                const isReal = Boolean(acc.robloxUserId);
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => {
                      onSwitchAccount(acc.id);
                      setAccountMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-left transition-colors ${
                      isSelected ? 'bg-white/[0.08] text-white' : 'text-[#C6CEE0] hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <RobloxAvatar
                        style={acc.avatarStyle}
                        src={acc.avatarUrl}
                        alt={acc.displayName}
                        size={28}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate flex items-center gap-1">
                          <span className="truncate">{acc.displayName}</span>
                          {acc.verifiedBadge && (
                            <BadgeCheck className="w-3 h-3 text-[#38BDF8] shrink-0" />
                          )}
                        </p>
                        <p className="text-[11px] text-[#7E879E] font-mono-tabular truncate">
                          {isReal ? `@${acc.username}` : `Demo · R$ ${acc.robux.toLocaleString()}`}{' '}
                          {accRunning ? '· In game' : '· Ready'}
                        </p>
                      </div>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#7FA6FF] shrink-0" />}
                  </button>
                );
              })}
              <div className="border-t border-white/[0.06] mt-1 pt-1 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    onOpenConnectAccount();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-white bg-[#1E2538] hover:bg-[#28334E] transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5 text-[#7FA6FF]" />
                  Connect Your Roblox Account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    onNavigate('instances');
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-[#93B4FF] hover:bg-white/[0.05] transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Manage Multi-Instance Isolation
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Live Running / Recent Instances & Second-Screen HUD Trigger */}
        <button
          type="button"
          onClick={onOpenHud}
          aria-label={`Open live second-screen HUD, ${runningCount} active instances`}
          data-testid="hud-pill-trigger"
          className="h-8 px-3 rounded-full bg-[#181B24] border border-white/[0.07] hover:bg-[#222736] hover:border-[#6E96FF]/40 flex items-center gap-2 text-xs font-medium text-[#E2E7F4] transition-colors whitespace-nowrap shrink-0"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              runningCount > 0 ? 'bg-[#4ADE80]' : 'bg-[#64748B]'
            }`}
          />
          <span className="font-mono-tabular">
            {runningCount > 0 ? `${runningCount} running` : '0 active'}
          </span>
          <Activity className="w-3.5 h-3.5 text-[#7FA6FF]" />
        </button>
      </div>
    </header>
  );
}
