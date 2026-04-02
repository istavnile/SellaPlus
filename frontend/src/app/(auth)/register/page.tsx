'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth.store';

const registerSchema = z.object({
  businessName: z.string().min(2, 'Nombre requerido'),
  slug: z
    .string()
    .min(3)
    .regex(/^[a-z0-9-]+$/, 'Solo letras minusculas, numeros y guiones'),
  ownerName: z.string().min(2, 'Nombre requerido'),
  email: z.string().email('Email invalido'),
  password: z.string().min(8, 'Minimo 8 caracteres'),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const setTokens = useAuthStore((s) => s.setTokens);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/register', data);
      setTokens(res.data.accessToken, res.data.refreshToken);
      toast.success('Negocio registrado exitosamente!');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 to-brand-600 py-12">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-700">SellaPlus</h1>
          <p className="text-gray-500 mt-1">Registra tu negocio</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del negocio
            </label>
            <input
              {...register('businessName')}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Mi Tienda"
            />
            {errors.businessName && (
              <p className="text-red-500 text-xs mt-1">{errors.businessName.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slug (URL unica)
            </label>
            <input
              {...register('slug')}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="mi-tienda"
            />
            {errors.slug && (
              <p className="text-red-500 text-xs mt-1">{errors.slug.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tu nombre</label>
            <input
              {...register('ownerName')}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Juan Perez"
            />
            {errors.ownerName && (
              <p className="text-red-500 text-xs mt-1">{errors.ownerName.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              {...register('email')}
              type="email"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="tu@negocio.com"
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contrasena</label>
            <input
              {...register('password')}
              type="password"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50 mt-2"
          >
            {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Ya tienes cuenta?{' '}
          <a href="/login" className="text-brand-600 font-medium hover:underline">
            Iniciar sesion
          </a>
        </p>
      </div>
    </div>
  );
}
