'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, X, Plus, Minus, ShoppingCart,
  Loader2, SlidersHorizontal, Monitor, LogOut, LayoutGrid, List, UserCircle, UserPlus, LayoutDashboard,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/api/client';
import { useTenantStore } from '@/stores/tenant.store';
import { CheckoutModal } from '@/components/pos/checkout-modal';
import { CustomerPickerModal, type SelectedCustomer } from '@/components/pos/customer-picker-modal';
import { cn } from '@/lib/utils/cn';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: string; name: string; sku?: string; basePrice: number;
  posColor: string; posShape: string; posRepresentation: string;
  category?: { id: string; name: string };
  variants: { id: string; stockQty: number; priceOverride?: number }[];
  images: { url: string }[];
}
interface CartItem { productId: string; variantId?: string; name: string; price: number; qty: number; }
interface PosSession { deviceId: string; sessionToken: string; deviceName: string; cashierName: string; }

// ─── SVG Shape ────────────────────────────────────────────────────────────────

function PosShape({ shape, color, size = 44 }: { shape: string; color: string; size?: number }) {
  const s = size;
  if (shape === 'circle') return <svg width={s} height={s} viewBox="0 0 44 44"><circle cx="22" cy="22" r="20" fill={color} /></svg>;
  if (shape === 'stamp') {
    const pts = Array.from({ length: 16 }, (_, i) => {
      const a = (i / 16) * Math.PI * 2; const r = i % 2 === 0 ? 20 : 15;
      return `${22 + r * Math.cos(a)},${22 + r * Math.sin(a)}`;
    }).join(' ');
    return <svg width={s} height={s} viewBox="0 0 44 44"><polygon points={pts} fill={color} /></svg>;
  }
  if (shape === 'hexagon') {
    const pts = Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
      return `${22 + 20 * Math.cos(a)},${22 + 20 * Math.sin(a)}`;
    }).join(' ');
    return <svg width={s} height={s} viewBox="0 0 44 44"><polygon points={pts} fill={color} /></svg>;
  }
  return <svg width={s} height={s} viewBox="0 0 44 44"><rect x="2" y="2" width="40" height="40" rx="6" fill={color} /></svg>;
}

// ─── Cart Sheet (mobile slide-up) ─────────────────────────────────────────────

function CartSheet({
  open, onClose, cart, updateQty, removeItem, subtotal, total, onCheckout,
  customer, onPickCustomer,
}: {
  open: boolean; onClose: () => void;
  cart: CartItem[]; updateQty: (pid: string, vid: string | undefined, d: number) => void;
  removeItem: (pid: string, vid: string | undefined) => void;
  subtotal: number; total: number; onCheckout: () => void;
  customer: SelectedCustomer | null;
  onPickCustomer: () => void;
}) {
  const formatCurrency = useTenantStore((s) => s.format);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  return (
    <>
      {open && <div className="md:hidden fixed inset-0 bg-black/30 z-40" onClick={onClose} />}
      <div ref={ref} className={cn(
        'md:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-50 flex flex-col transition-transform duration-300 safe-bottom',
        open ? 'translate-y-0' : 'translate-y-full',
      )} style={{ maxHeight: '80vh' }}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-5 pb-3 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Ticket actual</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50 px-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-300">
              <ShoppingCart size={40} strokeWidth={1} />
              <p className="mt-2 text-sm">Carrito vacío</p>
            </div>
          ) : cart.map((item) => (
            <div key={`${item.productId}-${item.variantId}`} className="py-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-gray-800 flex-1 leading-tight">{item.name}</p>
                <button onClick={() => removeItem(item.productId, item.variantId)} className="text-gray-300 hover:text-red-400">
                  <X size={14} />
                </button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg">
                  <button onClick={() => updateQty(item.productId, item.variantId, -1)} className="w-8 h-8 flex items-center justify-center text-gray-600">
                    <Minus size={14} />
                  </button>
                  <span className="w-6 text-center text-sm font-semibold">{item.qty}</span>
                  <button onClick={() => updateQty(item.productId, item.variantId, 1)} className="w-8 h-8 flex items-center justify-center text-gray-600">
                    <Plus size={14} />
                  </button>
                </div>
                <span className="text-sm font-bold text-gray-900">{formatCurrency(item.price * item.qty)}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-4 border-t border-gray-100 space-y-3">
          {/* Customer selector */}
          {customer ? (
            <div className="flex items-center gap-2 bg-brand-50 border border-brand-100 rounded-lg px-3 py-2">
              <UserCircle size={15} className="text-brand-500 shrink-0" />
              <span className="text-sm font-medium text-brand-700 flex-1 truncate">{customer.name}</span>
              <button onClick={onPickCustomer} className="text-brand-400 hover:text-brand-600 text-xs">Cambiar</button>
            </div>
          ) : (
            <button onClick={onPickCustomer}
              className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-brand-600 py-2 rounded-lg border border-dashed border-gray-200 hover:border-brand-300 transition-colors">
              <UserPlus size={14} />
              Añadir cliente
            </button>
          )}
          <div className="flex justify-between font-bold text-base text-gray-900">
            <span>Total</span><span>{formatCurrency(total)}</span>
          </div>
          <button onClick={() => { onClose(); onCheckout(); }} disabled={cart.length === 0}
            className="w-full bg-brand-600 text-white py-4 rounded-2xl font-bold text-base hover:bg-brand-700 transition-colors disabled:opacity-40 active:scale-[0.98]">
            Cobrar {formatCurrency(total)}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Desktop Cart panel ───────────────────────────────────────────────────────

function CartPanel({
  cart, updateQty, removeItem, subtotal, total, onCheckout, onClear,
  customer, onPickCustomer,
}: {
  cart: CartItem[]; updateQty: (pid: string, vid: string | undefined, d: number) => void;
  removeItem: (pid: string, vid: string | undefined) => void;
  subtotal: number; total: number; onCheckout: () => void; onClear: () => void;
  customer: SelectedCustomer | null;
  onPickCustomer: () => void;
}) {
  const formatCurrency = useTenantStore((s) => s.format);
  return (
    <div className="hidden md:flex w-72 lg:w-80 bg-white border-l border-gray-200 flex-col shrink-0">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2"><ShoppingCart size={18} />Ticket</h2>
        {cart.length > 0 && <button onClick={onClear} className="text-xs text-gray-400 hover:text-red-500">Vaciar</button>}
      </div>
      <div className="flex-1 overflow-y-auto">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-300">
            <ShoppingCart size={36} strokeWidth={1} /><p className="mt-2 text-sm">Carrito vacío</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {cart.map((item) => (
              <div key={`${item.productId}-${item.variantId}`} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-gray-800 flex-1 leading-tight">{item.name}</p>
                  <button onClick={() => removeItem(item.productId, item.variantId)} className="text-gray-300 hover:text-red-400 mt-0.5"><X size={14} /></button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1 bg-gray-100 rounded-lg">
                    <button onClick={() => updateQty(item.productId, item.variantId, -1)} className="w-7 h-7 flex items-center justify-center text-gray-600 hover:text-red-500"><Minus size={13} /></button>
                    <span className="w-6 text-center text-sm font-semibold">{item.qty}</span>
                    <button onClick={() => updateQty(item.productId, item.variantId, 1)} className="w-7 h-7 flex items-center justify-center text-gray-600 hover:text-green-600"><Plus size={13} /></button>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{formatCurrency(item.price * item.qty)}</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{formatCurrency(item.price)} × {item.qty}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="border-t border-gray-100 p-4 space-y-3">
        {/* Customer selector */}
        {customer ? (
          <div className="flex items-center gap-2 bg-brand-50 border border-brand-100 rounded-lg px-3 py-2">
            <UserCircle size={15} className="text-brand-500 shrink-0" />
            <span className="text-sm font-medium text-brand-700 flex-1 truncate">{customer.name}</span>
            <button onClick={onPickCustomer} className="text-brand-400 hover:text-brand-600 text-xs">Cambiar</button>
          </div>
        ) : (
          <button onClick={onPickCustomer}
            className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-brand-600 py-2 rounded-lg border border-dashed border-gray-200 hover:border-brand-300 transition-colors">
            <UserPlus size={14} />
            Añadir cliente
          </button>
        )}
        <div className="flex justify-between text-sm text-gray-500"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
        <div className="flex justify-between font-bold text-base text-gray-900"><span>Total</span><span>{formatCurrency(total)}</span></div>
        <button onClick={onCheckout} disabled={cart.length === 0}
          className="w-full bg-brand-600 text-white py-3 rounded-xl font-semibold hover:bg-brand-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          Cobrar
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TouchPosPage() {
  const router = useRouter();
  const { format: formatCurrency, load: loadTenant, loaded: tenantLoaded } = useTenantStore();
  useEffect(() => { if (!tenantLoaded) loadTenant(); }, [tenantLoaded, loadTenant]);

  const [products,    setProducts]    = useState<Product[]>([]);
  const [categories,  setCategories]  = useState<{ id: string; name: string }[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [categoryId,  setCategoryId]  = useState('');
  const [cart,        setCart]        = useState<CartItem[]>([]);
  const [cartOpen,    setCartOpen]    = useState(false);
  const [filterOpen,  setFilterOpen]  = useState(false);
  const [viewMode,    setViewMode]    = useState<'grid' | 'list'>('grid');
  const [isCheckoutOpen,   setIsCheckoutOpen]   = useState(false);
  const [isCustomerOpen,   setIsCustomerOpen]   = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomer | null>(null);
  const [session,     setSession]     = useState<PosSession | null>(null);

  useEffect(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('pos_session') : null;
    if (raw) { try { setSession(JSON.parse(raw)); } catch { /* ignore */ } }
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiClient.get('/products', { params: { limit: '500', includeImages: true } }),
      apiClient.get('/categories'),
    ]).then(([pr, cr]) => {
      const raw = pr.data;
      setProducts(Array.isArray(raw) ? raw : (raw.data ?? []));
      setCategories(cr.data ?? []);
    }).catch(() => toast.error('Error cargando productos')).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let list = products;
    if (categoryId) list = list.filter((p) => p.category?.id === categoryId);
    if (search.trim()) { const q = search.toLowerCase(); list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q)); }
    return list;
  }, [products, search, categoryId]);

  const addToCart = (p: Product) => {
    const price = p.variants[0]?.priceOverride != null ? Number(p.variants[0].priceOverride) : Number(p.basePrice);
    const variantId = p.variants[0]?.id;
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === p.id && i.variantId === variantId);
      if (existing) return prev.map((i) => i.productId === p.id && i.variantId === variantId ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { productId: p.id, variantId, name: p.name, price, qty: 1 }];
    });
  };

  const updateQty = (productId: string, variantId: string | undefined, delta: number) => {
    setCart((prev) => prev.map((i) => i.productId === productId && i.variantId === variantId ? { ...i, qty: i.qty + delta } : i).filter((i) => i.qty > 0));
  };

  const removeItem = (productId: string, variantId: string | undefined) => {
    setCart((prev) => prev.filter((i) => !(i.productId === productId && i.variantId === variantId)));
  };

  const handleRelease = async () => {
    if (!session) return;
    try {
      await apiClient.post(`/pos-devices/${session.deviceId}/release`, { sessionToken: session.sessionToken });
    } catch { /* ignore */ }
    localStorage.removeItem('pos_session');
    router.push('/pos/select');
  };

  const subtotal  = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const total     = subtotal;
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const handleSuccess = () => {
    setCart([]);
    setSelectedCustomer(null);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">

      {/* ── Top header ────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-3 py-2.5 flex items-center gap-2 safe-top shrink-0">
        {/* TPV info + back to backoffice */}
        <div className="flex items-center gap-1.5 shrink-0">
          {session && (
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
              <Monitor size={13} className="text-brand-600" />
              <span className="text-xs font-semibold text-gray-700 hidden sm:inline">{session.deviceName}</span>
              <button onClick={handleRelease} title="Liberar TPV" className="text-gray-300 hover:text-red-500 ml-1">
                <LogOut size={12} />
              </button>
            </div>
          )}
          <a href="/dashboard" title="Ir al backoffice"
            className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-500 hover:text-brand-600 hover:border-brand-200 transition-colors">
            <LayoutDashboard size={13} />
            <span className="text-xs font-semibold hidden sm:inline">Backoffice</span>
          </a>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 flex-1 bg-gray-100 rounded-xl px-3 py-2">
          <Search size={15} className="text-gray-400 shrink-0" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto..." className="flex-1 text-sm bg-transparent focus:outline-none min-w-0" />
          {search && <button onClick={() => setSearch('')}><X size={14} className="text-gray-400" /></button>}
        </div>

        {/* View toggle */}
        <button onClick={() => setViewMode((v) => v === 'grid' ? 'list' : 'grid')}
          className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors shrink-0">
          {viewMode === 'grid' ? <List size={16} /> : <LayoutGrid size={16} />}
        </button>

        {/* Filter button */}
        <button onClick={() => setFilterOpen((v) => !v)}
          className={cn('p-2.5 rounded-xl border transition-colors shrink-0', filterOpen || categoryId ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50')}>
          <SlidersHorizontal size={16} />
        </button>
      </div>

      {/* ── Mobile customer bar ───────────────────────────────────────────── */}
      <div className="md:hidden bg-white border-b border-gray-100 px-3 py-2 shrink-0">
        {selectedCustomer ? (
          <div className="flex items-center gap-2 bg-brand-50 border border-brand-100 rounded-xl px-3 py-2">
            <UserCircle size={16} className="text-brand-500 shrink-0" />
            <span className="text-sm font-semibold text-brand-700 flex-1 truncate">{selectedCustomer.name}</span>
            <button onClick={() => setIsCustomerOpen(true)} className="text-brand-400 text-xs font-medium hover:text-brand-600 shrink-0">Cambiar</button>
            <button onClick={() => setSelectedCustomer(null)} className="text-brand-300 hover:text-red-400 shrink-0 ml-1">
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsCustomerOpen(true)}
            className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white text-sm font-semibold py-2.5 rounded-xl transition-all shadow-sm shadow-brand-200"
          >
            <UserPlus size={16} />
            Añadir cliente
          </button>
        )}
      </div>

      {/* ── Category filter row ────────────────────────────────────────────── */}
      {filterOpen && (
        <div className="bg-white border-b border-gray-100 px-3 py-2 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
          <button onClick={() => setCategoryId('')}
            className={cn('px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0',
              !categoryId ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
            Todas
          </button>
          {categories.map((c) => (
            <button key={c.id} onClick={() => setCategoryId(c.id === categoryId ? '' : c.id)}
              className={cn('px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0',
                categoryId === c.id ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Product area */}
        <div className="flex-1 overflow-y-auto p-3 pb-24 md:pb-4">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-400">
              <Loader2 size={24} className="animate-spin mr-2" /> Cargando...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
              Sin productos{search || categoryId ? ' con los filtros actuales' : ''}.
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-3">
              {filtered.map((p) => {
                const inCart = cart.find((i) => i.productId === p.id);
                return (
                  <button key={p.id} onClick={() => addToCart(p)}
                    className={cn(
                      'bg-white rounded-2xl border p-2 flex flex-col items-center gap-1.5 transition-all active:scale-95 text-left cursor-pointer',
                      inCart ? 'border-brand-400 shadow-md shadow-brand-100' : 'border-gray-200 hover:border-brand-300 hover:shadow-sm',
                    )}>
                    <div className="w-full aspect-square flex items-center justify-center rounded-xl overflow-hidden bg-gray-50 relative">
                      {p.images?.[0]?.url ? (
                        <img src={p.images[0].url} alt={p.name} className="w-full h-full object-contain" />
                      ) : (
                        <PosShape shape={p.posShape ?? 'square'} color={p.posColor ?? '#e5e7eb'} size={44} />
                      )}
                      {inCart && (
                        <div className="absolute top-1 right-1 bg-brand-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                          {inCart.qty}
                        </div>
                      )}
                    </div>
                    <div className="w-full text-center pb-0.5">
                      <p className="text-[11px] font-medium text-gray-800 line-clamp-2 leading-tight">{p.name}</p>
                      <p className="text-xs font-bold text-brand-600 mt-0.5">{formatCurrency(Number(p.basePrice))}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="divide-y divide-gray-100 bg-white rounded-2xl overflow-hidden border border-gray-200">
              {filtered.map((p) => {
                const inCart = cart.find((i) => i.productId === p.id);
                return (
                  <button key={p.id} onClick={() => addToCart(p)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 transition-colors active:bg-brand-50 text-left',
                      inCart ? 'bg-brand-50' : 'hover:bg-gray-50',
                    )}>
                    <div className="w-11 h-11 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center shrink-0 border border-gray-200">
                      {p.images?.[0]?.url ? (
                        <img src={p.images[0].url} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <PosShape shape={p.posShape ?? 'square'} color={p.posColor ?? '#e5e7eb'} size={30} />
                      )}
                    </div>
                    <span className="flex-1 text-sm font-medium text-gray-800 text-left leading-tight">{p.name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      {inCart && (
                        <span className="bg-brand-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          ×{inCart.qty}
                        </span>
                      )}
                      <span className="text-sm font-bold text-gray-800">{formatCurrency(Number(p.basePrice))}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Desktop cart */}
        <CartPanel
          cart={cart} updateQty={updateQty} removeItem={removeItem}
          subtotal={subtotal} total={total}
          onCheckout={() => setIsCheckoutOpen(true)}
          onClear={() => setCart([])}
          customer={selectedCustomer}
          onPickCustomer={() => setIsCustomerOpen(true)}
        />
      </div>

      {/* ── Mobile floating cart button ───────────────────────────────────── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 safe-bottom pointer-events-none">
        <button
          onClick={() => setCartOpen(true)}
          className={cn(
            'w-full pointer-events-auto flex items-center justify-between bg-brand-600 text-white px-5 py-4 rounded-2xl shadow-xl shadow-brand-200 transition-all active:scale-[0.98]',
            cart.length === 0 && 'opacity-50',
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-white text-brand-600 text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </div>
            <span className="font-semibold text-sm">
              {cart.length === 0 ? 'Sin artículos' : `${cartCount} artículo${cartCount !== 1 ? 's' : ''}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {selectedCustomer && (
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full truncate max-w-24">
                {selectedCustomer.name.split(' ')[0]}
              </span>
            )}
            <span className="font-bold text-base">{formatCurrency(total)}</span>
          </div>
        </button>
      </div>

      {/* Mobile cart sheet */}
      <CartSheet
        open={cartOpen} onClose={() => setCartOpen(false)}
        cart={cart} updateQty={updateQty} removeItem={removeItem}
        subtotal={subtotal} total={total}
        onCheckout={() => setIsCheckoutOpen(true)}
        customer={selectedCustomer}
        onPickCustomer={() => { setCartOpen(false); setIsCustomerOpen(true); }}
      />

      {/* Customer picker modal */}
      <CustomerPickerModal
        open={isCustomerOpen}
        onClose={() => setIsCustomerOpen(false)}
        onSelect={setSelectedCustomer}
      />

      {/* Checkout modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        total={total} subtotal={subtotal} cart={cart}
        customer={selectedCustomer}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
