'use client';

import { useRef, useState } from 'react';
import { Upload, Download, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/api/client';

interface Props {
  entity: 'customers' | 'products';
  onImportDone?: () => void;
}

export function ImportExportButtons({ entity, onImportDone }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await apiClient.get(`/${entity}/export`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8;' }));
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `${entity === 'customers' ? 'clientes' : 'productos'}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV exportado correctamente');
    } catch {
      toast.error('Error al exportar');
    } finally {
      setExporting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const form = new FormData();
    form.append('file', file);

    try {
      const res = await apiClient.post(`/${entity}/import`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { created, updated, errors, total } = res.data;
      toast.success(`Importado: ${created} creados, ${updated} actualizados de ${total}`);
      if (errors?.length) {
        console.warn('Errores de importación:', errors);
        toast(`${errors.length} fila(s) con errores (ver consola)`, { icon: '⚠️' });
      }
      onImportDone?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al importar');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFileChange}
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={importing}
        className="flex items-center gap-1.5 text-sm font-medium text-gray-600 border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        {importing
          ? <Loader2 size={15} className="animate-spin" />
          : <Upload size={15} />
        }
        {importing ? 'Importando...' : 'Importar CSV'}
      </button>

      <button
        onClick={handleExport}
        disabled={exporting}
        className="flex items-center gap-1.5 text-sm font-medium text-gray-600 border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        {exporting
          ? <Loader2 size={15} className="animate-spin" />
          : <Download size={15} />
        }
        {exporting ? 'Exportando...' : 'Exportar CSV'}
      </button>
    </div>
  );
}
