import React from 'react';
import {
  Box,
  Camera,
  Command,
  Gamepad2,
  Globe,
  MessageSquare,
  Rocket,
  Settings,
  ShoppingBag,
  Users,
} from 'lucide-react';
import type { NavSection } from '../types/lunar';

interface LeftRailProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  pendingFriendRequests: number;
  unreadMessages: number;
  runningInstancesCount: number;
}

const PRIMARY_ITEMS: { id: NavSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'launchpad', label: 'Launchpad', icon: Rocket },
  { id: 'discovery', label: 'Discovery', icon: Gamepad2 },
  { id: 'players', label: 'Players', icon: Users },
  { id: 'communities', label: 'Communities', icon: Globe },
  { id: 'marketplace', label: 'Marketplace', icon: ShoppingBag },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'captures', label: 'Captures', icon: Camera },
];

const UTILITY_ITEMS: { id: NavSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'instances', label: 'Isolated Instances', icon: Box },
  { id: 'macros', label: 'Macros', icon: Command },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function LeftRail({
  activeSection,
  onSelectSection,
  pendingFriendRequests,
  unreadMessages,
  runningInstancesCount,
}: LeftRailProps) {
  return (
    <aside
      aria-label="Primary launcher navigation"
      className="w-14 shrink-0 bg-[#0E1015] border-r border-white/[0.06] flex flex-col items-center justify-between py-3 select-none"
    >
      {/* Top primary navigation icons (exact 7-icon order from Lunar for Roblox) */}
      <nav className="flex flex-col items-center gap-1.5">
        {PRIMARY_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          const badge =
            item.id === 'players' && pendingFriendRequests > 0
              ? pendingFriendRequests
              : item.id === 'messages' && unreadMessages > 0
                ? unreadMessages
                : 0;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectSection(item.id)}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              title={item.label}
              className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                isActive
                  ? 'bg-[#232736] text-white shadow-inner border border-white/[0.08]'
                  : 'text-[#7F889E] hover:text-[#E2E7F4] hover:bg-white/[0.05]'
              }`}
            >
              <Icon className="w-[18px] h-[18px]" />
              {badge > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#DC2626] text-[10px] font-bold text-white flex items-center justify-center leading-none shadow">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom utility icons (exact 3-icon stack: Instances cube, Macros command, Settings gear) */}
      <div className="flex flex-col items-center gap-1.5 pt-3 border-t border-white/[0.06]">
        {UTILITY_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          const showRunningCount = item.id === 'instances' && runningInstancesCount > 0;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectSection(item.id)}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              title={item.label}
              className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                isActive
                  ? 'bg-[#232736] text-white border border-white/[0.08]'
                  : 'text-[#7F889E] hover:text-[#E2E7F4] hover:bg-white/[0.05]'
              }`}
            >
              <Icon className="w-[18px] h-[18px]" />
              {showRunningCount && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#2563EB] text-[10px] font-bold text-white flex items-center justify-center leading-none">
                  {runningInstancesCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
