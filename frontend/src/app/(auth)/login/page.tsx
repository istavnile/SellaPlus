'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Eye, EyeOff, LayoutDashboard, Store, Delete, ArrowLeft, ShieldCheck } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth.store';

// ─── Schemas ───────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

type LoginForm = z.infer<typeof loginSchema>;

type Screen = 'login' | 'mode-picker' | 'pin-lock' | 'pin-create' | 'pin-confirm';

// ─── PIN Keypad ────────────────────────────────────────────────────────────────

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

function PinDots({ value, total = 4, shake }: { value: string; total?: number; shake: boolean }) {
  return (
    <div
      className={`flex items-center justify-center gap-4 my-6 ${shake ? 'animate-shake' : ''}`}
    >
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
            i < value.length
              ? 'bg-white border-white scale-110'
              : 'bg-transparent border-white/50'
          }`}
        />
      ))}
    </div>
  );
}

function PinKeypad({ onKey }: { onKey: (k: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-px bg-white/10 rounded-2xl overflow-hidden mt-2">
      {KEYS.map((k, idx) => {
        if (!k) return <div key={idx} className="bg-white/5" />;
        return (
          <button
            key={k}
            onClick={() => onKey(k)}
            className={`
              flex items-center justify-center h-16 text-white transition-all
              active:scale-95 select-none
              ${k === 'del'
                ? 'bg-white/5 hover:bg-white/15 text-white/70'
                : 'bg-white/5 hover:bg-white/15 text-2xl font-light'
              }
            `}
          >
            {k === 'del' ? <Delete size={20} /> : k}
          </button>
        );
      })}
    </div>
  );
}

// ─── Logo & Header ──────────────────────────────────────────────────────────────

function AppLogo() {
  return (
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
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();
  const setTokens = useAuthStore((s) => s.setTokens);

  const [loading,   setLoading]   = useState(false);
  const [showPass,  setShowPass]  = useState(false);
  const [screen,    setScreen]    = useState<Screen>('login');

  // PIN state
  const [pin,        setPin]        = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinStage,   setPinStage]   = useState<'enter' | 'confirm'>('enter');
  const [pinLoading, setPinLoading] = useState(false);
  const [hasPin,     setHasPin]     = useState<boolean | null>(null);
  const [shake,      setShake]      = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  // ── After login: check PIN status and decide screen ────────────────────────
  const handlePosDestination = useCallback(async () => {
    try {
      const res = await apiClient.get('/users/me/pin/status');
      const userHasPin: boolean = res.data.hasPin;
      setHasPin(userHasPin);
      setPin('');
      setConfirmPin('');
      setPinStage('enter');
      setScreen(userHasPin ? 'pin-lock' : 'pin-create');
    } catch {
      // If we can't check status, just go through
      router.push('/pos/select');
    }
  }, [router]);

  // ── Handle login form ──────────────────────────────────────────────────────
  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/login', data);
      setTokens(res.data.accessToken, res.data.refreshToken);

      let role = '';
      try {
        const payload = JSON.parse(atob(res.data.accessToken.split('.')[1]));
        role = payload.role ?? '';
      } catch { /* ignore */ }

      if (role === 'CASHIER') { router.push('/pos/select'); return; }

      if (window.innerWidth < 768) {
        setScreen('mode-picker');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  // ── PIN key handler (lock screen — verify) ─────────────────────────────────
  const handlePinLockKey = useCallback(async (k: string) => {
    if (pinLoading) return;
    if (k === 'del') { setPin((p) => p.slice(0, -1)); return; }
    const next = pin + k;
    setPin(next);
    if (next.length === 4) {
      setPinLoading(true);
      try {
        await apiClient.post('/users/me/pin/verify', { pin: next });
        router.push('/pos/select');
      } catch {
        triggerShake();
        setTimeout(() => setPin(''), 400);
      } finally {
        setPinLoading(false);
      }
    }
  }, [pin, pinLoading, router]);

  // ── PIN key handler (create screen — set new PIN) ──────────────────────────
  const handlePinCreateKey = useCallback(async (k: string) => {
    if (pinLoading) return;

    if (pinStage === 'enter') {
      if (k === 'del') { setPin((p) => p.slice(0, -1)); return; }
      const next = pin + k;
      setPin(next);
      if (next.length === 4) {
        setPinStage('confirm');
        setConfirmPin('');
      }
    } else {
      // confirmation stage
      if (k === 'del') { setConfirmPin((p) => p.slice(0, -1)); return; }
      const next = confirmPin + k;
      setConfirmPin(next);
      if (next.length === 4) {
        if (next !== pin) {
          triggerShake();
          toast.error('Los PINs no coinciden, inténtalo de nuevo');
          setTimeout(() => { setConfirmPin(''); setPinStage('enter'); setPin(''); }, 500);
          return;
        }
        // PINs match — save
        setPinLoading(true);
        try {
          await apiClient.post('/users/me/pin', { pin: next });
          toast.success('PIN creado correctamente');
          router.push('/pos/select');
        } catch (err: any) {
          toast.error(err?.response?.data?.message || 'Error al guardar el PIN');
          setPinStage('enter');
          setPin('');
          setConfirmPin('');
        } finally {
          setPinLoading(false);
        }
      }
    }
  }, [pin, confirmPin, pinStage, pinLoading, router]);

  // ── Skip PIN creation (admin/owner can bypass) ─────────────────────────────
  const skipPin = () => router.push('/pos/select');

  // ── Render ─────────────────────────────────────────────────────────────────

  const gradient = {
    background: 'linear-gradient(160deg, #0f1f7a 0%, #2241c8 50%, #3b5bdb 100%)',
  };

  return (
    <div className="min-h-[100dvh] flex flex-col" style={gradient}>
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-8">

        <AppLogo />

        {/* ── Login form ────────────────────────────────────────────── */}
        {screen === 'login' && (
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
              <a href="/register" className="text-brand-600 font-medium hover:underline">Registra tu negocio</a>
            </p>
          </div>
        )}

        {/* ── Mode picker ────────────────────────────────────────────── */}
        {screen === 'mode-picker' && (
          <div className="w-full max-w-sm">
            <p className="text-white/70 text-sm text-center mb-5 font-medium">¿A dónde quieres ir?</p>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full group flex items-center gap-4 bg-white/10 hover:bg-white/20 active:bg-white/25 backdrop-blur-sm border border-white/20 rounded-2xl p-5 text-left transition-all duration-150 shadow-lg"
              >
                <div className="shrink-0 w-14 h-14 rounded-xl bg-white/15 flex items-center justify-center">
                  <LayoutDashboard size={26} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold text-base">Backoffice</p>
                  <p className="text-blue-200 text-xs mt-0.5">Gestión, reportes y configuración</p>
                </div>
                <svg className="ml-auto text-white/50" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <button
                onClick={handlePosDestination}
                className="w-full group flex items-center gap-4 bg-white/10 hover:bg-white/20 active:bg-white/25 backdrop-blur-sm border border-white/20 rounded-2xl p-5 text-left transition-all duration-150 shadow-lg"
              >
                <div className="shrink-0 w-14 h-14 rounded-xl bg-white/15 flex items-center justify-center">
                  <Store size={26} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold text-base">Punto de Venta</p>
                  <p className="text-blue-200 text-xs mt-0.5">Cobrar y registrar ventas</p>
                </div>
                <svg className="ml-auto text-white/50" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* ── PIN lock screen (user has PIN) ─────────────────────────── */}
        {screen === 'pin-lock' && (
          <div className="w-full max-w-xs flex flex-col items-center">
            <button
              onClick={() => { setScreen('mode-picker'); setPin(''); }}
              className="self-start flex items-center gap-1.5 text-white/60 hover:text-white text-sm mb-6 transition-colors"
            >
              <ArrowLeft size={16} /> Volver
            </button>

            <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center mb-3 shadow-lg">
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                <rect x="4" y="8" width="24" height="16" rx="3" fill="white" fillOpacity="0.9"/>
                <rect x="8" y="13" width="16" height="2" rx="1" fill="#2241c8"/>
                <rect x="8" y="17" width="10" height="2" rx="1" fill="#2241c8"/>
                <circle cx="24" cy="24" r="6" fill="#4ade80"/>
                <path d="M21.5 24l2 2 3-3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            <p className="text-white font-semibold text-lg">Introduce tu PIN</p>
            <p className="text-blue-200 text-xs mt-1">Para acceder al Punto de Venta</p>

            <PinDots value={pin} shake={shake} />

            <div className="w-full">
              <PinKeypad onKey={handlePinLockKey} />
            </div>

            {pinLoading && (
              <p className="text-white/50 text-xs mt-4 animate-pulse">Verificando...</p>
            )}
          </div>
        )}

        {/* ── PIN create screen (user has no PIN) ────────────────────── */}
        {screen === 'pin-create' && (
          <div className="w-full max-w-xs flex flex-col items-center">
            <button
              onClick={() => { setScreen('mode-picker'); setPin(''); setConfirmPin(''); setPinStage('enter'); }}
              className="self-start flex items-center gap-1.5 text-white/60 hover:text-white text-sm mb-6 transition-colors"
            >
              <ArrowLeft size={16} /> Volver
            </button>

            <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center mb-3 shadow-lg">
              <ShieldCheck size={28} className="text-white" />
            </div>

            {pinStage === 'enter' ? (
              <>
                <p className="text-white font-semibold text-lg">Crea tu PIN de acceso</p>
                <p className="text-blue-200 text-xs mt-1 text-center px-4">
                  Este PIN protegerá el acceso al Punto de Venta
                </p>
                <PinDots value={pin} shake={shake} />
                <div className="w-full">
                  <PinKeypad onKey={handlePinCreateKey} />
                </div>
              </>
            ) : (
              <>
                <p className="text-white font-semibold text-lg">Confirma tu PIN</p>
                <p className="text-blue-200 text-xs mt-1">Introduce el PIN de nuevo</p>
                <PinDots value={confirmPin} shake={shake} />
                <div className="w-full">
                  <PinKeypad onKey={handlePinCreateKey} />
                </div>
              </>
            )}

            {pinLoading && (
              <p className="text-white/50 text-xs mt-4 animate-pulse">Guardando PIN...</p>
            )}

            <button
              onClick={skipPin}
              className="mt-6 text-white/40 hover:text-white/70 text-xs transition-colors underline underline-offset-2"
            >
              Omitir por ahora
            </button>
          </div>
        )}

      </div>

      <div className="pb-safe h-4" />

      {/* Shake animation */}
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-8px); }
          40%       { transform: translateX(8px); }
          60%       { transform: translateX(-6px); }
          80%       { transform: translateX(6px); }
        }
        .animate-shake { animation: shake 0.45s ease-in-out; }
      `}</style>
    </div>
  );
}
