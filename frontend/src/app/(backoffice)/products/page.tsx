'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Search, ChevronDown, Trash2, Loader2, AlertTriangle, PackageX,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/api/client';
import { ImportExportButtons } from '@/components/backoffice/import-export-buttons';
import { ConfirmModal } from '@/components/backoffice/confirm-modal';
import { useCurrency } from '@/hooks/useCurrency';

interface Category { id: string; name: string }

interface Product {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  basePrice: number;
  costPrice: number;
  isActive: boolean;
  stockAlertThreshold?: number;
  category?: { id: string; name: string };
  variants: { stockQty: number }[];
}

type StockFilter = 'all' | 'low_stock' | 'out_of_stock';

const ROWS_OPTIONS = [10, 25, 50, 100];

export default function ProductsPage() {
  const { format: formatCurrency } = useCurrency();
  const [products, setProducts]           = useState<Product[]>([]);
  const [categories, setCategories]       = useState<Category[]>([]);
  const [search, setSearch]               = useState('');
  const [categoryId, setCategoryId]       = useState('');
  const [stockFilter, setStockFilter]     = useState<StockFilter>('all');
  const [loading, setLoading]             = useState(true);
  const [selected, setSelected]           = useState<Set<string>>(new Set());
  const [deleting, setDeleting]           = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [page, setPage]                   = useState(1);
  const [rowsPerPage, setRowsPerPage]     = useState(25);
  const [sortCol, setSortCol]             = useState<'name' | 'basePrice' | 'stock'>('name');
  const [sortDir, setSortDir]             = useState<'asc' | 'desc'>('asc');
  const [total, setTotal]                 = useState(0);
  const [totalPages, setTotalPages]       = useState(1);

  // ── loaders ────────────────────────────────────────────────────────────────

  const loadCategories = useCallback(() => {
    apiClient.get('/categories').then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setSelected(new Set());

    const params: any = {
      page,
      limit: rowsPerPage,
      sortBy: sortCol,
      sortOrder: sortDir,
    };
    if (categoryId) params.categoryId = categoryId;
    if (search.trim()) params.search = search;
    if (stockFilter !== 'all') params.stockAlert = stockFilter;

    apiClient.get('/products', { params })
      .then((r) => {
        const { data: items, total: t, totalPages: tp } = r.data;
        setProducts(items ?? []);
        setTotal(t ?? 0);
        setTotalPages(tp ?? 1);
      })
      .catch(() => toast.error('Error al cargar productos'))
      .finally(() => setLoading(false));
  }, [categoryId, page, rowsPerPage, search, stockFilter, sortCol, sortDir]);

  useEffect(() => { loadCategories(); }, [loadCategories]);
  useEffect(() => { load(); }, [load]);

  // ── derived: stock helper ───────────────────────────────────────────────────

  const totalStock = (p: Product) => p.variants.reduce((s, v) => s + (v.stockQty ?? 0), 0);

  const margin = (p: Product) => {
    if (!p.basePrice || p.basePrice === 0) return null;
    return ((p.basePrice - (p.costPrice ?? 0)) / p.basePrice) * 100;
  };

  // We no longer need client-side filter+sort+paginate because the server does it.
  const paginated = products;

  const safePage    = Math.min(page, totalPages);

  // ── selection ──────────────────────────────────────────────────────────────

  const allPageSelected = paginated.length > 0 && paginated.every((p) => selected.has(p.id));

  const toggleAll = () => {
    if (allPageSelected) {
      const next = new Set(selected);
      paginated.forEach((p) => next.delete(p.id));
      setSelected(next);
    } else {
      const next = new Set(selected);
      paginated.forEach((p) => next.add(p.id));
      setSelected(next);
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  // ── bulk delete ────────────────────────────────────────────────────────────

  const handleBulkDeleteClick = () => {
    if (selected.size === 0) return;
    setShowConfirm(true);
  };

  const bulkDelete = async () => {
    if (!selected.size) return;
    setDeleting(true);
    try {
      await apiClient.delete('/products/bulk', { data: { ids: Array.from(selected) } });
      toast.success(`${selected.size} producto(s) desactivados`);
      setSelected(new Set());
      load();
    } catch {
      toast.error('Error al eliminar los productos');
    } finally {
      setDeleting(false);
    }
  };

  // ── sort helper ────────────────────────────────────────────────────────────

  const handleSort = (col: typeof sortCol) => {
    if (col === sortCol) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir('asc'); }
  };

  const SortArrow = ({ col }: { col: typeof sortCol }) =>
    sortCol !== col ? null : (
      <span className="ml-0.5 text-brand-600">{sortDir === 'asc' ? '↑' : '↓'}</span>
    );

  // ── stock badge ────────────────────────────────────────────────────────────

  const StockBadge = ({ p }: { p: Product }) => {
    const s = totalStock(p);
    if (s === 0)  return <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600"><PackageX size={12}/>{s}</span>;
    if (s <= 5)   return <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600"><AlertTriangle size={12}/>{s}</span>;
    return <span className="text-gray-700 font-medium">{s}</span>;
  };

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Lista de artículos</h1>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button
              onClick={handleBulkDeleteClick}
              disabled={deleting}
              className="flex items-center gap-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
              <span className="hidden sm:inline">Eliminar ({selected.size})</span>
              <span className="sm:hidden">({selected.size})</span>
            </button>
          )}
          <ImportExportButtons entity="products" onImportDone={load} />
          <Link
            href="/products/new"
            className="bg-brand-600 text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors whitespace-nowrap"
          >
            <span className="hidden sm:inline">+ Agregar artículo</span>
            <span className="sm:hidden">+ Nuevo</span>
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-100">
          {/* Search */}
          <div className="flex items-center gap-2 flex-1 min-w-[180px]">
            <Search size={16} className="text-gray-400 shrink-0" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar por nombre o SKU..."
              className="flex-1 text-sm focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Category filter */}
            <div className="relative">
              <select
                value={categoryId}
                onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
                className="appearance-none text-sm border border-gray-200 rounded-lg px-3 py-1.5 pr-7 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
              >
                <option value="">Todas las categorías</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            {/* Stock alert filter */}
            <div className="relative">
              <select
                value={stockFilter}
                onChange={(e) => { setStockFilter(e.target.value as StockFilter); setPage(1); }}
                className="appearance-none text-sm border border-gray-200 rounded-lg px-3 py-1.5 pr-7 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
              >
                <option value="all">Todos los artículos</option>
                <option value="low_stock">Inventario bajo</option>
                <option value="out_of_stock">No disponible</option>
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            <span className="text-xs text-gray-400 whitespace-nowrap">
              {total} artículo{total !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Mobile card list */}
        <div className="sm:hidden divide-y divide-gray-100">
          {loading ? (
            <div className="py-12 text-center text-gray-400"><Loader2 size={20} className="animate-spin inline-block" /></div>
          ) : paginated.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              {search || categoryId || stockFilter !== 'all' ? 'Sin resultados.' : 'No hay artículos todavía.'}
            </div>
          ) : paginated.map((p) => {
            const m = margin(p);
            return (
              <div key={p.id} className={`flex items-center gap-3 px-4 py-3 ${selected.has(p.id) ? 'bg-brand-50' : ''}`}>
                <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)}
                  className="w-4 h-4 rounded border-gray-300 text-brand-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <Link href={`/products/${p.id}`} className="font-medium text-gray-800 text-sm leading-snug block truncate">
                    {p.name}
                  </Link>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {p.category && <span className="text-xs text-gray-400">{p.category.name}</span>}
                    {p.sku && <span className="text-xs text-gray-300 font-mono">{p.sku}</span>}
                  </div>
                  {m !== null && (
                    <span className={`text-xs ${m < 20 ? 'text-amber-500' : m >= 50 ? 'text-green-600' : 'text-gray-400'}`}>
                      Margen {m.toFixed(0)}%
                    </span>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="font-semibold text-sm text-gray-900">{formatCurrency(Number(p.basePrice))}</div>
                  <div className="mt-1"><StockBadge p={p} /></div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="px-4 py-3 w-10">
                <input type="checkbox" checked={allPageSelected} onChange={toggleAll}
                  className="w-4 h-4 rounded border-gray-300 text-brand-600 cursor-pointer focus:ring-brand-500" />
              </th>
              <th className="px-4 py-3 font-medium cursor-pointer select-none hover:text-gray-900" onClick={() => handleSort('name')}>
                Nombre del artículo <SortArrow col="name" />
              </th>
              <th className="px-4 py-3 font-medium">Categoría</th>
              <th className="px-4 py-3 font-medium text-right cursor-pointer select-none hover:text-gray-900" onClick={() => handleSort('basePrice')}>
                Precio <SortArrow col="basePrice" />
              </th>
              <th className="px-4 py-3 font-medium text-right hidden md:table-cell">Coste</th>
              <th className="px-4 py-3 font-medium text-right hidden md:table-cell">Margen</th>
              <th className="px-4 py-3 font-medium text-right cursor-pointer select-none hover:text-gray-900" onClick={() => handleSort('stock')}>
                Stock <SortArrow col="stock" />
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center text-gray-400 py-12"><Loader2 size={20} className="animate-spin inline-block" /></td></tr>
            ) : paginated.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-gray-400 py-12">
                {search || categoryId || stockFilter !== 'all' ? 'Sin resultados.' : 'No hay artículos todavía.'}
              </td></tr>
            ) : paginated.map((p) => {
              const m = margin(p);
              return (
                <tr key={p.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${selected.has(p.id) ? 'bg-brand-50' : ''}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)}
                      className="w-4 h-4 rounded border-gray-300 text-brand-600 cursor-pointer focus:ring-brand-500" />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/products/${p.id}`} className="font-medium text-gray-800 hover:text-brand-600">{p.name}</Link>
                    {p.sku && <p className="text-xs text-gray-400 font-mono mt-0.5">{p.sku}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.category?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatCurrency(Number(p.basePrice))}</td>
                  <td className="px-4 py-3 text-right text-gray-500 hidden md:table-cell">{formatCurrency(Number(p.costPrice ?? 0))}</td>
                  <td className="px-4 py-3 text-right hidden md:table-cell">
                    {m !== null ? <span className={m < 20 ? 'text-amber-600 font-medium' : m >= 50 ? 'text-green-600 font-medium' : 'text-gray-700'}>{m.toFixed(0)}%</span> : '—'}
                  </td>
                  <td className="px-4 py-3 text-right"><StockBadge p={p} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <span>Filas por página:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
              className="border border-gray-200 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {ROWS_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <span>Página {safePage} de {totalPages}</span>
            <div className="flex gap-1">
              <button
                disabled={safePage === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ‹
              </button>
              <button
                disabled={safePage === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ›
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={bulkDelete}
        title="Eliminar artículos"
        message={
          <>
            ¿Estás seguro de que quieres eliminar <strong>{selected.size} artículo{selected.size !== 1 ? 's' : ''}</strong>?
            Esta acción no se puede deshacer.
          </>
        }
        confirmText="Sí, eliminar"
      />
    </div>
  );
}
