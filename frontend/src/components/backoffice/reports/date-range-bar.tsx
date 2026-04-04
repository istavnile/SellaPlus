'use client';

import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface DateRange { from: Date; to: Date; }

type Preset = 'today' | 'yesterday' | '7d' | '30d';

function makePreset(preset: Preset): DateRange {
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

  if (preset === 'today') return { from: todayStart, to: todayEnd };
  if (preset === 'yesterday') {
    const f = new Date(todayStart); f.setDate(f.getDate() - 1);
    const t = new Date(f); t.setHours(23, 59, 59, 999);
    return { from: f, to: t };
  }
  if (preset === '7d') {
    const f = new Date(todayStart); f.setDate(f.getDate() - 6);
    return { from: f, to: todayEnd };
  }
  // 30d
  const f = new Date(todayStart); f.setDate(f.getDate() - 29);
  return { from: f, to: todayEnd };
}

function fmt(d: Date) {
  return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
}

const PRESETS: { key: Preset; label: string }[] = [
  { key: 'today',     label: 'Hoy' },
  { key: 'yesterday', label: 'Ayer' },
  { key: '7d',        label: '7 días' },
  { key: '30d',       label: '30 días' },
];

interface Props {
  from: Date;
  to: Date;
  onChange: (r: DateRange) => void;
  onExport?: () => void;
  exportLabel?: string;
}

export function DateRangeBar({ from, to, onChange, onExport, exportLabel = 'Exportar' }: Props) {
  const rangeMs = to.getTime() - from.getTime();

  function shift(dir: -1 | 1) {
    const newFrom = new Date(from.getTime() + dir * rangeMs);
    const newTo   = new Date(to.getTime()   + dir * rangeMs);
    onChange({ from: newFrom, to: newTo });
  }

  function activePreset(): Preset | null {
    for (const { key } of PRESETS) {
      const r = makePreset(key);
      if (Math.abs(r.from.getTime() - from.getTime()) < 1000 &&
          Math.abs(r.to.getTime()   - to.getTime())   < 1000) return key;
    }
    return null;
  }

  const active = activePreset();

  return (
    <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
      {/* Preset pills */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
        {PRESETS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onChange(makePreset(key))}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              active === key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Arrow navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => shift(-1)}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm text-gray-700 font-medium min-w-[200px] text-center">
          {fmt(from)} — {fmt(to)}
        </span>
        <button
          onClick={() => shift(1)}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Export button */}
      {onExport && (
        <button
          onClick={onExport}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Download size={14} />
          {exportLabel}
        </button>
      )}
    </div>
  );
}

export function useDateRange(defaultPreset: Preset = '30d') {
  const initial = makePreset(defaultPreset);
  return { initial };
}
