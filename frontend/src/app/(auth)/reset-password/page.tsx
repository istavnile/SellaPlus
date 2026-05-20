'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/api/client';

function ResetPasswordForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const token        = searchParams.get('token') ?? '';

  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [showPass,  setShowPass]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [done,      setDone]      = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error('La contraseña debe tener al menos 6 caracteres'); return; }
    if (password !== confirm) { toast.error('Las contraseñas no coinciden'); return; }
    if (!token) { toast.error('Enlace inválido'); return; }

    setLoading(true);
    try {
      await apiClient.post('/auth/reset-password', { token, newPassword: password });
      setDone(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Enlace inválido o expirado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center justify-center relative overflow-hidden px-5 py-10"
      style={{ background: 'linear-gradient(160deg, #080f3a 0%, #0f1f7a 40%, #1a35c4 75%, #2563eb 100%)' }}
    >
      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #60a5fa, transparent 70%)' }} />
        <div className="absolute -bottom-32 right-1/4 w-[400px] h-[400px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #818cf8, transparent 70%)' }} />
      </div>

      <div className="relative w-full max-w-sm">
        <button
          type="button"
          onClick={() => router.push('/login')}
          className="flex items-center gap-1.5 text-white/60 hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft size={16} /> Volver al login
        </button>

        <div
          className="rounded-3xl overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.4)]"
          style={{
            background: 'rgba(255,255,255,0.09)',
            backdropFilter: 'blur(28px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.18)',
          }}
        >
          <div className="absolute inset-x-0 top-0 h-px pointer-events-none"
            style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.5),transparent)' }} />

          <div className="p-7">
            {done ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'rgba(74,222,128,0.2)', border: '1px solid rgba(74,222,128,0.4)' }}>
                  <ShieldCheck size={26} className="text-green-300" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">¡Contraseña actualizada!</h2>
                <p className="text-white/50 text-sm mb-6 leading-relaxed">
                  Tu contraseña ha sido restablecida correctamente. Ya puedes iniciar sesión.
                </p>
                <button
                  onClick={() => router.push('/login')}
                  className="w-full font-semibold py-3 rounded-xl text-sm transition-all active:scale-[0.98]"
                  style={{ background: 'rgba(255,255,255,0.95)', color: '#1e3a8a' }}
                >
                  Ir al inicio de sesión
                </button>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                  style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.2)' }}>
                  <ShieldCheck size={22} className="text-white" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-1">Nueva contraseña</h2>
                <p className="text-white/45 text-sm mb-6">Elige una contraseña de al menos 6 caracteres.</p>

                {!token && (
                  <div className="bg-red-500/20 border border-red-400/30 rounded-xl px-4 py-3 text-sm text-red-200 mb-4">
                    Enlace de recuperación inválido. Solicita uno nuevo desde el login.
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/65 mb-1.5">Nueva contraseña</label>
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={password} onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••" required autoComplete="new-password"
                        className="w-full rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-white/25 focus:outline-none"
                        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)' }}
                        onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'}
                        onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'}
                      />
                      <button type="button" onClick={() => setShowPass(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/70 p-1 transition-colors">
                        {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/65 mb-1.5">Confirmar contraseña</label>
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={confirm} onChange={(e) => setConfirm(e.target.value)}
                      placeholder="••••••••" required autoComplete="new-password"
                      className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none"
                      style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)' }}
                      onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'}
                      onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'}
                    />
                  </div>
                  <button
                    type="submit" disabled={loading || !token}
                    className="w-full font-semibold py-3 rounded-xl transition-all disabled:opacity-50 text-sm shadow-lg active:scale-[0.98] mt-1"
                    style={{ background: 'rgba(255,255,255,0.95)', color: '#1e3a8a' }}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 size={15} className="animate-spin" /> Guardando...
                      </span>
                    ) : 'Guardar nueva contraseña'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
