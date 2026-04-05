'use client';

import { useRef, useState } from 'react';
import { Upload, Download, Loader2, FileText, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/api/client';

interface Props {
  entity: 'customers' | 'products';
  onImportDone?: () => void;
}

function parseCsvPreview(text: string): { headers: string[]; rows: string[][]; total: number } {
  const lines = text.trim().split('\n').filter(Boolean);
  if (!lines.length) return { headers: [], rows: [], total: 0 };
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const dataLines = lines.slice(1);
  const rows = dataLines.slice(0, 5).map((l) =>
    l.split(',').map((v) => v.trim().replace(/^"|"$/g, '')),
  );
  return { headers, rows, total: dataLines.length };
}

export function ImportExportButtons({ entity, onImportDone }: Props) {
  const fileInputRef                    = useRef<HTMLInputElement>(null);
  const [importing, setImporting]       = useState(false);
  const [exporting, setExporting]       = useState(false);
  const [pendingFile, setPendingFile]   = useState<File | null>(null);
  const [preview, setPreview]           = useState<{ headers: string[]; rows: string[][]; total: number } | null>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setPreview(parseCsvPreview(text));
      setPendingFile(file);
    };
    reader.readAsText(file, 'utf-8');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirm = async () => {
    if (!pendingFile) return;
    setImporting(true);
    const form = new FormData();
    form.append('file', pendingFile);
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
      setPendingFile(null);
      setPreview(null);
    }
  };

  const handleCancel = () => {
    setPendingFile(null);
    setPreview(null);
  };

  const entityLabel = entity === 'customers' ? 'clientes' : 'productos';

  return (
    <>
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
          {importing ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
          {importing ? 'Importando...' : 'Importar CSV'}
        </button>

        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-600 border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          {exporting ? 'Exportando...' : 'Exportar CSV'}
        </button>
      </div>

      {/* Confirmation modal */}
      {preview && pendingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-brand-600" />
                <h2 className="font-semibold text-gray-900">Confirmar importación de {entityLabel}</h2>
              </div>
              <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-4">
              <p className="text-sm text-gray-600 mb-4">
                Se importarán <span className="font-semibold text-gray-900">{preview.total} {entityLabel}</span> desde <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{pendingFile.name}</span>. Las filas existentes (por código) se actualizarán.
              </p>

              {/* Preview table */}
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {preview.headers.map((h, i) => (
                        <th key={i} className="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row, i) => (
                      <tr key={i} className="border-b border-gray-100 last:border-0">
                        {row.map((cell, j) => (
                          <td key={j} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[140px] truncate">{cell || '—'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.total > 5 && (
                <p className="text-xs text-gray-400 mt-2">Mostrando 5 de {preview.total} filas.</p>
              )}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={importing}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {importing && <Loader2 size={14} className="animate-spin" />}
                {importing ? 'Importando...' : `Importar ${preview.total} ${entityLabel}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
