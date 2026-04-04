'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ChevronDown, ChevronLeft, ChevronRight,
  Clock, Users, Search, Columns, FileText,
  BarChart3, TrendingUp, RotateCcw, Tag, DollarSign, Wallet
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { DateRangePicker } from '@/components/reports/DateRangePicker';
import { TimeRangePicker } from '@/components/reports/TimeRangePicker';
import { SalesChart } from '@/components/reports/SalesChart';
import { cn } from '@/lib/utils/cn';

// ─── types ────────────────────────────────────────────────────────────────────
interface Summary {
  grossSales: number; refunds: number; discounts: number;
  netSales: number; grossProfit: number; totalTransactions: number;
}

interface DayData {
  date: string; grossSales: number; refunds: number; discounts: number; 
  netSales: number; cogs: number; grossProfit: number; 
  margin: number; taxes: number; count: number;
}

const money = (n: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 }).format(n);

// Start 30 days ago
const defaultFrom = new Date(); defaultFrom.setDate(defaultFrom.getDate() - 29); defaultFrom.setHours(0,0,0,0);
const defaultTo = new Date(); defaultTo.setHours(23,59,59,999);

const COLUMN_OPTIONS = [
  { id: 'grossSales', label: 'Ventas brutas' },
  { id: 'refunds',    label: 'Reembolsos' },
  { id: 'discounts',  label: 'Descuentos' },
  { id: 'netSales',   label: 'Ventas netas' },
  { id: 'cogs',       label: 'Costo de los bienes' },
  { id: 'grossProfit',label: 'Beneficio bruto' },
  { id: 'margin',     label: 'Margen' },
  { id: 'taxes',      label: 'Impuestos' },
];

export default function ResumenPage() {
  const [data, setData]       = useState<DayData[]>([]);
  const [summary, setSummary]   = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange]     = useState({ from: defaultFrom, to: defaultTo });
  const [time, setTime]       = useState({ from: '12 AM', to: '11 PM', isCustom: false });
  
  // Chart Controls
  const [chartType, setChartType] = useState<'bar' | 'area'>('area');
  const [grouping, setGrouping]   = useState<string>('day');

  // Column Picker State
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['grossSales', 'refunds', 'discounts', 'netSales', 'grossProfit']);

  const load = useCallback(async () => {
    setLoading(true);
    const params = `from=${range.from.toISOString()}&to=${range.to.toISOString()}`;
    try {
      const [sRes, dRes] = await Promise.all([
        apiClient.get(`/reports/sales/summary?${params}`),
        apiClient.get(`/reports/sales/daily?${params}`),
      ]);
      setSummary(sRes.data);
      const mapped = (dRes.data || []).map((d: any) => ({
        ...d,
        refunds: d.refunds || 0,
        cogs: d.cogs || 0,
        grossProfit: d.grossProfit || (d.netSales - (d.cogs || 0)),
        margin: d.margin || 0,
        taxes: d.taxes || 0,
      }));
      setData(mapped);
    } catch {
      setData([]);
    }
    setLoading(false);
  }, [range.from, range.to]);

  useEffect(() => { load(); }, [load]);

  const toggleColumn = (id: string) => {
    setVisibleColumns(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const exportCsv = () => {
    const activeCols = COLUMN_OPTIONS.filter(c => visibleColumns.includes(c.id));
    const headers = 'Fecha,' + activeCols.map(c => c.label).join(',') + '\n';
    
    const rows = data.map((d: any) => {
      const values = activeCols.map(c => Number(d[c.id] || 0).toFixed(2));
      return `${d.date},${values.join(',')}`;
    }).join('\n');

    const blob = new Blob(['\uFEFF' + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url;
    a.download = 'resumen-ventas.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const formatDateLabel = () => {
    return `${range.from.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })} - ${range.to.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  };

  const kpis = [
    { label: 'Ventas brutas', value: summary?.grossSales ?? 0, pct: '0%', color: 'border-brand-500' },
    { label: 'Reembolsos',    value: summary?.refunds    ?? 0, pct: '0%', color: 'border-transparent' },
    { label: 'Descuentos',    value: summary?.discounts  ?? 0, pct: '0%', color: 'border-transparent' },
    { label: 'Ventas netas',  value: summary?.netSales    ?? 0, pct: '0%', color: 'border-transparent' },
    { label: 'Beneficio bruto',value: summary?.grossProfit ?? 0, pct: '0%', color: 'border-transparent' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#f4f6f8]">
      {/* Header */}
      <div className="bg-brand-600 text-white px-6 py-4 flex items-center justify-between rounded-t-lg">
        <h1 className="text-xl font-normal">Resumen de ventas</h1>
      </div>

      <div className="p-6 bg-white border border-t-0 border-gray-200 rounded-b-xl shadow-sm mb-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <DateRangePicker 
            range={range} 
            onChange={(r) => setRange(r)} 
          />
          
          <TimeRangePicker 
            value={time} 
            onChange={(t) => setTime(t)} 
          />
          
          <button className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 font-medium transition-colors shadow-sm">
            <Users size={16} className="text-gray-400" /> Todos los colaboradores <ChevronDown size={14} className="ml-1 text-gray-400" />
          </button>
        </div>

        {/* KPIs Summary Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 bg-white border border-gray-200 rounded-lg overflow-hidden">
          {kpis.map((k, i) => (
            <div key={k.label} className={`p-6 text-center border-gray-100 ${i > 0 ? 'border-l' : ''} border-b-4 ${k.color}`}>
              <p className="text-[10px] font-bold text-gray-500 uppercase mb-2 tracking-tight">{k.label}</p>
              <p className="text-2xl font-light text-gray-900 font-secondary">{money(k.value)}</p>
              <p className="text-[10px] text-gray-400 font-medium mt-1">{money(k.value)} ({k.pct})</p>
            </div>
          ))}
        </div>
      </div>

      {/* Chart Area */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 mb-6 min-h-[400px] flex flex-col relative overflow-hidden">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-tight">Ventas brutas</h3>
          <div className="flex gap-6">
            <Menu as="div" className="relative">
               <Menu.Button className="flex items-center gap-1 text-xs text-brand-600 border-b border-brand-300 pb-0.5 cursor-pointer font-bold uppercase tracking-widest transition-colors hover:text-brand-700">
                  {chartType === 'area' ? 'Área' : 'Barras'} <ChevronDown size={12} />
               </Menu.Button>
               <Transition as={Fragment} enter="duration-100 ease-out" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="duration-75 ease-in" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                 <Menu.Items className="absolute right-0 mt-2 w-32 bg-white border border-gray-100 shadow-xl rounded-lg overflow-hidden z-50 p-1">
                    <Menu.Item>
                      {({ active }) => (
                         <button onClick={() => setChartType('area')} className={cn("w-full text-left px-3 py-2 text-xs rounded-md", active ? 'bg-brand-50 text-brand-700' : 'text-gray-600')}>Área</button>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <button onClick={() => setChartType('bar')} className={cn("w-full text-left px-3 py-2 text-xs rounded-md", active ? 'bg-brand-50 text-brand-700' : 'text-gray-600')}>Barras</button>
                      )}
                    </Menu.Item>
                 </Menu.Items>
               </Transition>
            </Menu>

            <Menu as="div" className="relative">
               <Menu.Button className="flex items-center gap-1 text-xs text-gray-500 border-b border-gray-300 pb-0.5 cursor-pointer font-bold uppercase tracking-widest hover:text-brand-600 hover:border-brand-300 transition-colors">
                  {grouping === 'day' ? 'Días' : grouping === 'week' ? 'Semanas' : grouping === 'month' ? 'Meses' : grouping === 'quarter' ? 'Trimestres' : 'Años'} <ChevronDown size={12} />
               </Menu.Button>
               <Transition as={Fragment} enter="duration-100 ease-out" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="duration-75 ease-in" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                 <Menu.Items className="absolute right-0 mt-2 w-40 bg-white border border-gray-100 shadow-xl rounded-lg overflow-hidden z-50 p-1">
                    {[
                      { id: 'day', label: 'Días' },
                      { id: 'week', label: 'Semanas' },
                      { id: 'month', label: 'Meses' },
                      { id: 'quarter', label: 'Trimestres' },
                      { id: 'year', label: 'Años' }
                    ].map(opt => (
                      <Menu.Item key={opt.id}>
                        {({ active }) => (
                          <button onClick={() => setGrouping(opt.id)} className={cn("w-full text-left px-3 py-2 text-xs rounded-md", active ? 'bg-brand-50 text-brand-700' : 'text-gray-600')}>{opt.label}</button>
                        )}
                      </Menu.Item>
                    ))}
                 </Menu.Items>
               </Transition>
            </Menu>
          </div>
        </div>
        
        <div className="flex-1 flex flex-col relative min-h-[300px]">
          {loading ? (
             <div className="flex-1 flex items-center justify-center animate-pulse text-gray-400">Generando gráfico...</div>
          ) : (
            <SalesChart data={data} type={chartType} grouping={grouping} />
          )}
        </div>
      </div>

      {/* Table Area with Column Picker */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-xl flex flex-col overflow-visible">
        <div className="flex items-center justify-between p-3 border-b border-gray-200">
          <button onClick={exportCsv} className="flex items-center gap-2 text-xs font-bold text-brand-600 hover:text-brand-700 px-4 py-2 uppercase tracking-wider border border-brand-100 rounded-lg transition-colors">
            EXPORTAR
          </button>
          
          <Menu as="div" className="relative inline-block text-left">
            <Menu.Button className="p-2 text-gray-400 hover:text-brand-600 transition-colors">
              <Columns size={20} />
            </Menu.Button>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-xl ring-1 ring-black/5 focus:outline-none p-2 border border-gray-100 z-50">
                <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase border-b border-gray-50 mb-1 tracking-widest">
                  Campo Mostrar
                </div>
                {COLUMN_OPTIONS.map((col) => (
                  <div key={col.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-brand-50 rounded-lg cursor-pointer transition-colors" onClick={() => toggleColumn(col.id)}>
                    <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${visibleColumns.includes(col.id) ? 'bg-brand-600 border-brand-600' : 'border-gray-300'}`}>
                      {visibleColumns.includes(col.id) && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><path d="M20 6L9 17l-5-5"/></svg>}
                    </div>
                    <span className="text-sm text-gray-700 font-medium">{col.label}</span>
                  </div>
                ))}
              </Menu.Items>
            </Transition>
          </Menu>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
           {loading ? (
             <div className="py-24 text-center text-gray-400 font-medium">Cargando transacción...</div>
           ) : data.length === 0 ? (
              <div className="py-24 flex flex-col items-center justify-center">
                <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 border border-gray-100 shadow-inner">
                  <FileText size={42} className="text-gray-300" strokeWidth={1} />
                </div>
                <h3 className="text-xl text-gray-700 font-medium mb-1">Sin movimientos</h3>
                <p className="text-gray-400 text-sm">No hay ventas registradas para este rango.</p>
              </div>
           ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] font-bold text-gray-500 border-b border-gray-100 bg-[#fbfbfb] uppercase tracking-widest">
                    <th className="px-5 py-5 border-r border-gray-50 min-w-[120px]">Fecha</th>
                    {COLUMN_OPTIONS.filter(c => visibleColumns.includes(c.id)).map(col => (
                      <th key={col.id} className="px-5 py-5 text-center">{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((d) => (
                    <tr key={d.date} className="border-b border-gray-50 hover:bg-gray-50/50 text-gray-800 transition-colors">
                      <td className="px-5 py-4 font-bold border-r border-gray-50 text-brand-600 uppercase text-[11px]">
                        {new Date(d.date + 'T12:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}
                      </td>
                      {COLUMN_OPTIONS.filter(c => visibleColumns.includes(c.id)).map(col => (
                        <td key={col.id} className="px-5 py-4 text-center font-medium text-gray-900">
                          {money((d as any)[col.id] || 0)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
           )}
        </div>

        {/* Pagination mock */}
        <div className="flex items-center justify-between px-6 py-6 border-t border-gray-100 text-xs text-gray-500 bg-white rounded-b-xl">
          <div className="flex items-center gap-6">
            <div className="flex border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              <button className="px-3 py-2 hover:bg-gray-50 border-r border-gray-200 transition-colors"><ChevronLeft size={18} /></button>
              <button className="px-3 py-2 hover:bg-gray-50 transition-colors"><ChevronRight size={18} /></button>
            </div>
          </div>
          <div className="flex items-center gap-3 border-b border-gray-300 pb-1 cursor-pointer font-bold transition-all hover:border-brand-500">
             <span>MOSTRAR: 10</span>
             <ChevronDown size={14}/>
          </div>
        </div>
      </div>
    </div>
  );
}

