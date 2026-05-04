'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, Receipt, Package, Users, ArrowUpRight, Store, CreditCard } from 'lucide-react';
import Link from 'next/link';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { apiClient } from '@/lib/api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Summary {
  todayRevenue: number; todayTransactions: number;
  totalRevenue: number; totalTransactions: number; netSales: number;
}
interface ChartPoint  { day: string; value: number; }
interface ProductRow  { productName: string; totalRevenue: number | null; }
interface PaymentRow  { method: string; netAmount: number; transactions: number; }
interface RecentTx {
  id: string; transactionNumber: string; total: number; createdAt: string;
  cashier?: { name: string };
  payments?: { method: string; gatewayName?: string }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const money = (n: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 }).format(n);

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia', OTHER: 'Otro',
};
const METHOD_COLORS: Record<string, string> = {
  CASH: '#22c55e', CARD: '#3b82f6', TRANSFER: '#8b5cf6', OTHER: '#f59e0b',
};

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 shadow-xl rounded-xl px-4 py-3 text-sm">
      <p className="text-gray-400 font-medium mb-0.5">{label}</p>
      <p className="text-brand-600 font-bold text-base">{money(payload[0].value)}</p>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded-lg ${className}`} />;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [summary,       setSummary]       = useState<Summary | null>(null);
  const [chartData,     setChartData]     = useState<ChartPoint[]>([]);
  const [topProducts,   setTopProducts]   = useState<ProductRow[]>([]);
  const [payments,      setPayments]      = useState<PaymentRow[]>([]);
  const [recentTx,      setRecentTx]      = useState<RecentTx[]>([]);
  const [productCount,  setProductCount]  = useState(0);
  const [customerCount, setCustomerCount] = useState(0);
  const [userName,      setUserName]      = useState('');
  const [loading,       setLoading]       = useState(true);

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';
  const todayLabel = new Date().toLocaleDateString('es-PE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  useEffect(() => {
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        const p = JSON.parse(atob(token.split('.')[1]));
        setUserName(p.name || '');
      }
    } catch { /* ignore */ }

    // Last 7 days skeleton (Lima time)
    const skeleton = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        day: d.toLocaleDateString('es-PE', { weekday: 'short', timeZone: 'America/Lima' }),
        key: d.toLocaleDateString('en-CA', { timeZone: 'America/Lima' }),
      };
    });

    Promise.allSettled([
      apiClient.get('/reports/sales/summary'),
      apiClient.get('/reports/sales/daily?days=7'),
      apiClient.get('/reports/sales/by-product'),
      apiClient.get('/reports/sales/by-payment-method'),
      apiClient.get('/reports/receipts?take=5'),
      apiClient.get('/products'),
      apiClient.get('/customers'),
    ]).then(([sum, daily, prod, pay, rec, prods, custs]) => {
      if (sum.status === 'fulfilled')  setSummary(sum.value.data);

      if (daily.status === 'fulfilled') {
        const map: Record<string, number> = {};
        for (const d of (daily.value.data || [])) {
          const k = new Date(d.date + 'T12:00:00Z')
            .toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
          map[k] = (map[k] || 0) + (d.netSales || 0);
        }
        setChartData(skeleton.map(({ day, key }) => ({ day, value: map[key] ?? 0 })));
      } else {
        setChartData(skeleton.map(({ day }) => ({ day, value: 0 })));
      }

      if (prod.status === 'fulfilled') setTopProducts((prod.value.data || []).slice(0, 5));
      if (pay.status  === 'fulfilled') setPayments(pay.value.data || []);
      if (rec.status  === 'fulfilled') setRecentTx(rec.value.data || []);

      if (prods.status === 'fulfilled') {
        const raw = prods.value.data;
        setProductCount(Array.isArray(raw) ? raw.length : (raw.data?.length ?? 0));
      }
      if (custs.status === 'fulfilled') {
        const raw = custs.value.data;
        setCustomerCount(Array.isArray(raw) ? raw.length : (raw.data?.length ?? 0));
      }

      setLoading(false);
    });
  }, []);

  const avgTicket = summary && summary.todayTransactions > 0
    ? summary.todayRevenue / summary.todayTransactions : 0;

  const totalPayments      = payments.reduce((s, p) => s + p.netAmount, 0);
  const topProductRevenue  = Number(topProducts[0]?.totalRevenue ?? 0) || 1;

  const kpis = [
    {
      label: 'Ventas hoy',
      value: money(summary?.todayRevenue ?? 0),
      sub: `Histórico · ${money(summary?.totalRevenue ?? 0)}`,
      icon: <TrendingUp size={18} />,
      iconBg: 'bg-emerald-50 text-emerald-600',
      border: 'border-t-emerald-400',
      href: '/reports/resumen',
    },
    {
      label: 'Transacciones hoy',
      value: String(summary?.todayTransactions ?? 0),
      sub: `Histórico · ${summary?.totalTransactions ?? 0} ventas`,
      icon: <Receipt size={18} />,
      iconBg: 'bg-blue-50 text-blue-600',
      border: 'border-t-blue-400',
      href: '/reports/recibos',
    },
    {
      label: 'Ticket promedio',
      value: money(avgTicket),
      sub: 'Ventas ÷ pedidos de hoy',
      icon: <TrendingUp size={18} />,
      iconBg: 'bg-violet-50 text-violet-600',
      border: 'border-t-violet-400',
      href: '/reports/recibos',
    },
    {
      label: 'Clientes',
      value: String(customerCount),
      sub: `${productCount} productos en catálogo`,
      icon: <Users size={18} />,
      iconBg: 'bg-orange-50 text-orange-500',
      border: 'border-t-orange-400',
      href: '/customers',
    },
  ];

  return (
    <div className="space-y-5 pb-10">

      {/* ── Greeting ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {greeting}{userName ? `, ${userName.split(' ')[0]}` : ''}
          </h1>
          <p className="text-gray-400 text-sm mt-0.5 capitalize">{todayLabel}</p>
        </div>
        <Link
          href="/pos/touch"
          className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm w-fit"
        >
          <Store size={15} /> Ir al Punto de Venta
        </Link>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <Link
            key={k.label} href={k.href}
            className={`bg-white rounded-2xl border border-gray-100 border-t-2 ${k.border} shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all group outline-none`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${k.iconBg}`}>
                {k.icon}
              </div>
              <ArrowUpRight size={15} className="text-gray-300 group-hover:text-gray-400 transition-colors mt-0.5" />
            </div>
            {loading ? (
              <>
                <Skeleton className="h-7 w-3/4 mb-2" />
                <Skeleton className="h-3.5 w-1/2 mb-1" />
                <Skeleton className="h-3 w-2/3" />
              </>
            ) : (
              <>
                <p className="text-[1.6rem] font-bold text-gray-900 leading-none mb-1.5 tracking-tight">{k.value}</p>
                <p className="text-xs font-semibold text-gray-500">{k.label}</p>
                <p className="text-[11px] text-gray-400 mt-0.5 truncate">{k.sub}</p>
              </>
            )}
          </Link>
        ))}
      </div>

      {/* ── Sales Chart + Top Products ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Sales chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-[15px] font-bold text-gray-900">Tendencia de ventas</h2>
              <p className="text-xs text-gray-400 mt-0.5">Ventas netas · últimos 7 días</p>
            </div>
          </div>
          {loading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 4, right: 2, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="dashGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#2563eb" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#f1f5f9" vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false} tickLine={false} width={56}
                  tickFormatter={(v) => v === 0 ? 'S/0' : `S/${(v / 1000).toFixed(1)}k`}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }} />
                <Area
                  type="monotone" dataKey="value"
                  stroke="#2563eb" strokeWidth={2.5}
                  fill="url(#dashGrad)"
                  dot={false}
                  activeDot={{ r: 5, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-[15px] font-bold text-gray-900">Top productos</h2>
              <p className="text-xs text-gray-400 mt-0.5">Por ingresos totales</p>
            </div>
            <Link href="/reports/por-articulo" className="text-xs text-brand-600 hover:underline font-medium">
              Ver más
            </Link>
          </div>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-1/5" />
                  </div>
                  <Skeleton className="h-1.5 w-full" />
                </div>
              ))}
            </div>
          ) : topProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-300">
              <Package size={32} strokeWidth={1} />
              <p className="text-xs mt-2">Sin datos aún</p>
            </div>
          ) : (
            <div className="space-y-4">
              {topProducts.map((p, i) => {
                const rev = Number(p.totalRevenue ?? 0);
                const pct = topProductRevenue > 0 ? (rev / topProductRevenue) * 100 : 0;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1.5 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[11px] font-bold text-gray-400 w-4 shrink-0">{i + 1}</span>
                        <p className="text-[13px] text-gray-700 font-medium truncate">{p.productName}</p>
                      </div>
                      <p className="text-[13px] font-bold text-gray-900 shrink-0">{money(rev)}</p>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden ml-6">
                      <div
                        className="h-full bg-brand-500 rounded-full"
                        style={{ width: `${pct}%`, transition: 'width 0.6s ease' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* ── Recent Transactions + Payment Methods ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Recent transactions */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <div>
              <h2 className="text-[15px] font-bold text-gray-900">Últimas ventas</h2>
              <p className="text-xs text-gray-400 mt-0.5">Transacciones más recientes</p>
            </div>
            <Link href="/reports/recibos" className="text-xs text-brand-600 hover:underline font-medium">
              Ver todas
            </Link>
          </div>

          {loading ? (
            <div className="divide-y divide-gray-50">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-3.5">
                  <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <div className="space-y-1.5 text-right">
                    <Skeleton className="h-3.5 w-16" />
                    <Skeleton className="h-3 w-10 ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentTx.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-gray-300">
              <Receipt size={32} strokeWidth={1} />
              <p className="text-xs mt-2">Sin ventas recientes</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentTx.map((tx) => {
                const pm = tx.payments?.[0];
                const pmLabel = pm
                  ? (pm.gatewayName || METHOD_LABELS[pm.method] || pm.method)
                  : '—';
                return (
                  <div key={tx.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50/60 transition-colors">
                    <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                      <Receipt size={15} className="text-brand-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-gray-800">{tx.transactionNumber}</p>
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">
                        {tx.cashier?.name ?? '—'} · {pmLabel}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[13px] font-bold text-gray-900">{money(Number(tx.total))}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {new Date(tx.createdAt).toLocaleTimeString('es-PE', {
                          hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima',
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="mb-5">
            <h2 className="text-[15px] font-bold text-gray-900">Métodos de pago</h2>
            <p className="text-xs text-gray-400 mt-0.5">Distribución histórica</p>
          </div>

          {loading ? (
            <div className="space-y-5">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-4 w-10" />
                  </div>
                  <Skeleton className="h-1.5 w-full" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : payments.filter(p => p.netAmount > 0).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-300">
              <CreditCard size={32} strokeWidth={1} />
              <p className="text-xs mt-2">Sin datos aún</p>
            </div>
          ) : (
            <div className="space-y-5">
              {payments
                .filter(p => p.netAmount > 0)
                .sort((a, b) => b.netAmount - a.netAmount)
                .map((p) => {
                  const label = METHOD_LABELS[p.method] ?? p.method;
                  const pct   = totalPayments > 0 ? Math.round((p.netAmount / totalPayments) * 100) : 0;
                  const color = METHOD_COLORS[p.method] ?? '#94a3b8';
                  return (
                    <div key={p.method}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <p className="text-[13px] text-gray-700 font-medium">{label}</p>
                        </div>
                        <span className="text-[13px] font-bold text-gray-900">{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: color, transition: 'width 0.6s ease' }}
                        />
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">{money(p.netAmount)}</p>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
