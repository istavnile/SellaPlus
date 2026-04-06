'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { apiClient } from '@/lib/api/client';
import { 
  ChevronDown, ChevronLeft, ChevronRight,
  Clock, Users, Search, Columns, FileText
} from 'lucide-react';
import { DateRangePicker } from '@/components/reports/DateRangePicker';
import { TimeRangePicker } from '@/components/reports/TimeRangePicker';

interface CategoryRow {
  categoryId: string; name: string;
  itemsSold: number; netSales: number; cogs: number; grossProfit: number;
}

const money = (n: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 }).format(n);

const defaultFrom = new Date(); defaultFrom.setDate(defaultFrom.getDate() - 29); defaultFrom.setHours(0,0,0,0);
const defaultTo = new Date(); defaultTo.setHours(23,59,59,999);

const COLUMN_OPTIONS = [
  { id: 'name', label: 'Categoría' },
  { id: 'itemsSold', label: 'Artículos vendidos' },
  { id: 'netSales', label: 'Ventas netas' },
  { id: 'cogs', label: 'Costo de bienes' },
  { id: 'grossProfit', label: 'Beneficio bruto' }
];

export default function PorCategoriaPage() {
  const [data, setData]       = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange]     = useState({ from: defaultFrom, to: defaultTo });
  const [time, setTime]       = useState({ from: '12 AM', to: '11 PM', isCustom: false });
  const [visibleColumns, setVisibleColumns] = useState<string[]>(COLUMN_OPTIONS.map(c => c.id));

  const toggleColumn = (id: string) => {
    setVisibleColumns(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const params = `from=${range.from.toISOString()}&to=${range.to.toISOString()}`;
    try {
      const r = await apiClient.get(`/reports/sales/by-category?${params}`);
      setData(r.data || []);
    } catch {
      setData([]);
    }
    setLoading(false);
  }, [range.from, range.to]);

  useEffect(() => { load(); }, [load]);

  const exportCsv = () => {
    const activeCols = COLUMN_OPTIONS.filter(c => visibleColumns.includes(c.id));
    const headers = activeCols.map(c => c.label).join(',') + '\n';
    
    const rows = data.map((r) => {
      const vals = activeCols.map(c => {
        if (c.id === 'name') return r.name;
        if (c.id === 'itemsSold') return Number(r.itemsSold).toFixed(0);
        if (c.id === 'netSales') return r.netSales.toFixed(2);
        if (c.id === 'cogs') return r.cogs.toFixed(2);
        if (c.id === 'grossProfit') return r.grossProfit.toFixed(2);
        return '';
      });
      return vals.join(',');
    }).join('\n');
    
    const blob = new Blob(['\uFEFF' + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url;
    a.download = 'ventas-por-categoria.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const formatDateLabel = () => {
    return `${range.from.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })} - ${range.to.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f6f8]">
      {/* Top Blue Header */}
      <div className="bg-brand-600 text-white px-6 py-4 flex items-center justify-between rounded-t-lg">
        <h1 className="text-xl font-normal">Ventas por categoría</h1>
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
                    <FileText size={48} className="text-gray-200" strokeWidth={1} />
                  </div>
                  <h3 className="text-2xl text-gray-500 mb-2">No hay datos disponibles</h3>
                  <p className="text-gray-400 text-sm">No hay ventas en el período de tiempo seleccionado</p>
                </div>
             ) : (
                <div className="overflow-x-auto"><table className="w-full text-sm min-w-[500px]">
                  <thead>
                    <tr className="text-left text-xs font-bold text-gray-500 border-b border-gray-200 bg-[#fbfbfb]">
                      {visibleColumns.map(colId => {
                        const col = COLUMN_OPTIONS.find(c => c.id === colId);
                        if (!col) return null;
                        
                        let thClass = "px-5 py-4 font-bold ";
                        if (colId === 'name') thClass += "border-r border-gray-100";
                        else thClass += "text-center";
                        
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
                      <tr key={r.categoryId} className="border-b border-gray-100 hover:bg-gray-50 text-gray-800">
                        {visibleColumns.includes('name') && <td className="px-5 py-4 font-medium border-r border-gray-50">{r.name}</td>}
                        {visibleColumns.includes('itemsSold') && <td className="px-5 py-4 text-center font-medium">{Number(r.itemsSold).toFixed(0)}</td>}
                        {visibleColumns.includes('netSales') && <td className="px-5 py-4 text-center font-medium">{money(r.netSales)}</td>}
                        {visibleColumns.includes('cogs') && <td className="px-5 py-4 text-center text-gray-500">{money(r.cogs)}</td>}
                        {visibleColumns.includes('grossProfit') && <td className="px-5 py-4 text-center font-medium">{money(r.grossProfit)}</td>}
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
              <div className="flex items-center gap-3">
                <span className="text-gray-500">Página:</span>
                <input type="text" value="1" readOnly className="w-8 px-1 py-1 border border-gray-200 rounded text-center font-medium" />
                <span className="text-gray-500">de 1</span>
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

