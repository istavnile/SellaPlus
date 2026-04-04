'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function ScannerPosPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 p-4 flex items-center gap-4">
        <Link href="/products" className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors bg-gray-50 hover:bg-gray-100 px-3 py-2 rounded-lg border border-gray-200">
          <ArrowLeft size={16} />
          Volver
        </Link>
        <input
          type="text"
          placeholder="Buscar por codigo de barras o nombre..."
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 text-lg"
          autoFocus
        />
        <a href="/pos/touch" className="text-sm text-brand-600 hover:underline whitespace-nowrap">
          Modo tactil
        </a>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-200">
              <th className="pb-3 font-medium">Producto</th>
              <th className="pb-3 font-medium text-right">Precio Unit.</th>
              <th className="pb-3 font-medium text-right">Cantidad</th>
              <th className="pb-3 font-medium text-right">Descuento</th>
              <th className="pb-3 font-medium text-right">Impuesto</th>
              <th className="pb-3 font-medium text-right">Total Linea</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6} className="text-center text-gray-400 py-12">
                Escanea un producto o buscalo por nombre
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-white border-t border-gray-200 p-4 flex items-center justify-between">
        <div className="flex gap-6 text-sm text-gray-600">
          <span>
            Subtotal: <strong>$0.00</strong>
          </span>
          <span>
            Impuestos: <strong>$0.00</strong>
          </span>
          <span className="text-lg font-bold text-gray-900">Total: $0.00</span>
        </div>
        <button
          className="bg-brand-600 text-white px-8 py-3 rounded-xl font-semibold text-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
          disabled
        >
          Cobrar
        </button>
      </div>
    </div>
  );
}
