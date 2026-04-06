'use client';

import { useState, Fragment, useMemo } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface DateRange {
  from: Date;
  to: Date;
}

interface DateRangePickerProps {
  range: DateRange;
  onChange: (range: DateRange) => void;
}

const PRESETS = [
  { label: 'Hoy',            getValue: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }) },
  { label: 'Ayer',           getValue: () => { const d = new Date(); d.setDate(d.getDate() - 1); return { from: startOfDay(d), to: endOfDay(d) }; } },
  { label: 'Esta semana',    getValue: () => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return { from: startOfDay(d), to: endOfDay(new Date()) }; } },
  { label: 'Última semana',  getValue: () => { const to = new Date(); to.setDate(to.getDate() - to.getDay() - 1); const from = new Date(to); from.setDate(from.getDate() - 6); return { from: startOfDay(from), to: endOfHour(to) }; } },
  { label: 'Este mes',       getValue: () => ({ from: new Date(new Date().getFullYear(), new Date().getMonth(), 1), to: endOfDay(new Date()) }) },
  { label: 'Último mes',     getValue: () => { const from = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1); const to = new Date(new Date().getFullYear(), new Date().getMonth(), 0); return { from: startOfDay(from), to: endOfDay(to) }; } },
  { label: 'Últimos 7 días', getValue: () => { const from = new Date(); from.setDate(from.getDate() - 6); return { from: startOfDay(from), to: endOfDay(new Date()) }; } },
  { label: 'Últimos 30 días',getValue: () => { const from = new Date(); from.setDate(from.getDate() - 29); return { from: startOfDay(from), to: endOfDay(new Date()) }; } },
];

function startOfDay(d: Date) { const res = new Date(d); res.setHours(0,0,0,0); return res; }
function endOfDay(d: Date)   { const res = new Date(d); res.setHours(23,59,59,999); return res; }
function endOfHour(d: Date)  { const res = new Date(d); res.setHours(23,59,59,999); return res; }

export function DateRangePicker({ range, onChange }: DateRangePickerProps) {
  const [viewDate, setViewDate] = useState(new Date(range.from));

  const days = useMemo(() => {
    const year  = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const prevMonthDays = new Date(year, month, 0).getDate();
    const result = [];

    // Prev month padding
    for (let i = firstDay - 1; i >= 0; i--) {
      result.push({ date: new Date(year, month - 1, prevMonthDays - i), current: false });
    }
    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
        result.push({ date: new Date(year, month, i), current: true });
    }
    // Next month padding
    const remaining = 42 - result.length;
    for (let i = 1; i <= remaining; i++) {
        result.push({ date: new Date(year, month + 1, i), current: false });
    }
    return result;
  }, [viewDate]);

  const handleDateClick = (date: Date) => {
    // If selecting start or second click resets to range?
    // Let's implement a simple "Start-then-End" logic
    if (range.from.getTime() === range.to.getTime() || (date < range.from)) {
        onChange({ from: startOfDay(date), to: endOfDay(date) });
    } else {
        onChange({ from: range.from, to: endOfDay(date) });
    }
  };

  const isSelected = (d: Date) => {
    const time = startOfDay(d).getTime();
    return time >= startOfDay(range.from).getTime() && time <= startOfDay(range.to).getTime();
  };

  const formatLabel = () => {
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    return `${range.from.toLocaleDateString('es-PE', opts)} - ${range.to.toLocaleDateString('es-PE', opts)}`;
  };

  return (
    <Popover className="relative">
      <Popover.Button className="flex w-full sm:w-auto items-center justify-between gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all font-medium sm:min-w-[240px] shadow-sm">
        <div className="flex items-center gap-3">
           <div className="w-5 h-5 rounded flex items-center justify-center border border-gray-300 shrink-0">
             <div className="w-2.5 h-[1px] bg-gray-400 absolute" />
           </div>
           <span className="text-gray-800 truncate">{formatLabel()}</span>
        </div>
        <ChevronDown size={14} className="text-gray-400 shrink-0" />
      </Popover.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-200"
        enterFrom="opacity-0 translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-1"
      >
        <Popover.Panel className="absolute z-50 mt-2 flex bg-white border border-gray-200 shadow-2xl rounded-2xl overflow-hidden min-w-[600px] left-0">
          {/* Calendar Side */}
          <div className="flex-1 p-6 border-r border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="p-1 hover:bg-gray-100 rounded text-gray-400">
                <ChevronLeft size={20} />
              </button>
              <h4 className="text-sm font-bold text-gray-800 capitalize">
                {viewDate.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })}
              </h4>
              <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="p-1 hover:bg-gray-100 rounded text-gray-400">
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'].map(d => (
                <div key={d} className="text-center text-[10px] font-bold text-gray-400 uppercase py-2">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-1">
              {days.map((d, i) => {
                const active = isSelected(d.date);
                const isStart = startOfDay(d.date).getTime() === startOfDay(range.from).getTime();
                const isEnd   = startOfDay(d.date).getTime() === startOfDay(range.to).getTime();
                
                return (
                  <button 
                    key={i} 
                    onClick={() => handleDateClick(d.date)}
                    className={cn(
                      "h-10 w-full text-xs flex items-center justify-center relative transition-colors",
                      !d.current && "text-gray-300",
                      d.current && !active && "text-gray-700 hover:bg-gray-50 rounded-lg",
                      active && "bg-brand-50 text-brand-700",
                      isStart && "rounded-l-lg bg-brand-600 text-white font-bold",
                      isEnd && "rounded-r-lg bg-brand-600 text-white font-bold",
                      isStart && isEnd && "rounded-lg"
                    )}
                  >
                    {d.date.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4">
               <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-gray-400">Fecha de inicio</label>
                  <input 
                    type="text" 
                    readOnly 
                    value={range.from.toLocaleDateString('es-PE')} 
                    className="w-full border-b border-gray-200 py-1 text-sm focus:outline-none focus:border-brand-500 font-medium"
                  />
               </div>
               <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-gray-400">Fecha de finalización</label>
                  <input 
                    type="text" 
                    readOnly 
                    value={range.to.toLocaleDateString('es-PE')} 
                    className="w-full border-b border-gray-200 py-1 text-sm focus:outline-none focus:border-brand-500 font-medium"
                  />
               </div>
            </div>
          </div>

          {/* Presets Side */}
          <div className="w-56 bg-white flex flex-col p-2 pt-6">
            {PRESETS.map(p => (
                <button 
                  key={p.label}
                  onClick={() => onChange(p.getValue())}
                  className="px-6 py-3 text-left text-sm text-gray-600 hover:bg-brand-50 hover:text-brand-700 rounded-lg transition-colors font-medium"
                >
                  {p.label}
                </button>
            ))}
          </div>
        </Popover.Panel>
      </Transition>
    </Popover>
  );
}
