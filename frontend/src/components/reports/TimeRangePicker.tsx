'use client';

import { useState, Fragment } from 'react';
import { Popover, Transition, RadioGroup } from '@headlessui/react';
import { 
  Clock, 
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface TimeRange {
    from: string; // "12 AM" format or 24h internal
    to: string;
    isCustom: boolean;
}

interface TimeRangePickerProps {
    value: TimeRange;
    onChange: (value: TimeRange) => void;
}

const HOURS = [
    "12 AM", "1 AM", "2 AM", "3 AM", "4 AM", "5 AM", "6 AM", "7 AM", "8 AM", "9 AM", "10 AM", "11 AM",
    "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM", "6 PM", "7 PM", "8 PM", "9 PM", "10 PM", "11 PM"
];

export function TimeRangePicker({ value, onChange }: TimeRangePickerProps) {
    
    const handleOptionChange = (isCustom: boolean) => {
        if (!isCustom) {
            onChange({ from: "12 AM", to: "11 PM", isCustom: false });
        } else {
            onChange({ ...value, isCustom: true });
        }
    };

    return (
        <Popover className="relative">
            <Popover.Button className="flex w-full sm:w-auto items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all font-medium min-w-[160px] justify-between shadow-sm group">
                <div className="flex items-center gap-2">
                    <Clock size={18} className="text-gray-400 group-hover:text-brand-500 transition-colors" />
                    <span className="text-gray-800">
                        {value.isCustom ? `${value.from} - ${value.to}` : "Día entero"}
                    </span>
                </div>
                <ChevronDown size={14} className="text-gray-400" />
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
                <Popover.Panel className="absolute z-50 mt-2 w-72 bg-white border border-gray-100 shadow-2xl rounded-2xl p-4 right-0 md:left-0 flex flex-col gap-4">
                    <RadioGroup value={value.isCustom} onChange={handleOptionChange}>
                        <div className="space-y-1">
                            <RadioGroup.Option value={false} className={({ active, checked }) => cn(
                                "flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all",
                                checked ? "bg-brand-50" : "hover:bg-gray-50"
                            )}>
                                {({ checked }) => (
                                    <>
                                        <div className={cn(
                                            "w-5 h-5 rounded-full border flex items-center justify-center transition-all",
                                            checked ? "border-brand-600 border-[6px]" : "border-gray-300"
                                        )} />
                                        <span className={cn("text-sm font-medium", checked ? "text-brand-800" : "text-gray-700")}>Día entero</span>
                                    </>
                                )}
                            </RadioGroup.Option>

                            <RadioGroup.Option value={true} className={({ active, checked }) => cn(
                                "flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all",
                                checked ? "bg-brand-50" : "hover:bg-gray-50"
                            )}>
                                {({ checked }) => (
                                    <>
                                        <div className={cn(
                                            "w-5 h-5 rounded-full border flex items-center justify-center transition-all",
                                            checked ? "border-brand-600 border-[6px]" : "border-gray-300"
                                        )} />
                                        <span className={cn("text-sm font-medium", checked ? "text-brand-800" : "text-gray-700")}>Periodo personalizado</span>
                                    </>
                                )}
                            </RadioGroup.Option>
                        </div>
                    </RadioGroup>

                    {value.isCustom && (
                        <div className="flex gap-4 px-3 pb-2 animate-in fade-in slide-in-from-top-1">
                            <div className="flex-1 flex flex-col gap-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Comienzo</label>
                                <div className="relative">
                                    <select 
                                        value={value.from} 
                                        onChange={(e) => onChange({...value, from: e.target.value})}
                                        className="w-full bg-transparent border-b border-gray-200 py-1 text-sm font-medium text-gray-800 focus:outline-none focus:border-brand-500 appearance-none pr-4"
                                    >
                                        {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                    <ChevronDown size={12} className="absolute right-0 top-2 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                            <div className="flex-1 flex flex-col gap-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Fin</label>
                                <div className="relative">
                                    <select 
                                        value={value.to} 
                                        onChange={(e) => onChange({...value, to: e.target.value})}
                                        className="w-full bg-transparent border-b border-gray-200 py-1 text-sm font-medium text-gray-800 focus:outline-none focus:border-brand-500 appearance-none pr-4"
                                    >
                                        {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                    <ChevronDown size={12} className="absolute right-0 top-2 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>
                    )}
                </Popover.Panel>
            </Transition>
        </Popover>
    );
}
