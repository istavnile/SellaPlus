'use client';

export default function TouchPosPage() {
  return (
    <div className="flex h-full">
      {/* Left: Product Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Productos</h2>
          <a href="/pos/scanner" className="text-sm text-brand-600 hover:underline">
            Cambiar a modo escaner
          </a>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center text-gray-400 col-span-3">
            Cargando productos...
          </div>
        </div>
      </div>

      {/* Right: Cart */}
      <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">Ticket actual</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-gray-400 text-center mt-8">Carrito vacio</p>
        </div>
        <div className="p-4 border-t border-gray-100 space-y-3">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span>
            <span>$0.00</span>
          </div>
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>$0.00</span>
          </div>
          <button
            className="w-full bg-brand-600 text-white py-3 rounded-xl font-semibold text-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
            disabled
          >
            Cobrar
          </button>
        </div>
      </div>
    </div>
  );
}
