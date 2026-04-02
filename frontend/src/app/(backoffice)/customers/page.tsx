export default function CustomersPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
        <button className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
          + Nuevo Cliente
        </button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
        No hay clientes todavia.
      </div>
    </div>
  );
}
