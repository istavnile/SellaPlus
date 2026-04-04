'use client';

import { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { X, Search, User } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

export interface SelectedCustomer {
  id: string;
  name: string;
  email?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (customer: SelectedCustomer) => void;
}

export function CustomerPickerModal({ open, onClose, onSelect }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults]       = useState<SelectedCustomer[]>([]);

  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    if (!term.trim()) { setResults([]); return; }
    try {
      const res = await apiClient.get(`/customers?search=${encodeURIComponent(term)}`);
      const raw = res.data;
      setResults(Array.isArray(raw) ? raw : (raw.data ?? []));
    } catch { /* ignore */ }
  };

  const handleClose = () => {
    setSearchTerm('');
    setResults([]);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
      <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-xl overflow-hidden shadow-2xl flex flex-col" style={{ maxHeight: '80vh' }}>

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-700 p-1 -ml-1">
              <X size={18} />
            </button>
            <span className="text-sm font-semibold text-gray-900">Seleccionar cliente</span>
          </div>

          {/* Search input */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100">
            <Search size={15} className="text-gray-400 shrink-0" />
            <input
              autoFocus type="text" placeholder="Nombre, email o teléfono..."
              value={searchTerm} onChange={(e) => handleSearch(e.target.value)}
              className="flex-1 text-sm bg-transparent outline-none text-gray-900 placeholder:text-gray-400"
            />
            {searchTerm && (
              <button onClick={() => handleSearch('')} className="text-gray-300 hover:text-gray-500">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto">
            {!searchTerm ? (
              <p className="text-sm text-gray-400 text-center py-10">Escribe para buscar...</p>
            ) : results.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">Sin resultados para "{searchTerm}"</p>
            ) : (
              results.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { onSelect(c); handleClose(); }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 transition-colors border-b border-gray-50 last:border-0"
                >
                  <div className="w-9 h-9 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
                    <User size={15} className="text-brand-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {c.email ?? <span className="italic text-gray-300">Sin email</span>}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
