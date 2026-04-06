'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { apiClient } from '@/lib/api/client';
import { DateRangePicker } from '@/components/reports/DateRangePicker';
import { TimeRangePicker } from '@/components/reports/TimeRangePicker';
import { EmployeeFilter } from '@/components/reports/EmployeeFilter';
import {
  Box, BarChart3, ChevronDown, ChevronLeft, ChevronRight,
  Clock, Users, Columns,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';

interface ProductRow {
  productId: string; productName: string;
  totalQuantity: number | null; totalRevenue: number | null;
}

const money = (n: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 }).format(n);

const COLORS = ['#3b5bdb', '#4c6ef5', '#748ffc', '#91a7ff', '#bac8ff'];

const defaultFrom = new Date(); defaultFrom.setDate(defaultFrom.getDate() - 29); defaultFrom.setHours(0,0,0,0);
const defaultTo = new Date(); defaultTo.setHours(23,59,59,999);

const COLUMN_OPTIONS = [
  { id: 'productName', label: 'Artículo' },
  { id: 'totalQuantity', label: 'Cantidad vendida' },
  { id: 'totalRevenue', label: 'Ventas netas' }
];

export default function PorArticuloPage() {
  const [data, setData]       = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange]     = useState({ from: defaultFrom, to: defaultTo });
  const [time, setTime]       = useState({ from: '12 AM', to: '11 PM', isCustom: false });
  const [cashierId, setCashierId] = useState<string | undefined>(undefined);
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');
  const [visibleColumns, setVisibleColumns] = useState<string[]>(COLUMN_OPTIONS.map(c => c.id));

  const toggleColumn = (id: string) => {
    setVisibleColumns(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const params = `from=${range.from.toISOString()}&to=${range.to.toISOString()}${cashierId ? `&cashierId=${cashierId}` : ''}`;
    try {
      const r = await apiClient.get(`/reports/sales/by-product?${params}`);
      setData(r.data || []);
    } catch {
      setData([]);
    }
    setLoading(false);
  }, [range.from, range.to, cashierId]);

  useEffect(() => { load(); }, [load]);

  const exportCsv = () => {
    const activeCols = COLUMN_OPTIONS.filter(c => visibleColumns.includes(c.id));
    const headers = activeCols.map(c => c.label).join(',') + '\n';
    
    const rows = data.map((r) => {
      const vals = activeCols.map(c => {
        if (c.id === 'productName') return r.productName;
        if (c.id === 'totalQuantity') return Number(r.totalQuantity ?? 0).toFixed(0);
        if (c.id === 'totalRevenue') return Number(r.totalRevenue ?? 0).toFixed(2);
        return '';
      });
      return vals.join(',');
    }).join('\n');
    
    const blob = new Blob(['\uFEFF' + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url;
    a.download = 'ventas-por-articulo.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const top5 = data.slice(0, 5);
  const maxRevenue = top5.length > 0 ? Math.max(...top5.map((r) => Number(r.totalRevenue ?? 0))) : 1;
  const summary = { totalRevenue: data.reduce((acc, curr) => acc + Number(curr.totalRevenue ?? 0), 0) };

  // Chart data: top 10 by revenue
  const chartData = data.slice(0, 10).map((r) => ({
    name: r.productName.length > 12 ? r.productName.slice(0, 12) + '…' : r.productName,
    revenue: Number(r.totalRevenue ?? 0),
  }));

  return (
    <div className="flex flex-col h-full bg-[#f4f6f8]">
      {/* Top Blue Header */}
      <div className="bg-brand-600 text-white px-6 py-4 flex items-center justify-between rounded-t-lg">
        <h1 className="text-xl font-normal">Ventas por artículo</h1>
      </div>

      <div className="p-6">
        {/* Summary + Filters Top Bar */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-6">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white border border-gray-200 rounded-2xl flex items-center justify-center shadow-sm shrink-0 relative overflow-hidden">
              <div className="absolute inset-0 bg-brand-50/50" />
              <Box size={28} className="text-brand-600 relative z-10" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Ventas netas totales</p>
              <h2 className="text-3xl font-light text-gray-900 tracking-tight">{money(Number(summary.totalRevenue ?? 0))}</h2>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:flex md:flex-row md:items-center w-full xl:w-auto gap-3">
            <DateRangePicker range={range} onChange={setRange} />
            <TimeRangePicker value={time} onChange={setTime} />
            <EmployeeFilter cashierId={cashierId} onChange={setCashierId} />
          </div>
        </div>

        {/* Charts / KPIs Row */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6 mb-6">

          {/* Top 5 */}
          <div className="bg-white border border-gray-200 rounded shadow-sm p-6 min-h-[350px]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-gray-800 uppercase">Top 5 artículos</h3>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Ventas netas</span>
            </div>

            {loading ? (
              <div className="flex flex-col gap-4 mt-4">
                {[1,2,3,4,5].map((i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-5 h-4 bg-gray-100 rounded" />
                    <div className="flex-1 h-3 bg-gray-100 rounded" />
                    <div className="w-14 h-3 bg-gray-100 rounded" />
                  </div>
                ))}
              </div>
            ) : top5.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-300">
                <Box size={48} strokeWidth={1} />
                <p className="mt-4 text-sm font-medium">Sin datos para mostrar</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {top5.map((row, idx) => {
                  const revenue = Number(row.totalRevenue ?? 0);
                  const pct = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;
                  return (
                    <div key={row.productId}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-bold text-gray-400 w-4 shrink-0">{idx + 1}</span>
                          <span className="text-sm font-medium text-gray-800 truncate">{row.productName}</span>
                        </div>
                        <span className="text-sm font-bold text-gray-900 ml-3 shrink-0">{money(revenue)}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: COLORS[idx] }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bar Chart */}
          <div className="bg-white border border-gray-200 rounded shadow-sm p-6 flex flex-col min-h-[350px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-800 uppercase">Diagrama de ventas por artículos</h3>
              <div className="flex gap-4">
                <Menu as="div" className="relative">
                  <Menu.Button className="flex items-center gap-1 text-xs text-gray-500 border-b border-gray-300 pb-0.5 hover:text-brand-600 focus:outline-none">
                    {chartType === 'bar' ? 'Barras' : 'Circular'} <ChevronDown size={12} />
                  </Menu.Button>
                  <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="transition ease-in duration-75" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                    <Menu.Items className="absolute right-0 mt-1 w-32 bg-white rounded-md shadow-lg border border-gray-100 focus:outline-none z-10 py-1">
                      <Menu.Item>
                        {({ active }) => (
                          <button onClick={() => setChartType('bar')} className={`w-full text-left px-4 py-2 text-sm ${active ? 'bg-gray-50 text-brand-600' : 'text-gray-700'}`}>
                            Barras
                          </button>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }) => (
                          <button onClick={() => setChartType('pie')} className={`w-full text-left px-4 py-2 text-sm ${active ? 'bg-gray-50 text-brand-600' : 'text-gray-700'}`}>
                            Circular
                          </button>
                        )}
                      </Menu.Item>
                    </Menu.Items>
                  </Transition>
                </Menu>
              </div>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center text-gray-300 text-sm">Cargando...</div>
            ) : chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1">
                <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                  <BarChart3 size={48} className="text-gray-200" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-medium text-gray-400">No hay datos disponibles</h3>
              </div>
            ) : (
              <div className="flex-1" style={{ minHeight: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'bar' ? (
                    <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        angle={-35}
                        textAnchor="end"
                        interval={0}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#9ca3af' }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `S/${v}`}
                      />
                      <Tooltip
                        formatter={(value) => [money(Number(value)), 'Ventas netas']}
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                      />
                      <Bar dataKey="revenue" radius={[4, 4, 0, 0]} maxBarSize={48}>
                        {chartData.map((_, i) => (
                          <Cell key={i} fill={i < COLORS.length ? COLORS[i] : '#748ffc'} />
                        ))}
                      </Bar>
                    </BarChart>
                  ) : (
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="revenue"
                        stroke="none"
                      >
                        {chartData.map((_, i) => (
                          <Cell key={i} fill={i < COLORS.length ? COLORS[i] : '#748ffc'} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [money(Number(value)), 'Ventas netas']}
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb', outline: 'none' }}
                        itemStyle={{ color: '#374151' }}
                      />
                      <Legend 
                        layout="vertical" 
                        verticalAlign="middle" 
                        align="right"
                        iconType="circle"
                        wrapperStyle={{ fontSize: 11, color: '#6b7280' }}
                      />
                    </PieChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Export Table */}
        <div className="bg-white border border-gray-200 shadow-sm rounded flex flex-col overflow-visible">
          <div className="flex items-center justify-between p-3 border-b border-gray-200">
            <button onClick={exportCsv} className="flex items-center gap-2 text-xs font-bold text-gray-700 hover:text-gray-900 px-3 py-1.5 uppercase tracking-wider">
              EXPORTAR
            </button>
            <div className="flex items-center pr-2">
              <Menu as="div" className="relative inline-block text-left">
                <Menu.Button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
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
                      <div key={col.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors" onClick={() => toggleColumn(col.id)}>
                        <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${visibleColumns.includes(col.id) ? 'bg-gray-800 border-gray-800' : 'border-gray-300'}`}>
                          {visibleColumns.includes(col.id) && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><path d="M20 6L9 17l-5-5"/></svg>}
                        </div>
                        <span className="text-sm text-gray-700 font-medium">{col.label}</span>
                      </div>
                    ))}
                  </Menu.Items>
                </Transition>
              </Menu>
            </div>
          </div>

          <div className="min-h-[300px]">
            {loading ? (
              <div className="py-24 text-center text-gray-400 font-medium">Cargando datos...</div>
            ) : data.length === 0 ? (
              <div className="py-24 flex flex-col items-center justify-center">
                <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 border border-gray-100">
                  <div className="flex flex-col gap-1">
                    {[1,2,3,4].map((i) => <div key={i} className="h-1 w-12 bg-gray-200 rounded" />)}
                  </div>
                </div>
                <h3 className="text-2xl text-gray-500 mb-2 font-normal">No hay datos disponibles</h3>
                <p className="text-gray-400 text-sm">No hay ventas en el período de tiempo seleccionado</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-bold text-gray-500 border-b border-gray-200 bg-[#fbfbfb]">
                    {visibleColumns.map(colId => {
                      const col = COLUMN_OPTIONS.find(c => c.id === colId);
                      if (!col) return null;
                      
                      let thClass = "px-5 py-4 font-bold whitespace-nowrap ";
                      if (colId === 'productName') thClass += "border-r border-gray-100";
                      else if (colId === 'totalRevenue') thClass += "text-right";
                      
                      return (
                        <th key={colId} className={thClass}>
                          {col.label}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {data.map((r) => (
                    <tr key={r.productId} className="border-b border-gray-100 hover:bg-gray-50">
                      {visibleColumns.includes('productName') && <td className="px-5 py-4 text-gray-800 font-medium whitespace-nowrap">{r.productName}</td>}
                      {visibleColumns.includes('totalQuantity') && <td className="px-5 py-4 text-gray-600 font-medium whitespace-nowrap">{Number(r.totalQuantity ?? 0).toFixed(0)}</td>}
                      {visibleColumns.includes('totalRevenue') && <td className="px-5 py-4 text-right font-medium text-gray-900 whitespace-nowrap">{money(Number(r.totalRevenue ?? 0))}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex items-center justify-between px-6 py-5 border-t border-gray-200 text-xs text-gray-600 bg-white">
            <div className="flex items-center gap-6">
              <div className="flex border border-gray-200 rounded shadow-sm">
                <button className="px-3 py-1.5 hover:bg-gray-50 border-r border-gray-200"><ChevronLeft size={16} /></button>
                <button className="px-3 py-1.5 hover:bg-gray-50"><ChevronRight size={16} /></button>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-500">Página:</span>
                <input type="text" value="1" readOnly className="w-8 px-1 py-1 border border-gray-200 rounded text-center font-medium" />
                <span className="text-gray-500">de 1</span>
              </div>
            </div>
            <div className="flex items-center gap-2 border-b border-gray-400 pb-0.5 cursor-pointer font-medium">
              <span>Filas por página: 10</span>
              <ChevronDown size={14} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
