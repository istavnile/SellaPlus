'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { apiClient } from '@/lib/api/client';
import { DateRangePicker } from '@/components/reports/DateRangePicker';
import { TimeRangePicker } from '@/components/reports/TimeRangePicker';
import { EmployeeFilter } from '@/components/reports/EmployeeFilter';
import { 
  ChevronDown, ChevronLeft, ChevronRight,
  Clock, Users, Search, Columns, CreditCard
} from 'lucide-react';

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia', OTHER: 'Otro',
};

interface PaymentRow {
  method: string; transactions: number; amount: number;
  refundTransactions: number; refundAmount: number; netAmount: number;
}

const money = (n: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 }).format(n);

const defaultFrom = new Date(); defaultFrom.setDate(defaultFrom.getDate() - 29); defaultFrom.setHours(0,0,0,0);
const defaultTo = new Date(); defaultTo.setHours(23,59,59,999);

const COLUMN_OPTIONS = [
  { id: 'method', label: 'Tipo de pago' },
  { id: 'transactions', label: 'Transacciones' },
  { id: 'amount', label: 'Importe del pago' },
  { id: 'refundTransactions', label: 'Reembolso transacc.' },
  { id: 'refundAmount', label: 'Importe reembolso' },
  { id: 'netAmount', label: 'Monto neto' }
];

export default function PorPagoPage() {
  const [data, setData]       = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange]     = useState({ from: defaultFrom, to: defaultTo });
  const [time, setTime]       = useState({ from: '12 AM', to: '11 PM', isCustom: false });
  const [cashierId, setCashierId] = useState<string | undefined>(undefined);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(COLUMN_OPTIONS.map(c => c.id));

  const toggleColumn = (id: string) => {
    setVisibleColumns(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const params = `from=${range.from.toISOString()}&to=${range.to.toISOString()}${cashierId ? `&cashierId=${cashierId}` : ''}`;
    try {
      const r = await apiClient.get(`/reports/sales/by-payment-method?${params}`);
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
        if (c.id === 'method') return METHOD_LABELS[r.method] ?? r.method;
        if (c.id === 'transactions') return r.transactions;
        if (c.id === 'amount') return r.amount.toFixed(2);
        if (c.id === 'refundTransactions') return r.refundTransactions;
        if (c.id === 'refundAmount') return r.refundAmount.toFixed(2);
        if (c.id === 'netAmount') return r.netAmount.toFixed(2);
        return '';
      });
      return vals.join(',');
    }).join('\n');
    
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
        <div className="grid grid-cols-1 md:flex md:flex-row md:items-center gap-3 mb-6">
          <DateRangePicker range={range} onChange={setRange} />
          <TimeRangePicker value={time} onChange={setTime} />
          <EmployeeFilter cashierId={cashierId} onChange={setCashierId} />
        </div>

        {/* Data Table Area */}
        <div className="bg-white border border-gray-200 shadow-sm rounded flex flex-col overflow-visible">
          <div className="flex items-center justify-between p-3 border-b border-gray-200 text-gray-700">
            <button onClick={exportCsv} className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 uppercase tracking-wider hover:text-black">
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
                      {visibleColumns.map(colId => {
                        const col = COLUMN_OPTIONS.find(c => c.id === colId);
                        if (!col) return null;
                        
                        let thClass = "px-5 py-4 whitespace-nowrap ";
                        if (colId === 'method') thClass += "border-r border-gray-100 min-w-[140px]";
                        else if (colId === 'refundTransactions' || colId === 'refundAmount') thClass += "text-center text-red-500";
                        else thClass += "text-center";
                        
                        if (colId === 'netAmount') thClass += " font-bold";
                        
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
                      <tr key={r.method} className="border-b border-gray-100 hover:bg-gray-50 text-gray-800">
                        {visibleColumns.includes('method') && <td className="px-5 py-4 font-medium border-r border-gray-50 whitespace-nowrap">{METHOD_LABELS[r.method] ?? r.method}</td>}
                        {visibleColumns.includes('transactions') && <td className="px-5 py-4 text-center text-gray-500 font-medium whitespace-nowrap">{r.transactions}</td>}
                        {visibleColumns.includes('amount') && <td className="px-5 py-4 text-center whitespace-nowrap">{money(r.amount)}</td>}
                        {visibleColumns.includes('refundTransactions') && <td className="px-5 py-4 text-center text-red-500 font-medium whitespace-nowrap">{r.refundTransactions}</td>}
                        {visibleColumns.includes('refundAmount') && <td className="px-5 py-4 text-center text-red-500 whitespace-nowrap">{money(r.refundAmount)}</td>}
                        {visibleColumns.includes('netAmount') && <td className="px-5 py-4 text-center font-bold text-green-700 whitespace-nowrap">{money(r.netAmount)}</td>}
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

