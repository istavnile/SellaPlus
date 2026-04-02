export default function ProductsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
        <a
          href="/products/new"
          className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          + Nuevo Producto
        </a>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
        No hay productos todavia. Crea el primero!
      </div>
    </div>
  );
}
