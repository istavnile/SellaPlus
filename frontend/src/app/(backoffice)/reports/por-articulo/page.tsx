'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import {
  Box, BarChart3, ChevronDown, ChevronLeft, ChevronRight,
  Clock, Users, Columns,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { DateRangePicker } from '@/components/reports/DateRangePicker';
import { TimeRangePicker } from '@/components/reports/TimeRangePicker';

interface ProductRow {
  productId: string; productName: string;
  totalQuantity: number | null; totalRevenue: number | null;
}

const money = (n: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 }).format(n);

const COLORS = ['#3b5bdb', '#4c6ef5', '#748ffc', '#91a7ff', '#bac8ff'];

const defaultFrom = new Date(); defaultFrom.setDate(defaultFrom.getDate() - 29); defaultFrom.setHours(0,0,0,0);
const defaultTo = new Date(); defaultTo.setHours(23,59,59,999);

export default function PorArticuloPage() {
  const [data, setData]       = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange]     = useState({ from: defaultFrom, to: defaultTo });
  const [time, setTime]       = useState({ from: '12 AM', to: '11 PM', isCustom: false });

  const load = useCallback(async () => {
    setLoading(true);
    const params = `from=${range.from.toISOString()}&to=${range.to.toISOString()}`;
    try {
      const r = await apiClient.get(`/reports/sales/by-product?${params}`);
      setData(r.data || []);
    } catch {
      setData([]);
    }
    setLoading(false);
  }, [range.from, range.to]);

  useEffect(() => { load(); }, [load]);

  const exportCsv = () => {
    const headers = 'Artículo,Cantidad vendida,Ventas netas\n';
    const rows = data.map((r) =>
      `${r.productName},${Number(r.totalQuantity ?? 0).toFixed(0)},${Number(r.totalRevenue ?? 0).toFixed(2)}`,
    ).join('\n');
    const blob = new Blob(['\uFEFF' + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url;
    a.download = 'ventas-por-articulo.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const top5 = data.slice(0, 5);
  const maxRevenue = top5.length > 0 ? Math.max(...top5.map((r) => Number(r.totalRevenue ?? 0))) : 1;

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
        {/* Filters bar */}
        <div className="flex flex-wrap gap-3 mb-6">
          <DateRangePicker range={range} onChange={setRange} />
          <TimeRangePicker value={time} onChange={setTime} />
          <button className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-700 shadow-sm hover:bg-gray-50 font-medium tracking-tight transition-colors">
            <Users size={16} className="text-gray-400" /> Todos los colaboradores <ChevronDown size={14} className="ml-1 text-gray-400" />
          </button>
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
                <div className="flex items-center gap-1 text-xs text-gray-500 border-b border-gray-300 pb-0.5">
                  Barras <ChevronDown size={12} />
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500 border-b border-gray-300 pb-0.5">
                  Días <ChevronDown size={12} />
                </div>
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
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Export Table */}
        <div className="bg-white border border-gray-200 shadow-sm rounded flex flex-col">
          <div className="flex items-center justify-between p-3 border-b border-gray-200">
            <button onClick={exportCsv} className="flex items-center gap-2 text-xs font-bold text-gray-700 hover:text-gray-900 px-3 py-1.5 uppercase tracking-wider">
              EXPORTAR
            </button>
            <div className="flex items-center pr-2">
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <Columns size={20} />
              </button>
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
                    <th className="px-5 py-4 font-bold border-r border-gray-100">Artículo</th>
                    <th className="px-5 py-4 font-bold">Cantidad vendida</th>
                    <th className="px-5 py-4 font-bold text-right">Ventas netas</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((r) => (
                    <tr key={r.productId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-5 py-4 text-gray-800 font-medium">{r.productName}</td>
                      <td className="px-5 py-4 text-gray-600 font-medium">{Number(r.totalQuantity ?? 0).toFixed(0)}</td>
                      <td className="px-5 py-4 text-right font-medium text-gray-900">{money(Number(r.totalRevenue ?? 0))}</td>
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
