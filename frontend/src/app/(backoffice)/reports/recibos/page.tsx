'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { DateRangePicker } from '@/components/reports/DateRangePicker';
import { TimeRangePicker } from '@/components/reports/TimeRangePicker';
import {
  ReceiptText, DollarSign, RotateCcw, Search, ChevronDown, ChevronLeft, ChevronRight,
  Users, FileText, X, Mail, Loader2, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Receipt {
  id: string; transactionNumber: string; status: string; total: number;
  createdAt: string;
  cashier?: { name: string };
  customer?: { name: string; email?: string } | null;
  payments?: { method: string; amount: number; cashTendered?: number; changeGiven?: number }[];
}

interface ReceiptDetail extends Receipt {
  subtotal: number;
  items: { id: string; productName: string; variantLabel?: string; quantity: number; unitPrice: number; lineTotal: number }[];
}

const money = (n: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 }).format(n);

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia', OTHER: 'Otro',
};

const defaultFrom = new Date(); defaultFrom.setDate(defaultFrom.getDate() - 29); defaultFrom.setHours(0,0,0,0);
const defaultTo   = new Date(); defaultTo.setHours(23,59,59,999);

// ─── Receipt Detail Modal ─────────────────────────────────────────────────────

function ReceiptDetailModal({ id, onClose, onDeleteSuccess }: { id: string; onClose: () => void; onDeleteSuccess: () => void; }) {
  const [tx, setTx]             = useState<ReceiptDetail | null>(null);
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [visible, setVisible]   = useState(false);

  // Trigger slide-in on mount, slide-out before unmount
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 280);
  };

  useEffect(() => {
    apiClient.get(`/transactions/${id}`)
      .then((r) => {
        setTx(r.data);
        setEmailInput(r.data.customer?.email ?? '');
      })
      .catch(() => toast.error('No se pudo cargar el recibo'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSendReceipt = async () => {
    if (!emailInput.trim()) return;
    setSending(true);
    try {
      await apiClient.post(`/transactions/${id}/send-receipt`, { email: emailInput.trim() });
      toast.success(`Recibo enviado a ${emailInput.trim()}`);
      setShowEmailInput(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al enviar recibo');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta venta? Esta acción es irreversible y los datos desaparecerán de los reportes.')) return;
    const toastId = toast.loading('Eliminando venta...');
    try {
      await apiClient.delete(`/transactions/${id}`);
      toast.success('Venta eliminada con éxito', { id: toastId });
      onDeleteSuccess();
      handleClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al eliminar', { id: toastId });
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-50 transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={handleClose}
      />

      {/* Panel — slides in from right */}
      <div
        className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out"
        style={{ transform: visible ? 'translateX(0)' : 'translateX(100%)' }}
      >

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Recibo</p>
            <p className="text-base font-bold text-gray-900">{tx?.transactionNumber ?? '—'}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={handleDelete} className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 transition-colors" title="Eliminar Venta">
              <Trash2 size={18} />
            </button>
            <button onClick={handleClose} className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : tx ? (
          <div className="flex-1 overflow-y-auto">

            {/* Date + employee */}
            <div className="px-5 py-4 border-b border-gray-50 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Fecha</span>
                <span className="text-gray-800 font-medium">
                  {new Date(tx.createdAt).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Empleado</span>
                <span className="text-gray-800 font-medium">{tx.cashier?.name ?? '—'}</span>
              </div>
              {tx.customer && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Cliente</span>
                  <span className="text-gray-800 font-medium">{tx.customer.name}</span>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="px-5 py-4 border-b border-gray-50">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Artículos</p>
              <div className="space-y-3">
                {tx.items.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 leading-tight truncate">{item.productName}</p>
                      {item.variantLabel && <p className="text-xs text-gray-400">{item.variantLabel}</p>}
                      <p className="text-xs text-gray-400">{item.quantity} × {money(Number(item.unitPrice))}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 shrink-0">{money(Number(item.lineTotal))}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="px-5 py-4 border-b border-gray-50 space-y-1.5">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span><span>{money(Number(tx.subtotal))}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-gray-900">
                <span>Total</span><span>{money(Number(tx.total))}</span>
              </div>
            </div>

            {/* Payments */}
            <div className="px-5 py-4 border-b border-gray-50">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Pago</p>
              {tx.payments?.map((p, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700 font-medium">{METHOD_LABELS[p.method] ?? p.method}</span>
                    <span className="font-semibold text-gray-900">{money(Number(p.amount))}</span>
                  </div>
                  {p.method === 'CASH' && p.cashTendered != null && (
                    <>
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>Entregado</span><span>{money(Number(p.cashTendered))}</span>
                      </div>
                      {(p.changeGiven ?? 0) > 0 && (
                        <div className="flex justify-between text-xs text-gray-400">
                          <span>Cambio</span><span>{money(Number(p.changeGiven))}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Send receipt */}
            <div className="px-5 py-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Enviar recibo</p>
              {showEmailInput ? (
                <div className="flex gap-2">
                  <input
                    type="email" value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-500"
                    onKeyDown={(e) => e.key === 'Enter' && handleSendReceipt()}
                    autoFocus
                  />
                  <button onClick={handleSendReceipt} disabled={sending || !emailInput.trim()}
                    className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 shrink-0">
                    {sending ? <Loader2 size={14} className="animate-spin" /> : 'Enviar'}
                  </button>
                  <button onClick={() => setShowEmailInput(false)} className="text-gray-400 hover:text-gray-600 px-2">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowEmailInput(true)}
                  className="flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium">
                  <Mail size={15} />
                  {tx.customer?.email ? `Enviar a ${tx.customer.email}` : 'Enviar por email'}
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RecibosPage() {
  const [data, setData]         = useState<Receipt[]>([]);
  const [loading, setLoading]   = useState(true);
  const [range, setRange]       = useState({ from: defaultFrom, to: defaultTo });
  const [time, setTime]         = useState({ from: '12 AM', to: '11 PM', isCustom: false });
  const [summary, setSummary]   = useState<{ totalReceipts: number; totalSales: number; totalRefunds: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = `from=${range.from.toISOString()}&to=${range.to.toISOString()}`;
    try {
      const [rRes, sRes] = await Promise.all([
        apiClient.get(`/reports/receipts?${params}`),
        apiClient.get(`/reports/receipts/summary?${params}`),
      ]);
      setData(rRes.data || []);
      setSummary(sRes.data);
    } catch {
      setData([]); setSummary(null);
    }
    setLoading(false);
  }, [range.from, range.to]);

  useEffect(() => { load(); }, [load]);

  const exportCsv = () => {
    const headers = 'Nº Recibo,Fecha,Empleado,Cliente,Tipo,Total\n';
    const rows = data.map((r) =>
      `${r.transactionNumber},${r.createdAt.slice(0, 10)},${r.cashier?.name ?? ''},${r.customer?.name ?? ''},${r.payments?.map((p) => METHOD_LABELS[p.method] ?? p.method).join('+') ?? ''},${Number(r.total).toFixed(2)}`,
    ).join('\n');
    const blob = new Blob(['\uFEFF' + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url;
    a.download = 'recibos.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f6f8]">
      {/* Top Blue Header */}
      <div className="bg-brand-600 text-white px-6 py-4 rounded-t-lg">
        <h1 className="text-xl font-normal">Recibos</h1>
      </div>

      <div className="p-4 md:p-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <DateRangePicker range={range} onChange={setRange} />
          <TimeRangePicker value={time} onChange={setTime} />
          <button className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-700 shadow-sm hover:bg-gray-50 font-medium transition-colors">
            <Users size={16} className="text-gray-400" /> Todos los colaboradores <ChevronDown size={14} className="ml-1 text-gray-400" />
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 bg-white border border-gray-100 rounded-lg overflow-hidden shadow-sm mb-6">
          <div className="flex items-center p-6 md:p-8 border-b md:border-b-0 md:border-r border-gray-100">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-slate-500 text-white flex items-center justify-center shrink-0">
              <ReceiptText size={28} strokeWidth={1.5} />
            </div>
            <div className="ml-5">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Todos los recibos</p>
              <p className="text-3xl md:text-4xl font-light text-gray-900">{summary?.totalReceipts ?? 0}</p>
            </div>
          </div>
          <div className="flex items-center p-6 md:p-8 border-b md:border-b-0 md:border-r border-gray-100">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
              <div className="relative">
                <ReceiptText size={26} strokeWidth={1.5} />
                <DollarSign size={14} className="absolute -bottom-1 -right-1 bg-white text-emerald-500 rounded-full p-[1px] border border-emerald-500" />
              </div>
            </div>
            <div className="ml-5">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Ventas</p>
              <p className="text-3xl md:text-4xl font-light text-gray-900">{money(summary?.totalSales ?? 0)}</p>
            </div>
          </div>
          <div className="flex items-center p-6 md:p-8">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0">
              <div className="relative">
                <ReceiptText size={26} strokeWidth={1.5} />
                <RotateCcw size={14} className="absolute -bottom-1 -right-1 bg-white text-rose-500 rounded-full p-[2px] border border-rose-500" />
              </div>
            </div>
            <div className="ml-5">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Reembolsos</p>
              <p className="text-3xl md:text-4xl font-light text-gray-900">{money(summary?.totalRefunds ?? 0)}</p>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-100 shadow-sm rounded-xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <button onClick={exportCsv} className="flex items-center gap-2 text-xs font-bold text-gray-700 hover:text-brand-600 px-3 py-1.5 transition-colors">
              Exportar <ChevronDown size={14} className="text-gray-400" />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600">
              <Search size={20} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="text-left text-xs font-bold text-gray-500 border-b border-gray-200 bg-[#fbfbfb]">
                  <th className="px-5 py-4">Nº. de Recibo</th>
                  <th className="px-5 py-4">Fecha</th>
                  <th className="px-5 py-4">Empleado</th>
                  <th className="px-5 py-4">Cliente</th>
                  <th className="px-5 py-4">Tipo</th>
                  <th className="px-5 py-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center text-gray-400 text-sm">
                      <Loader2 size={20} className="animate-spin mx-auto mb-2" /> Cargando...
                    </td>
                  </tr>
                ) : data.length > 0 ? data.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className="hover:bg-brand-50 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-4 font-semibold text-brand-600 hover:underline">{r.transactionNumber}</td>
                    <td className="px-5 py-4 text-gray-700">
                      {new Date(r.createdAt).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-5 py-4 text-gray-700">{r.cashier?.name ?? '—'}</td>
                    <td className="px-5 py-4 text-gray-700">{r.customer?.name ?? '—'}</td>
                    <td className="px-5 py-4 text-gray-700 font-medium">
                      {r.payments?.map((p) => METHOD_LABELS[p.method] ?? p.method).join(', ') || '—'}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-gray-900">{money(Number(r.total))}</td>
                  </tr>
                )) : null}
              </tbody>
            </table>
          </div>

          {!loading && data.length === 0 && (
            <div className="py-24 flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-5">
                <FileText size={40} className="text-gray-300" strokeWidth={1} />
              </div>
              <h3 className="text-lg font-medium text-gray-600 mb-1">No hay datos disponibles</h3>
              <p className="text-gray-400 text-sm">No hay ventas en el período seleccionado</p>
            </div>
          )}

          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <div className="flex border border-gray-200 rounded overflow-hidden">
                <button className="px-3 py-1.5 hover:bg-gray-50 border-r border-gray-200 disabled:opacity-30"><ChevronLeft size={14} /></button>
                <button className="px-3 py-1.5 hover:bg-gray-50 disabled:opacity-30"><ChevronRight size={14} /></button>
              </div>
              <span>Página: 1 de {Math.max(1, Math.ceil(data.length / 10))}</span>
            </div>
            <span>Filas por página: 10</span>
          </div>
        </div>
      </div>

      {/* Receipt detail panel */}
      {selectedId && (
        <ReceiptDetailModal id={selectedId} onClose={() => setSelectedId(null)} onDeleteSuccess={load} />
      )}
    </div>
  );
}
