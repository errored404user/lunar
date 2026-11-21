import React, { useState } from 'react';
import { Command, Play, Plus, Trash2, Zap } from 'lucide-react';
import type { MacroPreset } from '../../types/lunar';

interface MacrosViewProps {
  macros: MacroPreset[];
  onToggleMacro: (macroId: string) => void;
  onAddMacro: (macro: MacroPreset) => void;
  onDeleteMacro: (macroId: string) => void;
}

export function MacrosView({
  macros,
  onToggleMacro,
  onAddMacro,
  onDeleteMacro,
}: MacrosViewProps) {
  const [name, setName] = useState('');
  const [hotkey, setHotkey] = useState('F8');
  const [targetGame, setTargetGame] = useState('All Instances');
  const [repeatMode, setRepeatMode] = useState<MacroPreset['repeatMode']>('Toggle Loop');
  const [actionKey, setActionKey] = useState('E');
  const [delayMs, setDelayMs] = useState('120');
  const [formError, setFormError] = useState('');
  const [testingId, setTestingId] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Give your macro a clear name.');
      return;
    }
    const parsedDelay = Math.max(10, Number(delayMs) || 100);
    const created: MacroPreset = {
      id: `mac-${Date.now()}`,
      name: name.trim(),
      description: `Custom ${repeatMode.toLowerCase()} macro pressing ${actionKey} every ${parsedDelay}ms.`,
      hotkey: hotkey.trim() || 'F8',
      enabled: true,
      repeatMode,
      targetGame: targetGame.trim() || 'All Instances',
      steps: [
        { id: `step-${Date.now()}-1`, key: actionKey.trim() || 'E', action: 'Press', delayMs: parsedDelay },
      ],
    };
    onAddMacro(created);
    setName('');
    setFormError('');
  };

  const runDryTest = (id: string) => {
    setTestingId(id);
    window.setTimeout(() => {
      setTestingId((curr) => (curr === id ? null : curr));
    }, 1100);
  };

  return (
    <div className="h-full overflow-y-auto px-5 py-4 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-white">Macros &amp; Keybinds</h1>
          <p className="text-xs text-[#8B94AB]">
            Low-level desktop input macros scoped per Roblox instance or globally across your desktop
          </p>
        </div>
        <span className="text-xs font-mono-tabular text-[#93B4FF]">
          {macros.filter((m) => m.enabled).length} of {macros.length} armed
        </span>
      </div>

      {/* Create New Macro Card */}
      <form
        onSubmit={handleCreate}
        className="rounded-2xl bg-[#151822] border border-white/[0.08] p-4 space-y-3"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Create Macro Preset</h2>
          {formError && <span className="text-xs text-[#F87171]">{formError}</span>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2 space-y-1">
            <label htmlFor="macro-name" className="text-[11px] text-[#8B94AB]">
              Macro Name
            </label>
            <input
              id="macro-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setFormError('');
              }}
              placeholder="e.g. Auto-Interact Harvest"
              className="w-full h-9 px-3 rounded-lg bg-[#1C202D] border border-white/[0.08] text-xs text-white placeholder:text-[#667085] focus:outline-none focus:border-[#6E96FF]"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="macro-hotkey" className="text-[11px] text-[#8B94AB]">
              Hotkey
            </label>
            <input
              id="macro-hotkey"
              type="text"
              value={hotkey}
              onChange={(e) => setHotkey(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-[#1C202D] border border-white/[0.08] text-xs text-white font-mono-tabular focus:outline-none focus:border-[#6E96FF]"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="macro-key" className="text-[11px] text-[#8B94AB]">
              Input Key
            </label>
            <input
              id="macro-key"
              type="text"
              value={actionKey}
              onChange={(e) => setActionKey(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-[#1C202D] border border-white/[0.08] text-xs text-white font-mono-tabular focus:outline-none focus:border-[#6E96FF]"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="macro-delay" className="text-[11px] text-[#8B94AB]">
              Interval (ms)
            </label>
            <input
              id="macro-delay"
              type="number"
              min={10}
              value={delayMs}
              onChange={(e) => setDelayMs(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-[#1C202D] border border-white/[0.08] text-xs text-white font-mono-tabular focus:outline-none focus:border-[#6E96FF]"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full h-9 rounded-lg bg-white text-[#0E1015] hover:bg-[#E5ECFF] text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Macro
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs text-[#8B94AB]">
          <label className="inline-flex items-center gap-2">
            <span>Mode:</span>
            <select
              aria-label="Macro repeat mode"
              value={repeatMode}
              onChange={(e) => setRepeatMode(e.target.value as MacroPreset['repeatMode'])}
              className="h-7 px-2 rounded bg-[#1C202D] border border-white/[0.08] text-xs text-white"
            >
              <option value="Toggle Loop">Toggle Loop</option>
              <option value="Hold">Hold</option>
              <option value="Run Once">Run Once</option>
            </select>
          </label>
          <label className="inline-flex items-center gap-2">
            <span>Target:</span>
            <input
              type="text"
              value={targetGame}
              onChange={(e) => setTargetGame(e.target.value)}
              className="h-7 px-2 rounded bg-[#1C202D] border border-white/[0.08] text-xs text-white w-48"
            />
          </label>
        </div>
      </form>

      {/* Macro Presets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 pb-6">
        {macros.map((macro) => {
          const isTesting = testingId === macro.id;
          return (
            <article
              key={macro.id}
              className={`rounded-2xl border p-4 space-y-3 transition-colors ${
                macro.enabled
                  ? 'bg-[#171C28] border-[#6E96FF]/35'
                  : 'bg-[#151822] border-white/[0.07]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Command className="w-4 h-4 text-[#7FA6FF] shrink-0" />
                    <h3 className="text-sm font-semibold text-white truncate">{macro.name}</h3>
                  </div>
                  <p className="text-xs text-[#8B94AB] mt-1">{macro.description}</p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={macro.enabled}
                  aria-label={`Toggle ${macro.name}`}
                  onClick={() => onToggleMacro(macro.id)}
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors shrink-0 ${
                    macro.enabled ? 'bg-[#3B82F6]' : 'bg-[#2A3042]'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      macro.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Steps Sequence */}
              <div className="flex flex-wrap items-center gap-1.5">
                {macro.steps.map((step) => (
                  <span
                    key={step.id}
                    className={`px-2 py-1 rounded-md text-[11px] font-mono-tabular border ${
                      isTesting
                        ? 'bg-[#163626] border-[#4ADE80]/50 text-[#4ADE80]'
                        : 'bg-[#10131B] border-white/[0.07] text-[#C6CEE0]'
                    }`}
                  >
                    {step.action} [{step.key}] · {step.delayMs}ms
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-xs">
                <div className="text-[#8B94AB] flex items-center gap-2">
                  <span className="font-mono-tabular text-white font-semibold">{macro.hotkey}</span>
                  <span aria-hidden="true">·</span>
                  <span>{macro.repeatMode}</span>
                  <span aria-hidden="true">·</span>
                  <span className="truncate max-w-[140px]">{macro.targetGame}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => runDryTest(macro.id)}
                    className="px-2.5 py-1 rounded-lg bg-[#202536] hover:bg-[#2A3147] text-[11px] font-medium text-[#E2E7F4] inline-flex items-center gap-1"
                  >
                    {isTesting ? <Zap className="w-3 h-3 text-[#4ADE80]" /> : <Play className="w-3 h-3" />}
                    {isTesting ? 'Triggered' : 'Test'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteMacro(macro.id)}
                    aria-label={`Delete ${macro.name}`}
                    className="p-1.5 rounded-lg text-[#7E879E] hover:text-[#F87171] hover:bg-white/[0.05]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
