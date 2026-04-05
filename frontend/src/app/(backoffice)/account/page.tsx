'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Trash2 } from 'lucide-react';
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
  { value: 'America/Lima',       label: 'Lima (UTC-5)' },
  { value: 'America/Bogota',     label: 'Bogotá (UTC-5)' },
  { value: 'America/Mexico_City',label: 'Ciudad de México (UTC-6)' },
  { value: 'America/Santiago',   label: 'Santiago (UTC-4)' },
  { value: 'America/Buenos_Aires',label: 'Buenos Aires (UTC-3)' },
  { value: 'UTC',                label: 'UTC' },
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
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

export default function AccountPage() {
  const router = useRouter();
  const resetTenant = useTenantStore((s) => s.reset);

  const [settings, setSettings] = useState<TenantSettings>({
    name: '', currency: 'PEN', timezone: 'America/Lima', locale: 'es-PE',
  });
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving,      setSaving]      = useState(false);
  const [deleteOpen,  setDeleteOpen]  = useState(false);
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
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!password || !newPassword) {
      toast.error('Completa ambos campos de contraseña');
      return;
    }
    setSaving(true);
    try {
      await apiClient.patch('/auth/change-password', { currentPassword: password, newPassword });
      toast.success('Contraseña actualizada');
      setPassword('');
      setNewPassword('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al cambiar contraseña');
    } finally {
      setSaving(false);
    }
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
            <input
              type="email"
              value={email}
              disabled
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-400">El correo no se puede cambiar desde aquí.</p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Divisa</label>
              <select
                value={settings.currency}
                onChange={(e) => setSettings((s) => ({ ...s, currency: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                {CURRENCIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zona horaria</label>
              <select
                value={settings.timezone}
                onChange={(e) => setSettings((s) => ({ ...s, timezone: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                {TIMEZONES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Idioma</label>
              <select
                value={settings.locale}
                onChange={(e) => setSettings((s) => ({ ...s, locale: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                {LOCALES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
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
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleChangePassword}
            disabled={saving}
            className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            <Save size={15} />
            Actualizar contraseña
          </button>
        </div>
      </section>

      {/* Danger zone */}
      <section className="bg-white rounded-xl border border-red-200 p-6">
        <h2 className="text-base font-semibold text-red-700 mb-2">Zona de peligro</h2>
        <p className="text-sm text-gray-500 mb-4">
          Eliminar la cuenta es irreversible. Se perderán todos los datos del negocio.
        </p>
        <button
          onClick={() => setDeleteOpen(true)}
          className="flex items-center gap-2 text-sm font-medium text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
        >
          <Trash2 size={15} />
          Eliminar cuenta
        </button>
      </section>

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
