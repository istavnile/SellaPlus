'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { Mail, Phone, Users, User, Lock, Eye, EyeOff } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils/cn';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  name:     z.string().min(1, 'El nombre es requerido'),
  email:    z.string().email('Email inválido'),
  phone:    z.string().optional(),
  role:     z.enum(['ADMIN', 'MANAGER', 'CASHIER'], { required_error: 'Selecciona un rol' }),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

type EmployeeForm = z.infer<typeof schema>;

// ─── Modal PIN ────────────────────────────────────────────────────────────────

function PinModal({ employeeId, onDone }: { employeeId: string; onDone: () => void }) {
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-8 text-center">
        <div className="flex justify-center mb-5">
          <div className="w-20 h-20 rounded-full bg-blue-400 flex items-center justify-center">
            <Lock size={36} className="text-white" strokeWidth={1.5} />
          </div>
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-1 tracking-wide">ESTABLECER PIN</h2>

        <div className="flex justify-center gap-3 my-6">
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
                'w-12 text-center text-xl font-bold border-b-2 pb-1 bg-transparent focus:outline-none transition-colors',
                error ? 'border-red-400' : 'border-gray-300 focus:border-blue-400',
              )}
            />
          ))}
        </div>

        {error && (
          <p className="text-red-500 text-sm -mt-3 mb-4">El PIN debe tener 4 dígitos</p>
        )}

        <p className="text-sm text-gray-500 mb-8 leading-relaxed">
          El PIN se usará para identificar al empleado en el TPV (Punto de Venta).
        </p>

        <div className="flex justify-end gap-6">
          <button
            onClick={onDone}
            className="text-sm font-bold text-gray-600 hover:text-gray-800 tracking-wide"
          >
            OMITIR
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="text-sm font-bold text-green-600 hover:text-green-700 tracking-wide disabled:opacity-50"
          >
            CONFIRMAR
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

export default function NewEmployeePage() {
  const router = useRouter();
  const [loading, setLoading]         = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pinEmployee, setPinEmployee]  = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<EmployeeForm>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: EmployeeForm) => {
    setLoading(true);
    try {
      const res = await apiClient.post('/employees', data);
      setPinEmployee(res.data.id);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al crear el empleado');
      setLoading(false);
    }
  };

  return (
    <>
      <div className="max-w-lg">
        {/* Breadcrumb */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/employees" className="text-gray-400 hover:text-gray-600 transition-colors">
            ← Empleados
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-2xl font-bold text-gray-900">Nuevo Empleado</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-8 py-10 space-y-2">
            {/* Avatar */}
            <div className="flex justify-center mb-6">
              <div className="w-24 h-24 rounded-full bg-teal-400 flex items-center justify-center">
                <User size={48} strokeWidth={1.5} className="text-white" />
              </div>
            </div>

            {/* Nombre */}
            <div className="pb-3">
              <input
                {...register('name')}
                placeholder="Nombre"
                className="w-full border-0 border-b border-gray-200 py-2 text-2xl text-gray-800 placeholder-gray-300 focus:outline-none focus:border-brand-500 bg-transparent font-light"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>

            {/* Email */}
            <div className="flex items-center gap-4 py-1">
              <Mail size={18} className="text-gray-400 shrink-0" />
              <div className="flex-1">
                <input
                  {...register('email')}
                  type="email"
                  placeholder="Correo electrónico"
                  className="w-full border-0 border-b border-gray-200 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-brand-500 bg-transparent"
                />
                {errors.email && <p className="text-red-500 text-xs mt-0.5">{errors.email.message}</p>}
              </div>
            </div>

            {/* Teléfono */}
            <div className="flex items-center gap-4 py-1">
              <Phone size={18} className="text-gray-400 shrink-0" />
              <input
                {...register('phone')}
                type="tel"
                placeholder="Número de teléfono"
                className="flex-1 border-0 border-b border-gray-200 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-brand-500 bg-transparent"
              />
            </div>

            {/* Contraseña */}
            <div className="flex items-center gap-4 py-1">
              <Lock size={18} className="text-gray-400 shrink-0" />
              <div className="flex-1 relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Contraseña de acceso"
                  className="w-full border-0 border-b border-gray-200 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-brand-500 bg-transparent pr-8"
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-0 top-2 text-gray-300 hover:text-gray-500">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-0.5">{errors.password.message}</p>}
            </div>

            {/* Rol */}
            <div className="flex items-start gap-4 py-1">
              <Users size={18} className="text-gray-400 shrink-0 mt-5" />
              <div className="flex-1">
                <label className="block text-xs text-gray-400 mb-1">Rol</label>
                <select
                  {...register('role')}
                  className="w-full border-0 border-b border-gray-200 py-2 text-sm text-gray-800 focus:outline-none focus:border-brand-500 bg-transparent appearance-none cursor-pointer"
                  defaultValue=""
                >
                  <option value="" disabled>Seleccione funciones</option>
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                {errors.role && <p className="text-red-500 text-xs mt-0.5">{errors.role.message}</p>}
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center justify-end gap-3 mt-6">
            <Link href="/employees" className="font-bold text-gray-600 hover:text-gray-800 px-5 py-2.5 tracking-wide text-sm">
              CANCELAR
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="bg-green-500 hover:bg-green-600 text-white font-bold px-6 py-2.5 rounded text-sm tracking-wide transition-colors disabled:opacity-50"
            >
              {loading ? 'GUARDANDO...' : 'GUARDAR'}
            </button>
          </div>
        </form>
      </div>

      {/* Modal PIN */}
      {pinEmployee && (
        <PinModal
          employeeId={pinEmployee}
          onDone={() => {
            setPinEmployee(null);
            router.push('/employees');
          }}
        />
      )}
    </>
  );
}
