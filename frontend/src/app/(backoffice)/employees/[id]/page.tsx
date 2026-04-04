'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { Mail, Users, User as UserIcon, Lock, Trash2, ArrowLeft } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils/cn';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  name:  z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Email inválido'),
  role:  z.enum(['OWNER', 'ADMIN', 'MANAGER', 'CASHIER'], { required_error: 'Selecciona un rol' }),
});

type EmployeeForm = z.infer<typeof schema>;

// ─── Modal PIN ────────────────────────────────────────────────────────────────

function PinModal({ employeeId, onDone, onCancel }: { employeeId: string; onDone: () => void; onCancel: () => void }) {
  const [digits, setDigits] = useState(['', '', '', '']);
  const [error, setError]   = useState(false);
  const [saving, setSaving] = useState(false);
  const inputs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null),
                  useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  useEffect(() => { inputs[0].current?.focus(); }, []);

  const handleDigit = (idx: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[idx] = val;
    setDigits(next);
    setError(false);
    if (val && idx < 3) inputs[idx + 1].current?.focus();
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputs[idx - 1].current?.focus();
    }
  };

  const handleConfirm = async () => {
    const pin = digits.join('');
    if (pin.length < 4) { setError(true); return; }
    setSaving(true);
    try {
      await apiClient.patch(`/employees/${employeeId}/pin`, { pin });
      toast.success('PIN establecido correctamente');
      onDone();
    } catch {
      toast.error('Error al guardar el PIN');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-8 text-center scale-in duration-200">
        <div className="flex justify-center mb-5">
          <div className="w-20 h-20 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-100">
            <Lock size={36} strokeWidth={1.5} />
          </div>
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-1 tracking-tight">Establecer PIN</h2>

        <div className="flex justify-center gap-3 my-8">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={inputs[i]}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleDigit(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className={cn(
                'w-12 h-14 text-center text-2xl font-bold border rounded-lg bg-gray-50 focus:outline-none transition-all',
                error ? 'border-red-400' : 'border-gray-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50',
              )}
            />
          ))}
        </div>

        {error && (
          <p className="text-red-500 text-sm -mt-5 mb-6 font-medium">El PIN debe tener 4 dígitos</p>
        )}

        <p className="text-sm text-gray-500 mb-8 leading-relaxed px-2">
          El PIN se usará para identificar al empleado en el TPV (Punto de Venta).
        </p>

        <div className="flex justify-end gap-3 pt-6">
          <button
            onClick={onCancel}
            className="text-sm font-medium text-gray-400 hover:text-gray-600 px-4 py-2"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-lg text-sm font-bold disabled:opacity-50 transition-colors"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

const ROLES = [
  { value: 'ADMIN',   label: 'Administrador' },
  { value: 'MANAGER', label: 'Gerente' },
  { value: 'CASHIER', label: 'Cajero' },
];

export default function EditEmployeePage() {
  const router = useRouter();
  const { id } = useParams();
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [employee, setEmployee]      = useState<any>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EmployeeForm>({
    resolver: zodResolver(schema),
  });

  const load = useCallback(async () => {
    try {
      const res = await apiClient.get(`/employees/${id}`);
      setEmployee(res.data);
      reset({
        name: res.data.name,
        email: res.data.email,
        role: res.data.role,
      });
    } catch {
      toast.error('Error al cargar el empleado');
      router.push('/employees');
    } finally {
      setLoading(false);
    }
  }, [id, reset, router]);

  useEffect(() => { load(); }, [load]);

  const onSubmit = async (data: EmployeeForm) => {
    setSaving(true);
    try {
      await apiClient.patch(`/employees/${id}`, data);
      toast.success('Empleado actualizado');
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  const onDeactivatePin = async () => {
    if (!confirm('¿Desea desactivar el PIN de este empleado?')) return;
    try {
      await apiClient.patch(`/employees/${id}`, { clearPin: true });
      toast.success('PIN desactivado');
      load();
    } catch {
      toast.error('Error al desactivar el PIN');
    }
  };

  const onDelete = async () => {
     if (!confirm('¿Desea dar de baja a este empleado?')) return;
     try {
       await apiClient.delete(`/employees/${id}`);
       toast.success('Empleado dado de baja');
       router.push('/employees');
     } catch {
       toast.error('Error al dar de baja');
     }
  };

  if (loading) return <div className="p-10 text-center text-gray-400">Cargando...</div>;

  return (
    <>
      <div className="max-w-2xl">
        {/* Header with back */}
        <div className="flex items-center gap-4 mb-8">
           <Link href="/employees" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft size={20} className="text-gray-500" />
           </Link>
           <div>
             <div className="flex items-center gap-2 text-xs text-gray-400 font-medium uppercase tracking-widest mb-1">
               <Link href="/employees" className="hover:text-brand-600">Empleados</Link>
               <span>/</span>
               <span className="text-gray-900">Editar</span>
             </div>
             <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{employee?.name}</h1>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-8">
                {/* Avatar */}
                <div className="flex justify-center -mt-4 mb-4">
                  <div className="w-24 h-24 rounded-full bg-teal-400 flex items-center justify-center shadow-lg shadow-teal-50">
                    <UserIcon size={48} strokeWidth={1.5} className="text-white" />
                  </div>
                </div>

                {/* Main Inputs */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Nombre Completo</label>
                    <input
                      {...register('name')}
                      placeholder="Ej. Juan Pérez"
                      className="w-full border-b-2 border-gray-100 py-3 text-lg text-gray-800 placeholder-gray-300 focus:outline-none focus:border-brand-500 bg-transparent transition-colors"
                    />
                    {errors.name && <p className="text-red-500 text-xs mt-1 font-medium">{errors.name.message}</p>}
                  </div>

                  <div className="flex items-start gap-4">
                    <Mail size={20} className="text-gray-400 mt-6 shrink-0" />
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Correo Electrónico</label>
                      <input
                        {...register('email')}
                        type="email"
                        autoComplete="off"
                        className="w-full border-b-2 border-gray-100 py-2 text-sm text-gray-800 focus:outline-none focus:border-brand-500 bg-transparent transition-colors"
                      />
                      {errors.email && <p className="text-red-500 text-xs mt-1 font-medium">{errors.email.message}</p>}
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <Users size={20} className="text-gray-400 mt-6 shrink-0" />
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Rol / Permisos</label>
                      {employee?.role === 'OWNER' ? (
                        <div className="flex items-center gap-2 py-2">
                          <span className="text-sm font-semibold text-gray-800">Propietario</span>
                          <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full uppercase tracking-wide">Bloqueado</span>
                        </div>
                      ) : (
                        <select
                          {...register('role')}
                          className="w-full border-b-2 border-gray-100 py-2 text-sm text-gray-800 focus:outline-none focus:border-brand-500 bg-transparent appearance-none cursor-pointer"
                        >
                          {ROLES.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* TPV PIN Section */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                 <div className="flex items-start justify-between">
                   <div className="flex gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                        employee?.hasPin ? "bg-emerald-50 text-emerald-600" : "bg-gray-50 text-gray-400"
                      )}>
                        <Lock size={22} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 tracking-tight">PIN de TPV</h3>
                        <p className="text-sm text-gray-500 mt-1 leading-relaxed max-w-sm">
                          {employee?.hasPin 
                            ? "Este empleado tiene un PIN activo para acceder al Punto de Venta."
                            : "Este empleado no tiene un PIN configurado."}
                        </p>
                      </div>
                   </div>
                   <div className="flex flex-col items-end gap-3 shrink-0">
                     <button
                        type="button"
                        onClick={() => setShowPinModal(true)}
                        className="text-xs font-bold text-brand-600 hover:text-brand-700 tracking-wider px-4 py-2 bg-brand-50 rounded-lg transition-colors"
                      >
                        {employee?.hasPin ? "Cambiar PIN" : "Configurar PIN"}
                      </button>
                      {employee?.hasPin && (
                        <button
                          type="button"
                          onClick={onDeactivatePin}
                          className="text-[10px] font-bold text-rose-500 hover:text-rose-600 tracking-widest flex items-center gap-2"
                        >
                          <Trash2 size={12} /> Desactivar el código PIN
                        </button>
                      )}
                   </div>
                 </div>
              </div>

              {/* Standard Actions */}
              <div className="flex items-center justify-between pt-4">
                {employee?.role !== 'OWNER' ? (
                  <button
                    type="button"
                    onClick={onDelete}
                    className="text-xs font-bold text-rose-500 hover:text-rose-600 px-6 py-3 rounded-lg hover:bg-rose-50 transition-all border border-transparent"
                  >
                    Dar de baja
                  </button>
                ) : <div />}
                <div className="flex items-center gap-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-8 py-3 rounded-lg text-sm transition-all disabled:opacity-50"
                  >
                    {saving ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Sidebar / Info */}
          <div className="space-y-6">
            <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-xl shadow-blue-100">
               <h4 className="font-bold text-sm uppercase tracking-widest opacity-80 mb-4">Estado de Cuenta</h4>
               <div className="flex items-center justify-between mb-2">
                 <span className="text-white/70 text-sm">Estado</span>
                 <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold">
                    {employee?.isActive ? 'ACTIVO' : 'INACTIVO'}
                 </span>
               </div>
               <div className="flex items-center justify-between">
                 <span className="text-white/70 text-sm">Creado el</span>
                 <span className="text-sm font-medium">
                   {new Date(employee?.createdAt).toLocaleDateString()}
                 </span>
               </div>
            </div>
            
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
               <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500 mb-4">Nota de Seguridad</h4>
               <p className="text-xs text-gray-400 leading-relaxed">
                 Asegúrese de que el empleado mantenga su PIN en secreto. El PIN es necesario para todas las operaciones de venta y manejo de efectivo en el TPV.
               </p>
            </div>
          </div>
        </div>
      </div>

      {showPinModal && (
        <PinModal
          employeeId={id as string}
          onDone={() => {
            setShowPinModal(false);
            load();
          }}
          onCancel={() => setShowPinModal(false)}
        />
      )}
    </>
  );
}
