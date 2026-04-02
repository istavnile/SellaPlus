'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Users,
  BarChart2,
  Settings,
  ShoppingCart,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/products', label: 'Productos', icon: Package },
  { href: '/customers', label: 'Clientes', icon: Users },
  { href: '/reports', label: 'Reportes', icon: BarChart2 },
  { href: '/settings', label: 'Configuracion', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-5 border-b border-gray-100">
        <h1 className="text-xl font-bold text-brand-700">SellaPlus</h1>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname.startsWith(href)
                ? 'bg-brand-50 text-brand-700'
                : 'text-gray-600 hover:bg-gray-100',
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-100">
        <Link
          href="/pos/touch"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors w-full"
        >
          <ShoppingCart size={18} />
          Ir al POS
        </Link>
      </div>
    </aside>
  );
}
