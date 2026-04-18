import { useState } from "react";

interface Settings {
  workMinutes: number;
  breakMinutes: number;
  longBreakMinutes: number;
  cyclesBeforeLongBreak: number;
}

interface SettingsModalProps {
  settings: Settings;
  onSave: (settings: Settings) => void;
  onClose: () => void;
}

export function SettingsModal({ settings, onSave, onClose }: SettingsModalProps) {
  const [local, setLocal] = useState({ ...settings });

  const handleSave = () => {
    const validated = {
      workMinutes: Math.max(1, Math.min(99, local.workMinutes)),
      breakMinutes: Math.max(1, Math.min(60, local.breakMinutes)),
      longBreakMinutes: Math.max(1, Math.min(60, local.longBreakMinutes)),
      cyclesBeforeLongBreak: Math.max(1, Math.min(10, local.cyclesBeforeLongBreak)),
    };
    onSave(validated);
  };

  const Field = ({
    label,
    field,
    min,
    max,
    emoji,
  }: {
    label: string;
    field: keyof Settings;
    min: number;
    max: number;
    emoji: string;
  }) => (
    <div className="flex items-center justify-between gap-4">
      <label className="flex items-center gap-2 text-sm font-bold text-foreground flex-1">
        <span>{emoji}</span>
        <span>{label}</span>
      </label>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setLocal((p) => ({ ...p, [field]: Math.max(min, (p[field] as number) - 1) }))}
          className="w-8 h-8 rounded-full bg-muted hover:bg-accent text-foreground font-bold text-lg transition-colors flex items-center justify-center"
        >
          −
        </button>
        <input
          type="number"
          value={local[field] as number}
          onChange={(e) => setLocal((p) => ({ ...p, [field]: Number(e.target.value) }))}
          min={min}
          max={max}
          className="w-14 text-center text-sm font-bold rounded-xl border-2 border-border bg-background text-foreground py-1 focus:outline-none focus:border-primary"
        />
        <button
          onClick={() => setLocal((p) => ({ ...p, [field]: Math.min(max, (p[field] as number) + 1) }))}
          className="w-8 h-8 rounded-full bg-muted hover:bg-accent text-foreground font-bold text-lg transition-colors flex items-center justify-center"
        >
          +
        </button>
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="bg-card rounded-3xl shadow-2xl w-full max-w-sm p-6 bounce-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl text-primary">Settings</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl transition-colors">✕</button>
        </div>

        <div className="space-y-5">
          <Field label="Focus time (min)" field="workMinutes" min={1} max={99} emoji="🍅" />
          <div className="h-px bg-border" />
          <Field label="Short break (min)" field="breakMinutes" min={1} max={60} emoji="☕" />
          <Field label="Long break (min)" field="longBreakMinutes" min={1} max={60} emoji="🌙" />
          <Field label="Cycles before long break" field="cyclesBeforeLongBreak" min={1} max={10} emoji="🔄" />
        </div>

        <div className="flex gap-3 mt-7">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border-2 border-border text-muted-foreground font-bold text-sm hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 rounded-2xl font-bold text-sm text-white transition-all hover:scale-105 active:scale-95"
            style={{ background: 'hsl(var(--primary))' }}
          >
            Save ✨
          </button>
        </div>
      </div>
    </div>
  );
}
