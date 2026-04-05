'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import Link from 'next/link';
import { 
  ChevronDown, ChevronLeft, ChevronRight,
  Clock, Users, Search, Columns, UserCheck, FileText
} from 'lucide-react';
import { DateRangePicker } from '@/components/reports/DateRangePicker';
import { TimeRangePicker } from '@/components/reports/TimeRangePicker';

interface EmployeeRow {
  employeeId: string; name: string;
  grossSales: number; refunds: number; discounts: number;
  netSales: number; receipts: number; avgSale: number;
}

const money = (n: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 }).format(n);

// Start 30 days ago
const defaultFrom = new Date(); defaultFrom.setDate(defaultFrom.getDate() - 29); defaultFrom.setHours(0,0,0,0);
const defaultTo = new Date(); defaultTo.setHours(23,59,59,999);

export default function PorEmpleadoPage() {
  const [data, setData]       = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange]     = useState({ from: defaultFrom, to: defaultTo });
  const [time, setTime]       = useState({ from: '12 AM', to: '11 PM', isCustom: false });

  const load = useCallback(async () => {
    setLoading(true);
    const params = `from=${range.from.toISOString()}&to=${range.to.toISOString()}`;
    try {
      const r = await apiClient.get(`/reports/sales/by-employee?${params}`);
      setData(r.data || []);
    } catch {
      setData([]);
    }
    setLoading(false);
  }, [range.from, range.to]);

  useEffect(() => { load(); }, [load]);

  const exportCsv = () => {
    const headers = 'Nombre,Ventas brutas,Reembolsos,Descuentos,Ventas netas,Recibos,Venta promedio\n';
    const rows = data.map((r) =>
      `${r.name},${r.grossSales.toFixed(2)},${r.refunds.toFixed(2)},${r.discounts.toFixed(2)},${r.netSales.toFixed(2)},${r.receipts},${r.avgSale.toFixed(2)}`,
    ).join('\n');
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
        <div className="flex flex-wrap gap-3 mb-6">
          <DateRangePicker range={range} onChange={setRange} />
          <TimeRangePicker value={time} onChange={setTime} />
          
          <button className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-700 shadow-sm hover:bg-gray-50 font-medium tracking-tight transition-colors">
            <Users size={16} className="text-gray-400" /> Todos los colaboradores <ChevronDown size={14} className="ml-1 text-gray-400" />
          </button>
        </div>

        {/* Data Table Area */}
        <div className="bg-white border border-gray-100 shadow-sm rounded-xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100 text-gray-700">
            <button onClick={exportCsv} className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 transition-colors hover:text-brand-600">
              Exportar <ChevronDown size={14} className="text-gray-400" />
            </button>
            <div className="flex items-center pr-2">
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
                      <th className="px-5 py-4 tracking-tight">Nombre</th>
                      <th className="px-5 py-4 tracking-tight text-center">Ventas brutas</th>
                      <th className="px-5 py-4 tracking-tight text-center">Reembolsos</th>
                      <th className="px-5 py-4 tracking-tight text-center">Descuentos</th>
                      <th className="px-5 py-4 tracking-tight text-center">Ventas netas</th>
                      <th className="px-5 py-4 tracking-tight text-center">Recibos</th>
                      <th className="px-5 py-4 tracking-tight text-center">Venta promedio</th>
                      <th className="px-5 py-4 tracking-tight text-center">Clientes que se inscribieron</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.map((r) => (
                      <tr key={r.employeeId} className="hover:bg-gray-50 transition-colors text-gray-800">
                        <td className="px-5 py-4 font-semibold text-brand-600 cursor-pointer hover:underline">
                          <Link href={`/employees/${r.employeeId}`}>
                            {r.name}
                          </Link>
                        </td>
                        <td className="px-5 py-4 text-center">{money(r.grossSales)}</td>
                        <td className="px-5 py-4 text-center text-red-500">{money(r.refunds)}</td>
                        <td className="px-5 py-4 text-center text-gray-600">{money(r.discounts)}</td>
                        <td className="px-5 py-4 text-center font-bold text-gray-900">{money(r.netSales)}</td>
                        <td className="px-5 py-4 text-center text-gray-500 font-medium">{r.receipts}</td>
                        <td className="px-5 py-4 text-center font-medium">{money(r.avgSale)}</td>
                        <td className="px-5 py-4 text-center text-gray-400">—</td>
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

