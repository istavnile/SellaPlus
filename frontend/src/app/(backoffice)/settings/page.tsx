'use client';

import { useState, useEffect } from 'react';
import {
  Settings, Store, Clock, AlarmClock, Ticket, Printer,
  Monitor, ShoppingBag, Bell, AlertTriangle, Barcode,
  CreditCard, Receipt, Heart, Percent,
  DollarSign, ChevronDown, Trash2
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils/cn';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

type Section =
  | 'funciones' | 'facturacion' | 'metodos-pago' | 'lealtad'
  | 'impuestos' | 'recibo' | 'tiendas' | 'dispositivos';

// ─── Toggle component ─────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none shrink-0',
        checked ? 'bg-brand-600' : 'bg-gray-300',
      )}
    >
      <span className={cn(
        'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200',
        checked ? 'translate-x-5' : 'translate-x-0',
      )} />
    </button>
  );
}

// ─── Panel: Funciones ─────────────────────────────────────────────────────────

const FEATURES = [
  { key: 'shifts_enabled',       icon: Clock,         label: 'Cierres de caja por turnos',        desc: 'Controla el dinero que entra y sale del cajón de efectivo.' },
  { key: 'clock_enabled',        icon: AlarmClock,    label: 'Función de reloj',                  desc: 'Controla los tiempos de entrada y salida de tus empleados y calcula el total de horas trabajadas.' },
  { key: 'open_tickets_enabled', icon: Ticket,        label: 'Tickets abiertos',                  desc: 'Permite guardar y editar pedidos antes de completar un pago.' },
  { key: 'kitchen_printer',      icon: Printer,       label: 'Impresoras de cocina',              desc: 'Envía comandas a la cocina a través de una impresora o una pantalla.' },
  { key: 'customer_display',     icon: Monitor,       label: 'Pantalla para clientes',            desc: 'Muestre a sus clientes información y precios en el momento de la venta.' },
  { key: 'order_types',          icon: ShoppingBag,   label: 'Tipo de pedido',                    desc: 'Toma pedidos para cenar dentro, para llevar o a domicilio.' },
  { key: 'low_stock_notify',     icon: Bell,          label: 'Notificaciones de stock bajo',      desc: 'Recibe un email diario sobre los artículos bajos o fuera de stock.' },
  { key: 'negative_stock_alert', icon: AlertTriangle, label: 'Alertas de stock negativo',         desc: 'Avisa al cajero cuando intenta vender más productos que el disponible en stock.' },
  { key: 'variable_weight_barcode', icon: Barcode,   label: 'Código de barras de peso variable', desc: 'Permitir el escaneo de códigos de barras de peso variable.' },
];

function FuncionesPanel() {
  const [flags, setFlags]   = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient.get('/tenant/settings').then((r) => {
      const map: Record<string, boolean> = {};
      (r.data.featureFlags ?? []).forEach((f: any) => { map[f.featureKey] = f.isEnabled; });
      setFlags(map);
    }).catch(() => {});
  }, []);

  const toggle = (key: string) => setFlags((prev) => ({ ...prev, [key]: !prev[key] }));

  const save = async () => {
    setSaving(true);
    try {
      await Promise.all(
        Object.entries(flags).map(([key, val]) =>
          apiClient.patch(`/tenant/features/${key}`, { isEnabled: val }),
        ),
      );
      toast.success('Configuración guardada');
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Funciones</h2>
      <div className="flex-1 space-y-0 divide-y divide-gray-100">
        {FEATURES.map(({ key, icon: Icon, label, desc }) => (
          <div key={key} className="flex items-start gap-4 py-4">
            <Icon size={20} className="text-gray-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800">{label}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                {desc}{' '}
                <span className="text-green-600 cursor-pointer hover:underline">Más información</span>
              </p>
            </div>
            <Toggle checked={!!flags[key]} onChange={() => toggle(key)} />
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-6 pt-6 border-t border-gray-100 mt-6">
        <button className="text-sm font-medium text-gray-500 hover:text-gray-700">Cancelar</button>
        <button onClick={save} disabled={saving}
          className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
          Guardar cambios
        </button>
      </div>
    </div>
  );
}

// ─── Panel: Facturación y suscripciones ──────────────────────────────────────

const SUBSCRIPTIONS = [
  { icon: '📊', title: 'Historial de ventas ilimitado',      desc: 'Vea los informes de ventas desde cualquier período de tiempo y exporte los datos en hojas de cálculo.' },
  { icon: '👥', title: 'Gestión del personal',               desc: 'Personalice derechos de acceso a la app, registre tarjetas de asistencia y ventas por empleado.' },
  { icon: '📦', title: 'Gestión de inventario avanzado',     desc: 'Crear órdenes de compra, consultar valoraciones de inventario y gestionar stock.' },
];

function FacturacionPanel() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Suscripciones</h3>
        <div className="divide-y divide-gray-100">
          {SUBSCRIPTIONS.map((s) => (
            <div key={s.title} className="flex items-start gap-4 py-4">
              <span className="text-2xl shrink-0">{s.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{s.title}</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{s.desc}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-gray-400 mb-2">14 días de prueba gratis</p>
                <button className="bg-brand-50 text-brand-600 hover:bg-brand-100 px-4 py-2 rounded-lg text-xs font-bold transition-colors">
                  Pruébalo gratis
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Método de pago</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-gray-500">
            <CreditCard size={18} />
            <span className="text-sm">Ninguna tarjeta registrada</span>
          </div>
          <button className="bg-brand-50 text-brand-600 hover:bg-brand-100 px-4 py-2 rounded-lg text-xs font-bold transition-colors">
            Añadir método de pago
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Datos de facturación</h3>
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Añade la información que aparecerá en tus facturas</p>
          <button className="bg-brand-50 text-brand-600 hover:bg-brand-100 px-4 py-2 rounded-lg text-xs font-bold transition-colors">
            Añadir datos de facturación
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Panel: Métodos de pago ───────────────────────────────────────────────────

interface PaymentMethod { id: string; name: string; type: string; isEnabled: boolean; sortOrder: number; }

const TYPE_OPTIONS = [
  { value: 'CASH',     label: 'Efectivo' },
  { value: 'CARD',     label: 'Tarjeta' },
  { value: 'TRANSFER', label: 'Transferencia / Billetera digital' },
  { value: 'OTHER',    label: 'Otro' },
];

function MetodosPagoPanel() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [view, setView]       = useState<'list' | 'edit'>('list');
  const [current, setCurrent] = useState<Partial<PaymentMethod> | null>(null);
  const [saving, setSaving]   = useState(false);

  const load = () => {
    apiClient.get('/tenant/payment-methods').then((r) => setMethods(r.data)).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const handleAdd = () => {
    setCurrent({ name: '', type: 'CASH' });
    setView('edit');
  };

  const handleEdit = (m: PaymentMethod) => {
    setCurrent({ ...m });
    setView('edit');
  };

  const handleToggle = async (m: PaymentMethod) => {
    const updated = { ...m, isEnabled: !m.isEnabled };
    setMethods((prev) => prev.map((x) => x.id === m.id ? updated : x));
    try {
      await apiClient.patch(`/tenant/payment-methods/${m.id}`, { isEnabled: !m.isEnabled });
    } catch {
      setMethods((prev) => prev.map((x) => x.id === m.id ? m : x)); // revert
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este método de pago?')) return;
    try {
      await apiClient.delete(`/tenant/payment-methods/${id}`);
      setMethods((prev) => prev.filter((m) => m.id !== id));
    } catch { toast.error('Error al eliminar'); }
  };

  const handleSave = async () => {
    if (!current?.name?.trim()) return;
    setSaving(true);
    try {
      if (current.id) {
        await apiClient.patch(`/tenant/payment-methods/${current.id}`, { name: current.name, type: current.type });
      } else {
        await apiClient.post('/tenant/payment-methods', { name: current.name, type: current.type });
      }
      load();
      setView('list');
    } catch { toast.error('Error al guardar'); }
    setSaving(false);
  };

  if (view === 'edit') {
    return (
      <div className="flex flex-col h-full -m-6 bg-[#f4f6f8]">
        <div className="bg-brand-600 text-white px-6 py-4 flex items-center shadow-sm">
          <h1 className="text-xl font-normal">{current?.id ? 'Editar método de pago' : 'Añadir método de pago'}</h1>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-10 overflow-y-auto">
          <div className="bg-white rounded-lg border border-gray-100 shadow-xl w-full max-w-xl overflow-hidden">
            <div className="flex flex-col items-center p-12">
              <div className="w-24 h-24 bg-brand-50 rounded-full flex items-center justify-center mb-12 shadow-sm border border-brand-100">
                <div className="relative">
                  <CreditCard size={48} className="text-brand-600" />
                  <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 border border-brand-100">
                    <DollarSign size={16} className="text-brand-600" />
                  </div>
                </div>
              </div>

              <div className="w-full space-y-12">
                <div className="relative">
                  <select
                    value={current?.type || 'CASH'}
                    onChange={(e) => setCurrent({ ...current, type: e.target.value })}
                    className="w-full border-b border-gray-200 py-3 text-sm text-gray-700 focus:outline-none focus:border-brand-500 appearance-none bg-transparent"
                  >
                    <option value="CASH">Efectivo</option>
                    <option value="CARD">Tarjeta</option>
                    <option value="TRANSFER">Transferencia / Billetera digital</option>
                    <option value="OTHER">Otro</option>
                  </select>
                  <label className="absolute -top-5 left-0 text-xs text-gray-400">Tipo de pago</label>
                  <div className="absolute right-0 top-3 pointer-events-none">
                    <ChevronDown className="text-gray-400" size={16} />
                  </div>
                </div>

                <div className="relative">
                  <input
                    autoFocus
                    type="text"
                    value={current?.name || ''}
                    onChange={(e) => setCurrent({ ...current, name: e.target.value })}
                    className="w-full border-b border-gray-200 py-3 text-sm text-gray-700 placeholder-transparent focus:outline-none focus:border-brand-500 bg-transparent"
                    placeholder="Nombre"
                    id="payment-name-input"
                  />
                  <label htmlFor="payment-name-input" className="absolute -top-5 left-0 text-xs text-gray-400 font-medium">Nombre que verá el cajero</label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 w-full max-w-xl mt-8">
            <button
              onClick={() => setView('list')}
              className="bg-white hover:bg-gray-50 text-gray-700 font-bold px-8 py-3 rounded-lg border border-gray-200 text-sm transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-8 py-3 rounded-lg shadow-lg text-sm transition-all disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full transition-all duration-300">
      <div className="mb-8">
        <button
          onClick={handleAdd}
          className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-6 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2 shadow-sm"
        >
          <span>+</span> Añadir método de pago
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-[48px_1fr_80px] items-center border-b border-gray-100 bg-gray-50/50 px-4 py-3 text-sm font-medium text-gray-500">
          <div />
          <div className="pl-2">Nombre</div>
          <div />
        </div>

        <div className="divide-y divide-gray-100">
          {methods.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-10">Cargando...</p>
          )}
          {methods.map((m) => (
            <div
              key={m.id}
              className="grid grid-cols-[48px_1fr_80px] items-center px-4 py-4 hover:bg-gray-50 transition-colors group"
            >
              {/* Enable/disable checkbox */}
              <div className="flex justify-center">
                <input
                  type="checkbox"
                  checked={m.isEnabled}
                  onChange={() => handleToggle(m)}
                  className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                />
              </div>
              {/* Name — click to edit */}
              <button
                onClick={() => handleEdit(m)}
                className="pl-2 text-sm font-medium text-gray-700 text-left hover:text-brand-600 transition-colors"
              >
                {m.name}
              </button>
              {/* Actions */}
              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity pr-1">
                <button onClick={() => handleEdit(m)} className="text-xs text-gray-400 hover:text-brand-600 px-1">Editar</button>
                <button onClick={() => handleDelete(m.id)} className="text-xs text-gray-400 hover:text-red-500 px-1">✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Panel: Impuestos ─────────────────────────────────────────────────────────

function ImpuestosPanel() {
  const [taxes, setTaxes]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/tenant/settings').then((r) => {
      // placeholder — taxes endpoint TBD
      setTaxes([]);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Impuestos</h2>
        <button className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors">
          + Nuevo Impuesto
        </button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="grid grid-cols-3 gap-4 px-4 py-3 border-b border-gray-100 text-sm font-medium text-gray-500">
          <span>Nombre</span><span>Tasa</span><span>Predeterminado</span>
        </div>
        {loading ? (
          <p className="text-center text-gray-400 py-8 text-sm">Cargando...</p>
        ) : taxes.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">No hay impuestos configurados.</p>
        ) : taxes.map((t: any) => (
          <div key={t.id} className="grid grid-cols-3 gap-4 px-4 py-3 border-b border-gray-50 last:border-0 text-sm text-gray-800">
            <span>{t.name}</span>
            <span>{(Number(t.rate) * 100).toFixed(0)}%</span>
            <span>{t.isDefault ? '✓' : '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Panel: Recibo ────────────────────────────────────────────────────────────

function ReciboPanel() {
  const [header,   setHeader]   = useState('');
  const [footer,   setFooter]   = useState('');
  const [saving,   setSaving]   = useState(false);
  const [emailLogo, setEmailLogo] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get('/tenant/settings').then((r) => {
      setHeader(r.data.receiptHeader || '');
      setFooter(r.data.receiptFooter || '');
      setEmailLogo(r.data.logoUrl || null);
    }).catch(() => {});
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setEmailLogo(reader.result as string);
    reader.readAsDataURL(file);
  };

  const save = async () => {
    setSaving(true);
    try {
      await apiClient.patch('/tenant/settings', {
        logoUrl: emailLogo,
        receiptHeader: header,
        receiptFooter: footer,
      });
      toast.success('Configuración de recibo guardada');
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Configuración de los recibos</h2>

      {/* Logotipo */}
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-700 mb-1">Logotipo del negocio</p>
        <p className="text-xs text-gray-400 mb-3">Se mostrará en los recibos enviados por email.</p>
        <div className="flex items-center gap-4">
          <label className="w-36 h-24 bg-gray-50 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-gray-200 cursor-pointer hover:border-brand-400 transition-colors overflow-hidden group relative">
            <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            {emailLogo ? (
              <>
                <img src={emailLogo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block', margin: 'auto' }} />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-semibold rounded-xl">
                  Cambiar
                </div>
              </>
            ) : (
              <>
                <svg className="w-8 h-8 text-gray-300 mb-1" fill="currentColor" viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                <span className="text-xs text-gray-400">Subir logo</span>
              </>
            )}
          </label>
          {emailLogo && (
            <button onClick={() => setEmailLogo(null)} className="text-xs text-red-400 hover:text-red-600">
              Quitar logo
            </button>
          )}
        </div>
      </div>

      {/* Cabecera */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Cabecera</label>
        <div className="relative">
          <textarea
            value={header}
            onChange={(e) => setHeader(e.target.value.slice(0, 500))}
            rows={3}
            className="w-full border-b border-gray-200 bg-transparent text-sm text-gray-800 focus:outline-none focus:border-brand-600 resize-none"
          />
          <span className="absolute bottom-1 right-0 text-xs text-gray-400">{header.length} / 500</span>
        </div>
      </div>

      {/* Pie de página */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Pie de página</label>
        <div className="relative">
          <textarea
            value={footer}
            onChange={(e) => setFooter(e.target.value.slice(0, 500))}
            rows={3}
            className="w-full border-b border-gray-200 bg-transparent text-sm text-gray-800 focus:outline-none focus:border-green-500 resize-none"
          />
          <span className="absolute bottom-1 right-0 text-xs text-gray-400">{footer.length} / 500</span>
        </div>
      </div>

      <div className="flex justify-end gap-6 pt-6 border-t border-gray-100 mt-6">
        <button className="text-sm font-medium text-gray-500 hover:text-gray-700">Cancelar</button>
        <button onClick={save} disabled={saving}
          className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 rounded-xl shadow-lg shadow-brand-100 text-sm font-bold disabled:opacity-50 transition-all">
          Guardar cambios
        </button>
      </div>
    </div>
  );
}

// ─── Panel: Tiendas ───────────────────────────────────────────────────────────

function TiendasPanel() {
  const [store, setStore] = useState<any>(null);

  useEffect(() => {
    apiClient.get('/tenant/settings').then((r) => setStore(r.data)).catch(() => {});
  }, []);

  return (
    <div>
      <button className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-4 py-2 rounded-lg text-sm mb-6 transition-colors">
        + Nueva Tienda
      </button>
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="grid grid-cols-3 gap-4 px-4 py-3 border-b border-gray-100 text-sm font-medium text-gray-500">
          <span>Nombre</span><span>Dirección</span><span className="text-right">Número de TPV</span>
        </div>
        {store && (
          <div className="grid grid-cols-3 gap-4 px-4 py-4 text-sm text-gray-800">
            <span className="font-medium">{store.name}</span>
            <span className="text-gray-500">—</span>
            <span className="text-right">1</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Panel: Dispositivos TPV ──────────────────────────────────────────────────

interface PosDevice {
  id: string; name: string; isActive: boolean;
  currentCashier?: { id: string; name: string; email: string } | null;
}

function DispositivosPanel() {
  const [devices,   setDevices]   = useState<PosDevice[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [editing,   setEditing]   = useState<PosDevice | null>(null);
  const [newName,   setNewName]   = useState('');
  const [addOpen,   setAddOpen]   = useState(false);
  const [addName,   setAddName]   = useState('');
  const [saving,    setSaving]    = useState(false);

  const load = () => {
    setLoading(true);
    apiClient.get('/pos-devices').then((r) => setDevices(r.data)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!addName.trim()) return;
    setSaving(true);
    try {
      await apiClient.post('/pos-devices', { name: addName.trim() });
      setAddName(''); setAddOpen(false);
      load();
    } catch { toast.error('Error al crear TPV'); } finally { setSaving(false); }
  };

  const handleSaveEdit = async () => {
    if (!editing || !newName.trim()) return;
    setSaving(true);
    try {
      await apiClient.patch(`/pos-devices/${editing.id}`, { name: newName.trim(), isActive: editing.isActive });
      setEditing(null);
      load();
    } catch { toast.error('Error al guardar'); } finally { setSaving(false); }
  };

  const handleToggle = async (d: PosDevice) => {
    try {
      await apiClient.patch(`/pos-devices/${d.id}`, { isActive: !d.isActive });
      load();
    } catch { toast.error('Error al actualizar'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este TPV?')) return;
    try {
      await apiClient.delete(`/pos-devices/${id}`);
      load();
    } catch { toast.error('Error al eliminar'); }
  };

  if (editing) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-lg">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center">
            <Monitor size={36} className="text-indigo-500" />
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Nombre</label>
          <input value={newName} onChange={(e) => setNewName(e.target.value)}
            className="w-full border-b-2 border-gray-100 py-2 text-xl focus:outline-none focus:border-brand-500 bg-transparent" />
        </div>
        <div className="flex items-center justify-between py-4 border-t border-gray-100 mt-4">
          <div className="flex items-center gap-3">
            <Monitor size={16} className="text-gray-400" />
            <span className="text-sm text-gray-600">Estado</span>
            <Toggle checked={editing.isActive} onChange={(v) => setEditing({ ...editing, isActive: v })} />
            <span className="text-sm font-medium">{editing.isActive ? 'Activado' : 'Desactivado'}</span>
          </div>
        </div>
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
          <button onClick={() => handleDelete(editing.id)} className="text-red-500 hover:text-red-600">
            <Trash2 size={18} />
          </button>
          <div className="flex gap-4">
            <button onClick={() => setEditing(null)} className="text-sm font-bold text-gray-500 hover:text-gray-700 px-4 py-2">CANCELAR</button>
            <button onClick={handleSaveEdit} disabled={saving}
              className="text-sm font-bold text-brand-600 hover:text-brand-700 px-4 py-2 disabled:opacity-50">
              {saving ? 'GUARDANDO...' : 'GUARDAR'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => setAddOpen(true)}
        className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-4 py-2 rounded-lg text-sm mb-6 transition-colors">
        + Nuevo TPV
      </button>

      {addOpen && (
        <div className="mb-4 bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
          <input autoFocus value={addName} onChange={(e) => setAddName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Nombre del TPV (ej. TPV 2)" maxLength={50}
            className="flex-1 text-sm border-b border-gray-200 pb-1 focus:outline-none focus:border-brand-500" />
          <button onClick={() => { setAddOpen(false); setAddName(''); }} className="text-gray-400 hover:text-gray-600 text-xs font-bold">Cancelar</button>
          <button onClick={handleAdd} disabled={saving || !addName.trim()}
            className="bg-brand-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-brand-700 disabled:opacity-50">
            {saving ? '...' : 'Añadir'}
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-100 text-sm font-medium text-gray-500">
          <span className="flex-1">Nombre</span>
          <span className="w-36">Cajero en uso</span>
          <span className="w-24 text-right">Estado</span>
        </div>
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-gray-400">Cargando...</div>
        ) : devices.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-400">Sin dispositivos. Crea tu primer TPV.</div>
        ) : devices.map((d) => (
          <button key={d.id}
            onClick={() => { setEditing(d); setNewName(d.name); }}
            className="w-full flex items-center gap-4 px-4 py-4 text-sm text-gray-800 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
            <div className="flex-1 text-left">
              <span className="font-medium">{d.name}</span>
            </div>
            <div className="w-36 text-left text-xs text-gray-500">
              {d.currentCashier ? (
                <span className="text-green-600 font-medium">{d.currentCashier.name}</span>
              ) : '—'}
            </div>
            <div className="w-24 text-right">
              <span className={`text-xs font-bold ${d.isActive ? 'text-brand-600' : 'text-gray-400'}`}>
                {d.isActive ? 'Activado' : 'Desactivado'}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Panel: Lealtad ───────────────────────────────────────────────────────────

function LealtadPanel() {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Lealtad</h2>
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <Heart size={36} className="text-gray-200 mx-auto mb-3" />
        <p className="text-sm text-gray-500">El programa de lealtad estará disponible próximamente.</p>
        <button className="mt-4 bg-brand-50 text-brand-600 hover:bg-brand-100 px-6 py-2 rounded-lg text-sm font-bold transition-colors">
          Pruébalo gratis
        </button>
      </div>
    </div>
  );
}

// ─── Navegación izquierda ─────────────────────────────────────────────────────

const NAV = [
  {
    group: 'Configuración',
    subtitle: 'Configuración del sistema',
    icon: Settings,
    items: [
      { id: 'funciones',    label: 'Funciones' },
      { id: 'facturacion',  label: 'Facturación y suscripciones' },
      { id: 'metodos-pago', label: 'Métodos de pago' },
      { id: 'lealtad',      label: 'Lealtad' },
      { id: 'impuestos',    label: 'Impuestos' },
      { id: 'recibo',       label: 'Recibo' },
    ],
  },
  {
    group: 'Tiendas',
    subtitle: 'Configuración de la tienda y el TPV',
    icon: Store,
    items: [
      { id: 'tiendas',      label: 'Tiendas' },
      { id: 'dispositivos', label: 'Dispositivos TPV' },
    ],
  },
] as const;

const PANELS: Record<Section, React.ReactNode> = {
  funciones:    <FuncionesPanel />,
  facturacion:  <FacturacionPanel />,
  'metodos-pago': <MetodosPagoPanel />,
  lealtad:      <LealtadPanel />,
  impuestos:    <ImpuestosPanel />,
  recibo:       <ReciboPanel />,
  tiendas:      <TiendasPanel />,
  dispositivos: <DispositivosPanel />,
};

// ─── Página ───────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [active, setActive] = useState<Section>('funciones');

  return (
    <div className="flex gap-6 h-full -m-6 p-6">
      {/* ── Panel izquierdo ─────────────────────────────────────── */}
      <div className="w-72 shrink-0">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {NAV.map(({ group, subtitle, icon: Icon, items }) => (
            <div key={group}>
              {/* Cabecera de grupo */}
              <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
                <div className="w-9 h-9 rounded-full bg-gray-400 flex items-center justify-center">
                  <Icon size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{group}</p>
                  <p className="text-xs text-gray-400">{subtitle}</p>
                </div>
              </div>
              {/* Items */}
              {items.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setActive(id as Section)}
                  className={cn(
                    'w-full text-left px-6 py-3 text-sm border-b border-gray-50 last:border-0 transition-colors',
                    active === id
                      ? 'bg-gray-100 text-gray-900 font-medium'
                      : 'text-gray-600 hover:bg-gray-50',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Panel derecho ───────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        <div className="bg-white rounded-xl border border-gray-200 p-6 h-full overflow-y-auto">
          {PANELS[active]}
        </div>
      </div>
    </div>
  );
}
