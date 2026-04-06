'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, Receipt, Package, Users } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { formatCurrency } from '@/lib/utils/currency';
import Link from 'next/link';

interface Stat {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  href: string;
}

export default function DashboardPage() {
  const [sales,       setSales]       = useState(0);
  const [transactions, setTransactions] = useState(0);
  const [products,    setProducts]    = useState(0);
  const [customers,   setCustomers]   = useState(0);

  useEffect(() => {
    apiClient.get('/reports/sales/summary').then((r) => {
      setSales(Number(r.data.todayRevenue ?? 0));
      setTransactions(r.data.todayTransactions ?? 0);
    }).catch(() => {});

    apiClient.get('/products').then((r) => {
      const raw = r.data;
      setProducts(Array.isArray(raw) ? raw.length : (raw.data?.length ?? 0));
    }).catch(() => {});

    apiClient.get('/customers').then((r) => {
      const raw = r.data;
      setCustomers(Array.isArray(raw) ? raw.length : (raw.data?.length ?? 0));
    }).catch(() => {});
  }, []);

  const stats: Stat[] = [
    {
      label: 'Ventas hoy',
      value: formatCurrency(sales),
      icon:  <TrendingUp size={22} />,
      color: 'bg-green-50 text-green-600',
      href: '/reports/resumen',
    },
    {
      label: 'Transacciones',
      value: String(transactions),
      icon:  <Receipt size={22} />,
      color: 'bg-brand-50 text-brand-600',
      href: '/reports/recibos',
    },
    {
      label: 'Productos',
      value: String(products),
      icon:  <Package size={22} />,
      color: 'bg-orange-50 text-orange-500',
      href: '/products',
    },
    {
      label: 'Clientes',
      value: String(customers),
      icon:  <Users size={22} />,
      color: 'bg-indigo-50 text-indigo-500',
      href: '/customers',
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6 font-primary">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((card) => (
          <Link key={card.label} href={card.href} className="bg-white rounded-xl border border-gray-200 p-5 block hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all outline-none focus:ring-2 focus:ring-brand-500/50 cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
              </div>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${card.color}`}>
                {card.icon}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
