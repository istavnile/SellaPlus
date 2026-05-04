'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

const ROLE_LABELS: Record<string, string> = {
  OWNER:   'Propietario',
  ADMIN:   'Administrador',
  MANAGER: 'Gerente',
  CASHIER: 'Cajero',
};

interface Employee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  isActive: boolean;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch]       = useState('');
  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState(10);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    apiClient.get('/employees')
      .then((r) => setEmployees(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = employees.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.email.toLowerCase().includes(search.toLowerCase()),
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged      = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Colaboradores</h1>
        <Link
          href="/employees/new"
          className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          + Nuevo Colaborador
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <Search size={16} className="text-gray-400 shrink-0" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por nombre o email..."
            className="flex-1 text-sm focus:outline-none"
          />
        </div>



        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm mt-2 min-w-[600px]">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="px-4 py-3 w-10">
                <input type="checkbox" className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
              </th>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Correo electrónico</th>
              <th className="px-4 py-3 font-medium">Número de teléfono</th>
              <th className="px-4 py-3 font-medium">Rol</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center text-gray-400 py-10">Cargando...</td>
              </tr>
            ) : paged.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-gray-400 py-10">No hay colaboradores todavía.</td>
              </tr>
            ) : paged.map((emp) => (
              <tr key={emp.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <input type="checkbox" className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                </td>
                <td className="px-4 py-3">
                  <Link href={`/employees/${emp.id}`} className="font-medium text-gray-800 hover:text-brand-600">
                    {emp.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{emp.email}</td>
                <td className="px-4 py-3 text-gray-500">{emp.phone ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500">{ROLE_LABELS[emp.role] ?? emp.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap items-center gap-4 px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-2 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40"
          >
            ‹
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-2 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40"
          >
            ›
          </button>
          <span>
            Página: <strong>{page}</strong> de {totalPages}
          </span>
          <span className="ml-auto flex items-center gap-2">
            Filas por página:
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="border border-gray-200 rounded px-2 py-1 bg-white"
            >
              {PAGE_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </span>
        </div>
      </div>
    </div>
  );
}
