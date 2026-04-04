'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { ImportExportButtons } from '@/components/backoffice/import-export-buttons';
import { ConfirmModal } from '@/components/backoffice/confirm-modal';

interface Customer {
  id: string; name: string; email?: string; phone?: string;
  city?: string; customerCode?: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<Set<string>>(new Set());
  const [deleting, setDeleting]   = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiClient.get('/customers')
      .then((r) => setCustomers(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone ?? '').includes(search),
  );

  const allChecked = filtered.length > 0 && filtered.every((c) => selected.has(c.id));

  function toggleAll() {
    if (allChecked) {
      setSelected((prev) => { const s = new Set(prev); filtered.forEach((c) => s.delete(c.id)); return s; });
    } else {
      setSelected((prev) => { const s = new Set(prev); filtered.forEach((c) => s.add(c.id)); return s; });
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  function handleBulkDeleteClick() {
    if (selected.size === 0) return;
    setShowConfirm(true);
  }

  async function bulkDelete() {
    const ids = Array.from(selected);
    if (!ids.length) return;
    
    setDeleting(true);
    try {
      await apiClient.delete('/customers/bulk', { data: { ids } });
      setSelected(new Set());
      load();
    } catch {
      alert('Error al eliminar. Intenta de nuevo.');
    }
    setDeleting(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
        <div className="flex items-center gap-3">
          <ImportExportButtons entity="customers" onImportDone={load} />
          <Link
            href="/customers/new"
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            + Nuevo Cliente
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <Search size={16} className="text-gray-400 shrink-0" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelected(new Set()); }}
            placeholder="Buscar por nombre, email o teléfono..."
            className="flex-1 text-sm focus:outline-none"
          />
          {selected.size > 0 ? (
            <button
              onClick={handleBulkDeleteClick}
              disabled={deleting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              <Trash2 size={14} />
              Eliminar ({selected.size})
            </button>
          ) : (
            <span className="text-xs text-gray-400">{filtered.length} cliente{filtered.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {/* Table */}
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                  className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
              </th>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Teléfono</th>
              <th className="px-4 py-3 font-medium">Ciudad</th>
              <th className="px-4 py-3 font-medium">Código</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center text-gray-400 py-10">Cargando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-gray-400 py-10">
                {search ? 'Sin resultados.' : 'No hay clientes todavía.'}
              </td></tr>
            ) : filtered.map((c) => (
              <tr
                key={c.id}
                className={`border-b border-gray-50 transition-colors ${selected.has(c.id) ? 'bg-red-50/40' : 'hover:bg-gray-50'}`}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggle(c.id)}
                    className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                </td>
                <td className="px-4 py-3">
                  <Link href={`/customers/${c.id}`} className="font-medium text-gray-800 hover:text-brand-600">
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-500">{c.email ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500">{c.phone ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500">{c.city ?? '—'}</td>
                <td className="px-4 py-3 text-gray-400 font-mono text-xs">{c.customerCode ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={bulkDelete}
        title="Eliminar clientes"
        message={
          <>
            ¿Estás seguro de que quieres eliminar <strong>{selected.size} cliente{selected.size !== 1 ? 's' : ''}</strong>?
            Esta acción no se puede deshacer.
          </>
        }
        confirmText="Sí, eliminar"
      />
    </div>
  );
}
