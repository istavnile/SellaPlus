'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { apiClient } from '@/lib/api/client';
import Link from 'next/link';
import { 
  ChevronDown, ChevronLeft, ChevronRight,
  Clock, Users, Search, Columns, UserCheck, FileText
} from 'lucide-react';
import { DateRangePicker } from '@/components/reports/DateRangePicker';
import { TimeRangePicker } from '@/components/reports/TimeRangePicker';
import { EmployeeFilter } from '@/components/reports/EmployeeFilter';

interface EmployeeRow {
  employeeId: string; name: string;
  grossSales: number; refunds: number; discounts: number;
  netSales: number; receipts: number; avgSale: number;
}

const money = (n: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 }).format(n);

const defaultFrom = new Date(); defaultFrom.setDate(defaultFrom.getDate() - 29); defaultFrom.setHours(0,0,0,0);
const defaultTo = new Date(); defaultTo.setHours(23,59,59,999);

const COLUMN_OPTIONS = [
  { id: 'name', label: 'Nombre' },
  { id: 'grossSales', label: 'Ventas brutas' },
  { id: 'refunds', label: 'Reembolsos' },
  { id: 'discounts', label: 'Descuentos' },
  { id: 'netSales', label: 'Ventas netas' },
  { id: 'receipts', label: 'Recibos' },
  { id: 'avgSale', label: 'Venta promedio' },
  { id: 'customers', label: 'Clientes que se inscribieron' }
];

export default function PorEmpleadoPage() {
  const [data, setData]       = useState<EmployeeRow[]>([]);
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
      const r = await apiClient.get(`/reports/sales/by-employee?${params}`);
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
        if (c.id === 'name') return r.name;
        if (c.id === 'grossSales') return r.grossSales.toFixed(2);
        if (c.id === 'refunds') return r.refunds.toFixed(2);
        if (c.id === 'discounts') return r.discounts.toFixed(2);
        if (c.id === 'netSales') return r.netSales.toFixed(2);
        if (c.id === 'receipts') return r.receipts;
        if (c.id === 'avgSale') return r.avgSale.toFixed(2);
        if (c.id === 'customers') return '—';
        return '';
      });
      return vals.join(',');
    }).join('\n');
    
    const blob = new Blob(['\uFEFF' + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url;
    a.download = 'ventas-por-empleado.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const formatDateLabel = () => {
    return `${range.from.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })} - ${range.to.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f6f8]">
      {/* Top Blue Header */}
      <div className="bg-brand-600 text-white px-6 py-4 flex items-center justify-between rounded-t-lg">
        <h1 className="text-xl font-normal">Ventas por empleado</h1>
      </div>

      <div className="p-6">
        {/* Filters bar */}
        <div className="grid grid-cols-1 md:flex md:flex-row md:items-center gap-3 mb-6">
          <DateRangePicker range={range} onChange={setRange} />
          <TimeRangePicker value={time} onChange={setTime} />
          <EmployeeFilter cashierId={cashierId} onChange={setCashierId} />
        </div>

        {/* Data Table Area */}
        <div className="bg-white border border-gray-100 shadow-sm rounded-xl flex flex-col overflow-visible">
          <div className="flex items-center justify-between p-3 border-b border-gray-100 text-gray-700">
            <button onClick={exportCsv} className="flex items-center gap-2 text-xs font-bold text-brand-600 hover:text-brand-700 px-4 py-2 transition-colors uppercase tracking-wider border border-brand-100 rounded-lg">
              EXPORTAR
            </button>
            <div className="flex items-center gap-2">
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
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <Search size={20} />
              </button>
            </div>
          </div>

          <div className="min-h-[400px]">
             {loading ? (
               <div className="py-24 text-center text-gray-400 font-medium">Cargando datos...</div>
             ) : data.length === 0 ? (
                <div className="py-28 flex flex-col items-center justify-center">
                  <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                    <FileText size={48} className="text-gray-300" strokeWidth={1} />
                  </div>
                  <h3 className="text-xl font-medium text-gray-600 mb-2">No hay datos disponibles</h3>
                  <p className="text-gray-400 text-sm">No hay ventas en el período de tiempo seleccionado</p>
                </div>
             ) : (
                <div className="overflow-x-auto"><table className="w-full text-sm min-w-[700px]">
                  <thead>
                    <tr className="text-left text-xs font-bold text-gray-500 border-b border-gray-200 bg-[#fbfbfb]">
                      {visibleColumns.map(colId => {
                        const col = COLUMN_OPTIONS.find(c => c.id === colId);
                        if (!col) return null;
                        const isCenter = colId !== 'name';
                        return (
                          <th key={colId} className={`px-5 py-4 tracking-tight whitespace-nowrap ${isCenter ? 'text-center' : ''}`}>
                            {col.label}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.map((r) => (
                      <tr key={r.employeeId} className="hover:bg-gray-50 transition-colors text-gray-800">
                        {visibleColumns.includes('name') && (
                          <td className="px-5 py-4 font-semibold text-brand-600 cursor-pointer hover:underline whitespace-nowrap">
                            <Link href={`/employees/${r.employeeId}`}>
                              {r.name}
                            </Link>
                          </td>
                        )}
                        {visibleColumns.includes('grossSales') && <td className="px-5 py-4 text-center whitespace-nowrap">{money(r.grossSales)}</td>}
                        {visibleColumns.includes('refunds') && <td className="px-5 py-4 text-center text-red-500 whitespace-nowrap">{money(r.refunds)}</td>}
                        {visibleColumns.includes('discounts') && <td className="px-5 py-4 text-center text-gray-600 whitespace-nowrap">{money(r.discounts)}</td>}
                        {visibleColumns.includes('netSales') && <td className="px-5 py-4 text-center font-bold text-gray-900 whitespace-nowrap">{money(r.netSales)}</td>}
                        {visibleColumns.includes('receipts') && <td className="px-5 py-4 text-center text-gray-500 font-medium whitespace-nowrap">{r.receipts}</td>}
                        {visibleColumns.includes('avgSale') && <td className="px-5 py-4 text-center font-medium whitespace-nowrap">{money(r.avgSale)}</td>}
                        {visibleColumns.includes('customers') && <td className="px-5 py-4 text-center text-gray-400 whitespace-nowrap">—</td>}
                      </tr>
                    ))}
                  </tbody>
                </table></div>
             )}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 text-xs text-gray-500 bg-white">
            <div className="flex items-center gap-5">
              <div className="flex border border-gray-200 rounded overflow-hidden shadow-sm">
                <button className="px-3 py-1.5 hover:bg-gray-50 border-r border-gray-200"><ChevronLeft size={14} /></button>
                <button className="px-3 py-1.5 hover:bg-gray-50"><ChevronRight size={14} /></button>
              </div>
               <div className="flex items-center gap-2">
                 <span>Página:</span>
                 <input type="text" value="1" readOnly className="w-10 px-2 py-1 border border-gray-200 rounded text-center bg-gray-50" />
                 <span>de {Math.max(1, Math.ceil(data.length / 10))}</span>
               </div>
            </div>
            <div className="flex items-center gap-2 border-b border-gray-200 pb-1 cursor-pointer hover:border-gray-400 transition-colors font-medium">
               <span>Filas por página: 10</span>
               <ChevronDown size={14}/>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

