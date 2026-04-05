'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Trash2, RotateCcw, X } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import toast from 'react-hot-toast';
import { ConfirmModal } from '@/components/backoffice/confirm-modal';
import { useTenantStore } from '@/stores/tenant.store';

const CURRENCIES = [
  { value: 'PEN', label: 'Sol peruano (S/)' },
  { value: 'USD', label: 'Dólar (US$)' },
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'MXN', label: 'Peso mexicano (MX$)' },
  { value: 'COP', label: 'Peso colombiano (COP)' },
];

const TIMEZONES = [
  { value: 'America/Lima',         label: 'Lima (UTC-5)' },
  { value: 'America/Bogota',       label: 'Bogotá (UTC-5)' },
  { value: 'America/Mexico_City',  label: 'Ciudad de México (UTC-6)' },
  { value: 'America/Santiago',     label: 'Santiago (UTC-4)' },
  { value: 'America/Buenos_Aires', label: 'Buenos Aires (UTC-3)' },
  { value: 'UTC',                  label: 'UTC' },
];

const LOCALES = [
  { value: 'es-PE', label: 'Español (Perú)' },
  { value: 'es-MX', label: 'Español (México)' },
  { value: 'es-CO', label: 'Español (Colombia)' },
  { value: 'es',    label: 'Español' },
  { value: 'en-US', label: 'English (US)' },
];

interface TenantSettings {
  name: string;
  currency: string;
  timezone: string;
  locale: string;
}

function decodeJwt(token: string): Record<string, any> | null {
  try { return JSON.parse(atob(token.split('.')[1])); } catch { return null; }
}

// ─── Reset Sales Modal ────────────────────────────────────────────────────────

function ResetSalesModal({ open, onClose, onConfirmed }: {
  open: boolean;
  onClose: () => void;
  onConfirmed: () => void;
}) {
  const [typed, setTyped]         = useState('');
  const [resetting, setResetting] = useState(false);
  const KEYWORD = 'REINICIAR';
  const ready   = typed.trim() === KEYWORD;

  useEffect(() => { if (!open) setTyped(''); }, [open]);

  const handleConfirm = async () => {
    if (!ready) return;
    setResetting(true);
    try {
      const res = await apiClient.delete('/transactions/reset');
      toast.success(`${res.data.deleted} venta(s) eliminadas. El contador se ha reiniciado.`);
      onConfirmed();
      onClose();
    } catch {
      toast.error('Error al reiniciar las ventas');
    } finally {
      setResetting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <RotateCcw size={18} className="text-amber-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Reiniciar ventas</h2>
              <p className="text-xs text-gray-500 mt-0.5">Esta acción es irreversible</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Warning */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1">
          <p className="text-sm font-semibold text-amber-800">¿Qué se eliminará?</p>
          <ul className="text-sm text-amber-700 list-disc list-inside space-y-0.5">
            <li>Todas las ventas completadas y canceladas</li>
            <li>Todos los pagos registrados</li>
            <li>Todos los recibos enviados</li>
            <li>El contador de ventas volverá a TXN-000001</li>
          </ul>
          <p className="text-sm text-amber-700 mt-2">
            <strong>Los productos, clientes e inventario no se verán afectados.</strong>
          </p>
        </div>

        {/* Confirmation input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Escribe{' '}
            <span className="font-mono font-bold text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded">{KEYWORD}</span>
            {' '}para confirmar
          </label>
          <input
            autoFocus
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && ready) handleConfirm(); }}
            placeholder={KEYWORD}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={handleConfirm}
            disabled={!ready || resetting}
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {resetting ? 'Reiniciando...' : 'Sí, reiniciar todas las ventas'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors border border-gray-200"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AccountPage() {
  const router      = useRouter();
  const resetTenant = useTenantStore((s) => s.reset);

  const [settings, setSettings]     = useState<TenantSettings>({
    name: '', currency: 'PEN', timezone: 'America/Lima', locale: 'es-PE',
  });
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving,      setSaving]      = useState(false);
  const [deleteOpen,  setDeleteOpen]  = useState(false);
  const [resetOpen,   setResetOpen]   = useState(false);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (token) {
      const payload = decodeJwt(token);
      if (payload?.email) setEmail(payload.email);
    }
    apiClient.get('/tenant/settings')
      .then((r) => setSettings({
        name:     r.data.name     ?? '',
        currency: r.data.currency ?? 'PEN',
        timezone: r.data.timezone ?? 'America/Lima',
        locale:   r.data.locale   ?? 'es-PE',
      }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await apiClient.patch('/tenant/settings', settings);
      resetTenant();
      toast.success('Configuración guardada');
    } catch { toast.error('Error al guardar'); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (!password || !newPassword) { toast.error('Completa ambos campos de contraseña'); return; }
    setSaving(true);
    try {
      await apiClient.patch('/auth/change-password', { currentPassword: password, newPassword });
      toast.success('Contraseña actualizada');
      setPassword(''); setNewPassword('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al cambiar contraseña');
    } finally { setSaving(false); }
  };

  const handleDeleteAccount = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    router.push('/login');
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Cargando...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Cuenta</h1>

      {/* Business info */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-5">Información del negocio</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la empresa</label>
            <input
              type="text"
              value={settings.name}
              onChange={(e) => setSettings((s) => ({ ...s, name: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
            <input type="email" value={email} disabled
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 text-gray-400 cursor-not-allowed" />
            <p className="mt-1 text-xs text-gray-400">El correo no se puede cambiar desde aquí.</p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Divisa</label>
              <select value={settings.currency} onChange={(e) => setSettings((s) => ({ ...s, currency: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
                {CURRENCIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zona horaria</label>
              <select value={settings.timezone} onChange={(e) => setSettings((s) => ({ ...s, timezone: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
                {TIMEZONES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Idioma</label>
              <select value={settings.locale} onChange={(e) => setSettings((s) => ({ ...s, locale: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
                {LOCALES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button onClick={handleSaveSettings} disabled={saving}
            className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors">
            <Save size={15} />
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </section>

      {/* Change password */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-5">Cambiar contraseña</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña actual</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button onClick={handleChangePassword} disabled={saving}
            className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors">
            <Save size={15} />
            Actualizar contraseña
          </button>
        </div>
      </section>

      {/* Danger zone */}
      <section className="bg-white rounded-xl border border-red-200 p-6">
        <h2 className="text-base font-semibold text-red-700 mb-4">Zona de peligro</h2>

        {/* Reset sales */}
        <div className="flex items-center justify-between py-4 border-b border-gray-100">
          <div>
            <p className="text-sm font-medium text-gray-900">Reiniciar ventas</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Elimina todas las ventas de prueba. Los productos y clientes no se verán afectados.
            </p>
          </div>
          <button
            onClick={() => setResetOpen(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-amber-600 border border-amber-200 px-4 py-2 rounded-lg hover:bg-amber-50 transition-colors whitespace-nowrap ml-4 shrink-0"
          >
            <RotateCcw size={14} />
            Reiniciar ventas
          </button>
        </div>

        {/* Delete account */}
        <div className="flex items-center justify-between pt-4">
          <div>
            <p className="text-sm font-medium text-gray-900">Eliminar cuenta</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Eliminar la cuenta es irreversible. Se perderán todos los datos del negocio.
            </p>
          </div>
          <button
            onClick={() => setDeleteOpen(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors whitespace-nowrap ml-4 shrink-0"
          >
            <Trash2 size={14} />
            Eliminar cuenta
          </button>
        </div>
      </section>

      {/* Reset sales modal */}
      <ResetSalesModal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirmed={() => {}}
      />

      {/* Delete account modal */}
      <ConfirmModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDeleteAccount}
        title="¿Eliminar cuenta?"
        message="Esta acción es irreversible. Todos los datos de tu negocio serán eliminados permanentemente."
        confirmText="Sí, eliminar"
      />
    </div>
  );
}
