'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth.store';

const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(1, 'La contrasena es requerida'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const setTokens = useAuthStore((s) => s.setTokens);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/login', data);
      setTokens(res.data.accessToken, res.data.refreshToken);
      try {
        const payload = JSON.parse(atob(res.data.accessToken.split('.')[1]));
        if (payload.role === 'CASHIER') { router.push('/pos/select'); return; }
      } catch { /* fall through */ }
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al iniciar sesion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#1a2fa0]" style={{
      background: 'linear-gradient(160deg, #0f1f7a 0%, #2241c8 50%, #3b5bdb 100%)',
    }}>
      {/* Top decorative area */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-8">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm mb-4 shadow-lg">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="4" y="8" width="24" height="16" rx="3" fill="white" fillOpacity="0.9"/>
              <rect x="8" y="13" width="16" height="2" rx="1" fill="#2241c8"/>
              <rect x="8" y="17" width="10" height="2" rx="1" fill="#2241c8"/>
              <circle cx="24" cy="24" r="6" fill="#4ade80"/>
              <path d="M21.5 24l2 2 3-3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">SellaPlus</h1>
          <p className="text-blue-200 text-sm mt-1">Tu punto de venta inteligente</p>
        </div>

        {/* Card */}
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-7">
          <h2 className="text-xl font-semibold text-gray-800 mb-1">Bienvenido</h2>
          <p className="text-gray-400 text-sm mb-6">Inicia sesión en tu cuenta</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                inputMode="email"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-gray-50/50 transition-colors"
                placeholder="tu@negocio.com"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Contraseña</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-gray-50/50 transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 mt-2 text-sm shadow-sm"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-5">
            ¿No tienes cuenta?{' '}
            <a href="/register" className="text-brand-600 font-medium hover:underline">
              Registra tu negocio
            </a>
          </p>
        </div>
      </div>

      {/* Bottom safe area */}
      <div className="pb-safe h-4" />
    </div>
  );
}
