import React, { useEffect, useState } from 'react';
import {
  Activity,
  Camera,
  Cpu,
  Gauge,
  Layers,
  Monitor,
  Pause,
  Play,
  Plus,
  Square,
  UserPlus,
  Wifi,
} from 'lucide-react';
import type {
  RobloxAccount,
  RobloxGame,
  RunningInstance,
} from '../../types/lunar';
import { RobloxAvatar } from '../LunarBrand';

interface InstancesViewProps {
  instances: RunningInstance[];
  accounts: RobloxAccount[];
  games: RobloxGame[];
  fpsBadgeText: string;
  onLaunchIsolated: (
    accountId: string,
    gameId: string,
    windowMode: RunningInstance['windowMode'],
  ) => void;
  onTogglePauseInstance: (instanceId: string) => void;
  onStopInstance: (instanceId: string) => void;
  onCaptureInstance: (instance: RunningInstance) => void;
  onOpenHud: () => void;
  onOpenConnectAccount: () => void;
}

export function InstancesView({
  instances,
  accounts,
  games,
  fpsBadgeText,
  onLaunchIsolated,
  onTogglePauseInstance,
  onStopInstance,
  onCaptureInstance,
  onOpenHud,
  onOpenConnectAccount,
}: InstancesViewProps) {
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id ?? '');
  const [selectedGameId, setSelectedGameId] = useState(games[0]?.id ?? '');
  const [windowMode, setWindowMode] =
    useState<RunningInstance['windowMode']>('Windowed 1280×720');

  useEffect(() => {
    if (!accounts.some((a) => a.id === selectedAccountId) && accounts[0]) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  const totalMemoryMb = instances.reduce((acc, inst) => acc + inst.memoryMb, 0);

  return (
    <div className="h-full overflow-y-auto px-5 py-4 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-white">Isolated Instances</h1>
          <p className="text-xs text-[#8B94AB]">
            Run unlimited Roblox accounts simultaneously with sandboxed cookies, caches, and uncapped FPS
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onOpenConnectAccount}
            className="px-3.5 py-2 rounded-lg bg-white hover:bg-[#E5ECFF] text-[#0E1015] text-xs font-bold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Connect Roblox Account
          </button>
          <button
            type="button"
            onClick={onOpenHud}
            className="px-3.5 py-2 rounded-lg bg-[#1A2030] hover:bg-[#232B40] border border-white/[0.09] text-xs font-semibold text-[#93B4FF] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Activity className="w-3.5 h-3.5" />
            Open Second-Screen HUD
          </button>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl bg-[#151822] border border-white/[0.07] p-4">
          <div className="flex items-center gap-2 text-xs text-[#8B94AB]">
            <Layers className="w-4 h-4 text-[#7FA6FF]" />
            <span>Running Containers</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-white font-mono-tabular">
            {instances.length} <span className="text-xs font-normal text-[#7E879E]">/ Unlimited</span>
          </p>
        </div>

        <div className="rounded-xl bg-[#151822] border border-white/[0.07] p-4">
          <div className="flex items-center gap-2 text-xs text-[#8B94AB]">
            <Gauge className="w-4 h-4 text-[#4ADE80]" />
            <span>Global FPS Cap</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-white font-mono-tabular">
            {fpsBadgeText} <span className="text-xs font-normal text-[#4ADE80]">FPS</span>
          </p>
        </div>

        <div className="rounded-xl bg-[#151822] border border-white/[0.07] p-4">
          <div className="flex items-center gap-2 text-xs text-[#8B94AB]">
            <Cpu className="w-4 h-4 text-[#A78BFA]" />
            <span>Combined Memory</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-white font-mono-tabular">
            {(totalMemoryMb / 1024).toFixed(2)}{' '}
            <span className="text-xs font-normal text-[#7E879E]">GB</span>
          </p>
        </div>
      </div>

      {/* Launch New Isolated Instance Form */}
      <section className="rounded-2xl bg-[#151822] border border-white/[0.08] p-4 space-y-3">
        <h2 className="text-sm font-semibold text-white">Spin Up Isolated Instance</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label htmlFor="inst-account" className="text-[11px] font-medium text-[#8B94AB]">
              Account Sandbox
            </label>
            <select
              id="inst-account"
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-[#1C202D] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-[#6E96FF]"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id} className="bg-[#1C202D]">
                  {acc.username}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="inst-game" className="text-[11px] font-medium text-[#8B94AB]">
              Experience
            </label>
            <select
              id="inst-game"
              value={selectedGameId}
              onChange={(e) => setSelectedGameId(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-[#1C202D] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-[#6E96FF]"
            >
              {games.map((g) => (
                <option key={g.id} value={g.id} className="bg-[#1C202D]">
                  {g.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="inst-window" className="text-[11px] font-medium text-[#8B94AB]">
              Window Mode
            </label>
            <select
              id="inst-window"
              value={windowMode}
              onChange={(e) =>
                setWindowMode(e.target.value as RunningInstance['windowMode'])
              }
              className="w-full h-9 px-3 rounded-lg bg-[#1C202D] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-[#6E96FF]"
            >
              <option value="Borderless" className="bg-[#1C202D]">Borderless</option>
              <option value="Windowed 1280×720" className="bg-[#1C202D]">Windowed 1280×720</option>
              <option value="Fullscreen" className="bg-[#1C202D]">Fullscreen</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => onLaunchIsolated(selectedAccountId, selectedGameId, windowMode)}
              className="w-full h-9 rounded-lg bg-white text-[#0E1015] hover:bg-[#E5ECFF] text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              Launch Instance
            </button>
          </div>
        </div>
      </section>

      {/* Active Instances List */}
      <section className="space-y-3 pb-6">
        <h2 className="text-sm font-semibold text-white">Active Processes ({instances.length})</h2>
        {instances.length === 0 ? (
          <div className="rounded-2xl bg-[#151822] border border-white/[0.06] p-10 text-center">
            <p className="text-sm font-semibold text-white">No active Roblox instances</p>
            <p className="text-xs text-[#7E879E] mt-1">
              Launch any experience above or from Launchpad to spawn an isolated process.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5">
            {instances.map((inst) => {
              const acc = accounts.find((a) => a.id === inst.accountId);
              return (
                <article
                  key={inst.id}
                  data-testid={`instance-card-${inst.id}`}
                  className="rounded-2xl bg-[#161923] border border-white/[0.08] p-4 flex flex-col gap-3.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={inst.gameThumbnail}
                        alt={inst.gameTitle}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-xl object-cover shrink-0 border border-white/10"
                      />
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-white truncate">
                          {inst.gameTitle}
                        </h3>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-[#9BA3B8]">
                          {acc && <RobloxAvatar style={acc.avatarStyle} size={16} />}
                          <span className="truncate">{inst.accountUsername}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-tabular text-[11px] text-[#7E879E]">
                            PID {inst.pid}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                        inst.status === 'running'
                          ? 'bg-[#132F22] text-[#4ADE80]'
                          : 'bg-[#2E2514] text-[#FBBF24]'
                      }`}
                    >
                      {inst.status === 'running' ? 'Running' : 'Paused'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-[#11141C] border border-white/[0.05]">
                      <span className="text-[10px] text-[#7E879E] block">Frame Rate</span>
                      <span className="font-mono-tabular font-semibold text-[#4ADE80]">
                        {inst.status === 'running' ? `${inst.liveFps} FPS` : '0 FPS'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#11141C] border border-white/[0.05]">
                      <span className="text-[10px] text-[#7E879E] block">Latency</span>
                      <span className="font-mono-tabular font-semibold text-white inline-flex items-center gap-1">
                        <Wifi className="w-3 h-3 text-[#4ADE80]" />
                        {inst.pingMs}ms
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#11141C] border border-white/[0.05]">
                      <span className="text-[10px] text-[#7E879E] block">Memory</span>
                      <span className="font-mono-tabular font-semibold text-[#DCE1EE]">
                        {inst.memoryMb} MB
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-[#7E879E]">
                      <Monitor className="w-3.5 h-3.5" />
                      {inst.windowMode} · {inst.serverRegion}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onCaptureInstance(inst)}
                        aria-label={`Capture screenshot of ${inst.gameTitle}`}
                        className="px-2.5 py-1.5 rounded-lg bg-[#1F2433] hover:bg-[#2A3146] text-xs font-medium text-[#E2E7F4] inline-flex items-center gap-1 transition-colors"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        Capture
                      </button>
                      <button
                        type="button"
                        onClick={() => onTogglePauseInstance(inst.id)}
                        aria-label={inst.status === 'running' ? `Pause ${inst.gameTitle}` : `Resume ${inst.gameTitle}`}
                        className="px-2.5 py-1.5 rounded-lg bg-[#1F2433] hover:bg-[#2A3146] text-xs font-medium text-[#E2E7F4] inline-flex items-center gap-1 transition-colors"
                      >
                        {inst.status === 'running' ? (
                          <>
                            <Pause className="w-3.5 h-3.5" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5" />
                            Resume
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => onStopInstance(inst.id)}
                        aria-label={`Stop ${inst.gameTitle}`}
                        className="px-2.5 py-1.5 rounded-lg bg-[#3E1A21] hover:bg-[#55222C] text-xs font-medium text-[#FCA5A5] inline-flex items-center gap-1 transition-colors"
                      >
                        <Square className="w-3 h-3 fill-current" />
                        Stop
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
