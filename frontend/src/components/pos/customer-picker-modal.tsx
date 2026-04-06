'use client';

import { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { X, Search, User, UserPlus, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import toast from 'react-hot-toast';

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
    setIsCreating(false);
    setNewName('');
    setNewEmail('');
    onClose();
  };

  const [isCreating, setIsCreating]   = useState(false);
  const [newName, setNewName]         = useState('');
  const [newEmail, setNewEmail]       = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await apiClient.post('/customers', {
        name: newName.trim(),
        email: newEmail.trim() || undefined,
        isActive: true,
      });
      toast.success('Cliente creado correctamente');
      onSelect(res.data);
      handleClose();
    } catch {
      toast.error('Error al crear el cliente');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
      <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Usamos 90dvh para asegurar que el teclado no achique la pantalla asimétricamente */}
        <div className="w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-xl overflow-hidden shadow-2xl flex flex-col h-[90dvh] sm:h-[80vh] sm:max-h-[600px]">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-3">
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-700 p-1 -ml-1">
                <X size={18} />
              </button>
              <span className="text-sm font-semibold text-gray-900">
                {isCreating ? 'Nuevo Cliente' : 'Seleccionar cliente'}
              </span>
            </div>
            {!isCreating && (
              <button 
                onClick={() => {
                  setNewName(searchTerm);
                  setIsCreating(true);
                }}
                className="text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <UserPlus size={14} /> Nuevo
              </button>
            )}
          </div>

          {/* Body */}
          {isCreating ? (
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nombre completo *</label>
                <input 
                  autoFocus
                  type="text" 
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Ej. Juan Pérez"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Correo electrónico <span className="text-gray-400 font-normal">(Opcional)</span></label>
                <input 
                  type="email" 
                  value={newEmail} 
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Ej. juan@correo.com"
                />
              </div>
              
              <div className="mt-auto pt-4 flex gap-2">
                <button 
                  onClick={() => setIsCreating(false)} 
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100"
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleCreate} 
                  disabled={isSubmitting || !newName.trim()}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Guardar Cliente'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Search input */}
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 shrink-0">
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
                  <div className="text-center py-10 px-4">
                    <p className="text-sm text-gray-400 mb-3">Sin resultados para "{searchTerm}"</p>
                    <button 
                      onClick={() => {
                        setNewName(searchTerm);
                        setIsCreating(true);
                      }}
                      className="text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2 transition-colors"
                    >
                      <UserPlus size={16} /> Crear como nuevo cliente
                    </button>
                  </div>
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
            </>
          )}
        </div>
      </div>
    </Dialog>
  );
}
