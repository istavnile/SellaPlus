export default function ReportsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Reportes</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {['Ventas por periodo', 'Ventas por producto', 'Ventas por categoria'].map((r) => (
          <div
            key={r}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:border-brand-300 cursor-pointer transition-colors"
          >
            <p className="font-medium text-gray-800">{r}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
