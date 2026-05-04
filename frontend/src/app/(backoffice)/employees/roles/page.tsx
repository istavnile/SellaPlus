'use client';

import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import toast from 'react-hot-toast';

// ── Types ────────────────────────────────────────────────────────────────────

interface Permission {
  id: string;
  role: string;
  section: string;
  isEnabled: boolean;
}

type PermissionsMap = Record<string, Record<string, boolean>>;

// ── Static definitions ────────────────────────────────────────────────────────

const ROLES = [
  { key: 'OWNER',   label: 'Propietario',   color: 'bg-orange-100', textColor: 'text-orange-700', locked: true  },
  { key: 'ADMIN',   label: 'Administrador', color: 'bg-purple-100', textColor: 'text-purple-700', locked: false },
  { key: 'MANAGER', label: 'Gerente',        color: 'bg-blue-100',   textColor: 'text-blue-700',   locked: false },
  { key: 'CASHIER', label: 'Cajero',         color: 'bg-teal-100',   textColor: 'text-teal-700',   locked: false },
];

const SECTIONS = [
  { key: 'dashboard',  label: 'Dashboard' },
  { key: 'products',   label: 'Productos' },
  { key: 'customers',  label: 'Clientes' },
  { key: 'reports',    label: 'Reportes' },
  { key: 'employees',  label: 'Colaboradores' },
  { key: 'settings',   label: 'Configuración' },
  { key: 'pos',        label: 'Punto de venta (TPV)' },
];

function toMap(perms: Permission[]): PermissionsMap {
  const map: PermissionsMap = {};
  for (const p of perms) {
    if (!map[p.role]) map[p.role] = {};
    map[p.role][p.section] = p.isEnabled;
  }
  return map;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DerechosDeAccesoPage() {
  const [perms,       setPerms]       = useState<PermissionsMap>({});
  const [employees,   setEmployees]   = useState<{ role: string; isActive: boolean }[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('OWNER');
  const [dirty,       setDirty]       = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.get('/tenant/role-permissions'),
      apiClient.get('/employees'),
    ]).then(([pr, er]) => {
      setPerms(toMap(pr.data));
      setEmployees(er.data);
    }).catch(() => {
      toast.error('Error al cargar permisos');
    }).finally(() => setLoading(false));
  }, []);

  const countForRole = (key: string) =>
    employees.filter((e) => e.role === key && e.isActive).length;

  const togglePermission = (section: string) => {
    const role = selectedRole;
    if (ROLES.find((r) => r.key === role)?.locked) return;
    setPerms((prev) => ({
      ...prev,
      [role]: { ...prev[role], [section]: !prev[role]?.[section] },
    }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const role = selectedRole;
      const roleDef = ROLES.find((r) => r.key === role)!;
      if (roleDef.locked) return;

      const updates = SECTIONS.map((s) =>
        apiClient.patch('/tenant/role-permissions', {
          role,
          section: s.key,
          isEnabled: perms[role]?.[s.key] ?? false,
        }),
      );
      await Promise.all(updates);
      setDirty(false);
      toast.success('Permisos guardados');
    } catch {
      toast.error('Error al guardar permisos');
    } finally {
      setSaving(false);
    }
  };

  const selectedRoleDef = ROLES.find((r) => r.key === selectedRole)!;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Derechos de acceso</h1>
        <p className="text-sm text-gray-500 mt-1">
          Selecciona un rol para editar sus permisos. El propietario tiene acceso total y no puede modificarse.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Cargando permisos...</div>
      ) : (
        <>
          {/* Role selector cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {ROLES.map((role) => {
              const isSelected = selectedRole === role.key;
              return (
                <button
                  key={role.key}
                  onClick={() => { setSelectedRole(role.key); setDirty(false); }}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                    isSelected
                      ? 'border-brand-500 shadow-sm bg-brand-50'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full ${role.color} flex items-center justify-center shrink-0`}>
                    <span className={`text-base font-bold ${role.textColor}`}>{role.label[0]}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{role.label}</p>
                    <p className="text-xs text-gray-400">
                      {countForRole(role.key)} colaborador{countForRole(role.key) !== 1 ? 'es' : ''}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Permissions editor */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">
                  Permisos — {selectedRoleDef.label}
                </h2>
                {selectedRoleDef.locked && (
                  <p className="text-xs text-gray-400 mt-0.5">El propietario siempre tiene acceso completo.</p>
                )}
              </div>
              {!selectedRoleDef.locked && (
                <button
                  onClick={handleSave}
                  disabled={saving || !dirty}
                  className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-40 transition-colors"
                >
                  <Save size={14} />
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              )}
            </div>

            <div className="divide-y divide-gray-100">
              {SECTIONS.map((section) => {
                const enabled = selectedRoleDef.locked
                  ? true
                  : (perms[selectedRole]?.[section.key] ?? false);
                const locked = selectedRoleDef.locked;

                return (
                  <div
                    key={section.key}
                    className={`flex items-center justify-between px-6 py-4 ${
                      !locked ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''
                    }`}
                    onClick={() => !locked && togglePermission(section.key)}
                  >
                    <span className="text-sm font-medium text-gray-700">{section.label}</span>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium ${enabled ? 'text-green-600' : 'text-gray-400'}`}>
                        {enabled ? 'Permitido' : 'Sin acceso'}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); !locked && togglePermission(section.key); }}
                        disabled={locked}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                          enabled ? 'bg-brand-600' : 'bg-gray-200'
                        } ${locked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                            enabled ? 'translate-x-4' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                Los cajeros acceden al TPV exclusivamente mediante PIN de 4 dígitos. Los demás roles usan correo y contraseña.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
