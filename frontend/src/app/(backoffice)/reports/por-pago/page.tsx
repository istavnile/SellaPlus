'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { 
  ChevronDown, ChevronLeft, ChevronRight,
  Clock, Users, Search, Columns, CreditCard
} from 'lucide-react';
import { DateRangePicker } from '@/components/reports/DateRangePicker';
import { TimeRangePicker } from '@/components/reports/TimeRangePicker';

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia', OTHER: 'Otro',
};

interface PaymentRow {
  method: string; transactions: number; amount: number;
  refundTransactions: number; refundAmount: number; netAmount: number;
}

const money = (n: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 }).format(n);

// Start 30 days ago
const defaultFrom = new Date(); defaultFrom.setDate(defaultFrom.getDate() - 29); defaultFrom.setHours(0,0,0,0);
const defaultTo = new Date(); defaultTo.setHours(23,59,59,999);

export default function PorPagoPage() {
  const [data, setData]       = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange]     = useState({ from: defaultFrom, to: defaultTo });
  const [time, setTime]       = useState({ from: '12 AM', to: '11 PM', isCustom: false });

  const load = useCallback(async () => {
    setLoading(true);
    const params = `from=${range.from.toISOString()}&to=${range.to.toISOString()}`;
    try {
      const r = await apiClient.get(`/reports/sales/by-payment-method?${params}`);
      setData(r.data || []);
    } catch {
      setData([]);
    }
    setLoading(false);
  }, [range.from, range.to]);

  useEffect(() => { load(); }, [load]);

  const exportCsv = () => {
    const headers = 'Tipo de pago,Transacciones,Importe,Reembolsos,Importe reembolso,Monto neto\n';
    const rows = data.map((r) =>
      `${METHOD_LABELS[r.method] ?? r.method},${r.transactions},${r.amount.toFixed(2)},${r.refundTransactions},${r.refundAmount.toFixed(2)},${r.netAmount.toFixed(2)}`,
    ).join('\n');
    const blob = new Blob(['\uFEFF' + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url;
    a.download = 'ventas-por-pago.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const formatDateLabel = () => {
    return `${range.from.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })} - ${range.to.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f6f8]">
      {/* Top Blue Header */}
      <div className="bg-brand-600 text-white px-6 py-4 flex items-center justify-between rounded-t-lg">
        <h1 className="text-xl font-normal">Ventas por tipo de pago</h1>
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

        {/* Data Table Area */}
        <div className="bg-white border border-gray-200 shadow-sm rounded flex flex-col">
          <div className="flex items-center justify-between p-3 border-b border-gray-200 text-gray-700">
            <button onClick={exportCsv} className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 uppercase tracking-wider hover:text-black">
              EXPORTAR
            </button>
            <div className="flex items-center pr-2">
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <Columns size={20} />
              </button>
            </div>
          </div>

          <div className="min-h-[400px]">
             {loading ? (
               <div className="py-24 text-center text-gray-400 font-medium">Cargando datos...</div>
             ) : data.length === 0 ? (
                <div className="py-24 flex flex-col items-center justify-center">
                  <div className="w-24 h-24 bg-gray-50 rounded-full flex flex-col items-center justify-center mb-6 border border-gray-100">
                    <CreditCard size={48} className="text-gray-200" strokeWidth={1} />
                  </div>
                  <h3 className="text-2xl text-gray-500 mb-2">No hay datos disponibles</h3>
                  <p className="text-gray-400 text-sm">No hay ventas filtradas por tipo de pago en este período</p>
                </div>
             ) : (
                <div className="overflow-x-auto"><table className="w-full text-xs min-w-[600px]">
                  <thead>
                    <tr className="text-left text-[10px] font-bold text-gray-500 border-b border-gray-200 bg-[#fbfbfb] uppercase tracking-wider">
                      <th className="px-5 py-4 border-r border-gray-100 min-w-[140px]">Tipo de pago</th>
                      <th className="px-5 py-4 text-center">Transacciones</th>
                      <th className="px-5 py-4 text-center">Importe del pago</th>
                      <th className="px-5 py-4 text-center text-red-500">Reembolso transacc.</th>
                      <th className="px-5 py-4 text-center text-red-500">Importe reembolso</th>
                      <th className="px-5 py-4 text-center font-bold">Monto neto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((r) => (
                      <tr key={r.method} className="border-b border-gray-100 hover:bg-gray-50 text-gray-800">
                        <td className="px-5 py-4 font-medium border-r border-gray-50">{METHOD_LABELS[r.method] ?? r.method}</td>
                        <td className="px-5 py-4 text-center text-gray-500 font-medium">{r.transactions}</td>
                        <td className="px-5 py-4 text-center">{money(r.amount)}</td>
                        <td className="px-5 py-4 text-center text-red-500 font-medium">{r.refundTransactions}</td>
                        <td className="px-5 py-4 text-center text-red-500">{money(r.refundAmount)}</td>
                        <td className="px-5 py-4 text-center font-bold text-green-700">{money(r.netAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
             )}
          </div>

          {/* Pagination mock */}
          <div className="flex items-center justify-between px-6 py-5 border-t border-gray-200 text-xs text-gray-600 bg-white">
            <div className="flex items-center gap-6">
              <div className="flex border border-gray-200 rounded shadow-sm">
                <button className="px-3 py-1.5 hover:bg-gray-50 border-r border-gray-200"><ChevronLeft size={16} /></button>
                <button className="px-3 py-1.5 hover:bg-gray-50"><ChevronRight size={16} /></button>
              </div>
            </div>
            <div className="flex items-center gap-2 border-b border-gray-400 pb-0.5 cursor-pointer font-medium">
               <span>Filas por página: 10</span>
               <ChevronDown size={14}/>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

