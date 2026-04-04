'use client';

import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { X, CreditCard, Banknote, Smartphone, CircleDollarSign, Mail, UserCircle } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useTenantStore } from '@/stores/tenant.store';
import toast from 'react-hot-toast';
import type { SelectedCustomer } from './customer-picker-modal';

interface TenantPaymentMethod {
  id: string; name: string; type: string; isEnabled: boolean; sortOrder: number;
}

const METHOD_ICONS: Record<string, React.ElementType> = {
  CASH:     Banknote,
  CARD:     CreditCard,
  TRANSFER: Smartphone,
  OTHER:    CircleDollarSign,
};

const METHOD_STYLES: Record<string, string> = {
  CASH:     'bg-brand-600 hover:bg-brand-700 text-white shadow-sm',
  CARD:     'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm',
  TRANSFER: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm',
  OTHER:    'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm',
};

const FALLBACK_METHODS: TenantPaymentMethod[] = [
  { id: 'cash', name: 'Efectivo', type: 'CASH', isEnabled: true, sortOrder: 0 },
  { id: 'card', name: 'Tarjeta',  type: 'CARD', isEnabled: true, sortOrder: 1 },
];

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  subtotal: number;
  cart: any[];
  customer: SelectedCustomer | null;
  onSuccess: () => void;
}

export function CheckoutModal({ isOpen, onClose, total, subtotal, cart, customer, onSuccess }: CheckoutModalProps) {
  const format = useTenantStore((s) => s.format);

  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [cashTendered, setCashTendered]   = useState<string>(total.toFixed(2));
  const [sendReceipt, setSendReceipt]     = useState(true);
  const [paymentMethods, setPaymentMethods] = useState<TenantPaymentMethod[]>(FALLBACK_METHODS);

  // Reset cash when total changes
  useEffect(() => { setCashTendered(total.toFixed(2)); }, [total]);

  // Reset receipt checkbox when customer changes
  useEffect(() => { setSendReceipt(true); }, [customer]);

  useEffect(() => {
    apiClient.get('/tenant/payment-methods')
      .then((r) => {
        const enabled = (r.data as TenantPaymentMethod[]).filter((m) => m.isEnabled);
        setPaymentMethods(enabled.length ? enabled : FALLBACK_METHODS);
      })
      .catch(() => setPaymentMethods(FALLBACK_METHODS));
  }, []);

  const handleProcessPayment = async (method: string) => {
    setIsSubmitting(true);
    try {
      const isCash   = method === 'CASH';
      const tendered = isCash ? Number(cashTendered) || total : total;

      const payload = {
        items: cart.map((i) => ({
          productId: i.productId, productName: i.name, variantId: i.variantId,
          quantity: i.qty, unitPrice: i.price, lineTotal: i.price * i.qty,
        })),
        subtotal,
        total,
        ...(customer ? { customerId: customer.id } : {}),
        payments: [{
          method,
          amount: total,
          ...(isCash ? { cashTendered: tendered, changeGiven: Math.max(0, tendered - total) } : {}),
        }],
      };

      const res = await apiClient.post('/transactions', payload);
      toast.success('¡Venta registrada!');

      onSuccess();
      onClose();

      // Send receipt after closing (fire and forget, but show result)
      if (customer?.email && sendReceipt) {
        const txId = res.data.id;
        const email = customer.email;
        apiClient.post(`/transactions/${txId}/send-receipt`, { email })
          .then(() => toast.success(`Recibo enviado a ${email}`, { duration: 4000 }))
          .catch((err) => {
            const msg = err?.response?.data?.message || err?.message || 'Error desconocido';
            toast.error(`No se pudo enviar el recibo: ${msg}`, { duration: 5000 });
          });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al procesar cobro');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCashFirst = paymentMethods[0]?.type === 'CASH';

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" onClick={onClose} />
      <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-xl overflow-hidden shadow-2xl flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1 -ml-1">
              <X size={18} />
            </button>
            <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Cobro</span>
            <div className="w-7" />
          </div>

          <div className="px-5 pb-6 pt-5 flex flex-col gap-5">

            {/* Total */}
            <div className="text-center">
              <p className="text-4xl font-bold text-gray-900 tracking-tight">{format(total)}</p>
              <p className="text-xs text-gray-400 mt-1">Importe total</p>
            </div>

            {/* Customer info (read-only in checkout) */}
            {customer && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 flex items-center gap-2.5">
                <UserCircle size={18} className="text-brand-500 shrink-0" />
                <span className="text-sm font-medium text-gray-800 flex-1 truncate">{customer.name}</span>
              </div>
            )}

            {/* Email receipt */}
            {customer?.email ? (
              <label className="flex items-center gap-3 cursor-pointer select-none group">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${sendReceipt ? 'bg-brand-600 border-brand-600' : 'border-gray-300 group-hover:border-brand-400'}`}
                  onClick={() => setSendReceipt((v) => !v)}>
                  {sendReceipt && (
                    <svg viewBox="0 0 10 8" className="w-3 h-3 text-white fill-none stroke-current stroke-2">
                      <polyline points="1,4 4,7 9,1" />
                    </svg>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <Mail size={14} className="text-gray-400" />
                  <span>Enviar recibo a <span className="text-gray-800 font-medium">{customer.email}</span></span>
                </div>
                <input type="checkbox" className="hidden" checked={sendReceipt} onChange={() => setSendReceipt((v) => !v)} />
              </label>
            ) : customer && !customer.email ? (
              <p className="text-xs text-gray-400 flex items-center gap-1.5">
                <Mail size={12} className="shrink-0" />
                Sin email registrado ·{' '}
                <a href={`/customers/${customer.id}`} target="_blank" rel="noreferrer"
                  className="text-brand-500 hover:underline">Agregar</a>
              </p>
            ) : null}

            {/* Cash input */}
            {isCashFirst && (
              <div>
                <label className="text-xs font-semibold text-brand-600 uppercase tracking-wider block mb-1.5">
                  Efectivo recibido
                </label>
                <div className="relative border-b border-brand-200 pb-1.5 focus-within:border-brand-500 transition-colors">
                  <span className="absolute left-0 top-0 text-gray-900 font-bold text-sm">S/</span>
                  <input
                    type="number" step="0.01" value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    className="w-full bg-transparent border-none outline-none text-gray-900 pl-5 font-bold"
                  />
                </div>
                {Number(cashTendered) > total && (
                  <p className="text-xs text-gray-500 mt-1">
                    Cambio: <span className="font-semibold text-gray-700">{format(Number(cashTendered) - total)}</span>
                  </p>
                )}
              </div>
            )}

            {/* Payment method buttons */}
            <div className="space-y-2.5">
              {paymentMethods.map((pm) => {
                const Icon   = METHOD_ICONS[pm.type] ?? CircleDollarSign;
                const style  = METHOD_STYLES[pm.type] ?? METHOD_STYLES.OTHER;
                const isCash = pm.type === 'CASH';
                const cashOk = !isCash || Number(cashTendered) >= total;
                return (
                  <button
                    key={pm.id}
                    disabled={isSubmitting || !cashOk}
                    onClick={() => handleProcessPayment(pm.type)}
                    className={`w-full py-3.5 rounded-lg flex justify-center items-center gap-2.5 text-sm font-bold tracking-wide transition-colors disabled:opacity-40 ${style}`}
                  >
                    <Icon size={17} />
                    {pm.name.toUpperCase()}
                  </button>
                );
              })}
            </div>

          </div>
        </div>
      </div>
    </Dialog>
  );
}
