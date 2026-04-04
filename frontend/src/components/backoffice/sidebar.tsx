'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Package,
  Users,
  UserCog,
  BarChart2,
  Settings,
  ShoppingCart,
  ChevronDown,
  TrendingUp,
  Receipt,
  UserCheck,
  CreditCard,
  Tag,
  Box,
  LogOut,
  User,
  List,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { apiClient } from '@/lib/api/client';

const reportSubNav = [
  { href: '/reports/resumen',      label: 'Resumen de ventas', icon: TrendingUp },
  { href: '/reports/recibos',      label: 'Recibos',           icon: Receipt },
  { href: '/reports/por-empleado', label: 'Por empleado',      icon: UserCheck },
  { href: '/reports/por-pago',     label: 'Por tipo de pago',  icon: CreditCard },
  { href: '/reports/por-categoria',label: 'Por categoría',     icon: Tag },
  { href: '/reports/por-articulo', label: 'Por artículo',      icon: Box },
];

const employeeSubNav = [
  { href: '/employees',       label: 'Lista de empleados', icon: List,        exact: true },
  { href: '/employees/roles', label: 'Derechos de acceso', icon: ShieldCheck, exact: false },
];

function decodeJwt(token: string): Record<string, any> | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname  = usePathname();
  const router    = useRouter();
  const onReports   = pathname.startsWith('/reports');
  const onEmployees = pathname.startsWith('/employees');

  const [reportsOpen,   setReportsOpen]   = useState(onReports);
  const [employeesOpen, setEmployeesOpen] = useState(onEmployees);
  const [userMenuOpen,  setUserMenuOpen]  = useState(false);
  const [tenantName,    setTenantName]    = useState('');
  const [userEmail,     setUserEmail]     = useState('');
  const [userRole,      setUserRole]      = useState('OWNER');
  const [sectionPerms,  setSectionPerms]  = useState<Record<string, boolean>>({});
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (onReports)   setReportsOpen(true);   }, [onReports]);
  useEffect(() => { if (onEmployees) setEmployeesOpen(true); }, [onEmployees]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (token) {
      const payload = decodeJwt(token);
      if (payload?.email) setUserEmail(payload.email);
      if (payload?.role)  setUserRole(payload.role);
    }
    apiClient.get('/tenant/settings').then((r) => setTenantName(r.data?.name ?? '')).catch(() => {});
    apiClient.get('/tenant/role-permissions').then((r) => {
      const token2 = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      const role = token2 ? (decodeJwt(token2)?.role ?? 'CASHIER') : 'CASHIER';
      const myPerms: Record<string, boolean> = {};
      for (const p of (r.data as { role: string; section: string; isEnabled: boolean }[])) {
        if (p.role === role) myPerms[p.section] = p.isEnabled;
      }
      setSectionPerms(myPerms);
    }).catch(() => {});
  }, []);

  const can = (section: string) => userRole === 'OWNER' || sectionPerms[section] === true;

  // Close user menu on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    router.push('/login');
  };

  return (
    <aside className="w-72 md:w-60 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* App logo — hidden on mobile (shown in layout top bar instead) */}
      <div className="hidden md:block px-5 py-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-brand-700">SellaPlus</h1>
      </div>
      {/* Mobile top spacing for the close button */}
      <div className="md:hidden h-12 border-b border-gray-100" />

      {/* User dropdown */}
      <div className="p-3 border-b border-gray-100 relative" ref={menuRef}>
        <button
          onClick={() => setUserMenuOpen((v) => !v)}
          className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
        >
          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
            <User size={15} className="text-brand-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{tenantName || 'Mi negocio'}</p>
            <p className="text-xs text-gray-400 truncate leading-tight">{userEmail}</p>
          </div>
          <ChevronDown size={14} className={cn('text-gray-400 transition-transform shrink-0', userMenuOpen && 'rotate-180')} />
        </button>

        {userMenuOpen && (
          <div className="absolute left-3 right-3 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
            <Link
              href="/account"
              onClick={() => setUserMenuOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <User size={15} className="text-gray-400" />
              Cuenta
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100"
            >
              <LogOut size={15} />
              Cerrar sesión
            </button>
          </div>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {can('dashboard') && (
          <Link href="/dashboard" onClick={onNavigate}
            className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname.startsWith('/dashboard') ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-100')}
          >
            <LayoutDashboard size={18} /> Dashboard
          </Link>
        )}
        {can('products') && (
          <Link href="/products" onClick={onNavigate}
            className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname.startsWith('/products') ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-100')}
          >
            <Package size={18} /> Productos
          </Link>
        )}
        {can('customers') && (
          <Link href="/customers" onClick={onNavigate}
            className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname.startsWith('/customers') ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-100')}
          >
            <Users size={18} /> Clientes
          </Link>
        )}

        {/* Empleados — expandable */}
        {can('employees') && (
          <>
            <button
              onClick={() => setEmployeesOpen((v) => !v)}
              className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full',
                onEmployees ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-100')}
            >
              <UserCog size={18} />
              <span className="flex-1 text-left">Empleados</span>
              <ChevronDown size={14} className={cn('transition-transform', employeesOpen && 'rotate-180')} />
            </button>
            {employeesOpen && (
              <div className="ml-3 pl-3 border-l border-gray-200 space-y-0.5">
                {employeeSubNav.map(({ href, label, icon: Icon, exact }) => (
                  <Link key={href} href={href} onClick={onNavigate}
                    className={cn('flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      (exact ? pathname === href : pathname.startsWith(href))
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700')}
                  >
                    <Icon size={15} /> {label}
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {/* Reportes — expandable */}
        {can('reports') && (
          <>
            <button
              onClick={() => setReportsOpen((v) => !v)}
              className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full',
                onReports ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-100')}
            >
              <BarChart2 size={18} />
              <span className="flex-1 text-left">Reportes</span>
              <ChevronDown size={14} className={cn('transition-transform', reportsOpen && 'rotate-180')} />
            </button>
            {reportsOpen && (
              <div className="ml-3 pl-3 border-l border-gray-200 space-y-0.5">
                {reportSubNav.map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href} onClick={onNavigate}
                    className={cn('flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      pathname === href ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700')}
                  >
                    <Icon size={15} /> {label}
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {can('settings') && (
          <Link href="/settings" onClick={onNavigate}
            className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname.startsWith('/settings') ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-100')}
          >
            <Settings size={18} /> Configuración
          </Link>
        )}
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
