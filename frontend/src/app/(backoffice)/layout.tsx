'use client';

import { useState } from 'react';
import { Menu, ShoppingCart, X } from 'lucide-react';
import Link from 'next/link';
import { Sidebar } from '@/components/backoffice/sidebar';
import { TenantInitializer } from '@/components/backoffice/tenant-initializer';

export default function BackofficeLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <TenantInitializer />

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 bg-white border-b border-gray-200 shrink-0" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 text-gray-500 hover:text-gray-900"
            aria-label="Abrir menú"
          >
            <Menu size={22} />
          </button>
          <span className="text-base font-bold text-brand-700">SellaPlus</span>
          <Link href="/pos/touch" className="p-2 -mr-2 text-gray-500 hover:text-brand-600" aria-label="Ir al POS">
            <ShoppingCart size={20} />
          </Link>
        </div>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — drawer on mobile, fixed on desktop */}
      <div className={[
        'fixed md:relative inset-y-0 left-0 z-50 md:z-auto flex flex-col',
        'transition-transform duration-300 md:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
      ].join(' ')}>
        {/* Mobile close button inside drawer */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="md:hidden absolute top-3 right-3 z-10 p-1.5 text-gray-400 hover:text-gray-700"
          aria-label="Cerrar menú"
        >
          <X size={18} />
        </button>
        <Sidebar onNavigate={() => setSidebarOpen(false)} />
      </div>

      {/* Main content — padded top on mobile for the fixed bar + safe area */}
      <main className="flex-1 overflow-y-auto md:pt-0" style={{ paddingTop: 'calc(3.5rem + env(safe-area-inset-top))' } as React.CSSProperties}>
        <div className="p-4 md:p-6 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
