'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
  Eye, EyeOff, LayoutDashboard, Store,
  Delete, ArrowLeft, ShieldCheck,
  Monitor, AlertCircle, Loader2, ChevronDown,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth.store';

// ─── Schemas ───────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});
type LoginForm = z.infer<typeof loginSchema>;

// ─── Types ─────────────────────────────────────────────────────────────────────

type Screen = 'login' | 'mode-picker' | 'tpv-list' | 'pin-lock' | 'pin-create' | 'pin-confirm';

interface PosDevice {
  id: string;
  name: string;
  isActive: boolean;
  currentCashier?: { id: string; name: string } | null;
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: '¿Qué es SellaPlus?',
    a: 'SellaPlus es un sistema de punto de venta (POS) en la nube diseñado para negocios de cualquier tamaño. Gestiona ventas, colaboradores, inventario y clientes desde cualquier dispositivo.',
  },
  {
    q: '¿Para qué sirve?',
    a: 'Registra ventas al instante, genera recibos, controla tu inventario, gestiona clientes y obtén reportes detallados de tu negocio en tiempo real.',
  },
  {
    q: '¿Necesito instalar algo?',
    a: 'No. SellaPlus funciona completamente desde el navegador. También puedes instalarlo como app en tu dispositivo usando "Añadir a pantalla de inicio".',
  },
  {
    q: '¿Es seguro?',
    a: 'Sí. Usamos autenticación JWT, conexión cifrada HTTPS y acceso por PIN en el punto de venta para proteger los datos de tu negocio.',
  },
  {
    q: '¿Cómo empiezo?',
    a: 'Registra tu negocio, crea tus productos y colaboradores, configura un TPV y empieza a vender en minutos. Sin contratos ni instalaciones.',
  },
];

function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="w-full space-y-2">
      {FAQ_ITEMS.map((item, i) => (
        <div
          key={i}
          className="rounded-2xl overflow-hidden border border-white/10"
          style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)' }}
        >
          <button
            type="button"
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between px-4 py-3.5 text-left gap-3 hover:bg-white/5 transition-colors"
          >
            <span className="text-white/85 text-sm font-medium">{item.q}</span>
            <ChevronDown
              size={15}
              className={`text-white/40 shrink-0 transition-transform duration-200 ${open === i ? 'rotate-180' : ''}`}
            />
          </button>
          <div className={`overflow-hidden transition-all duration-200 ${open === i ? 'max-h-40' : 'max-h-0'}`}>
            <p className="px-4 pb-4 text-white/50 text-sm leading-relaxed">{item.a}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── PIN Dots ─────────────────────────────────────────────────────────────────

function PinDots({ value, shake }: { value: string; shake: boolean }) {
  return (
    <div className={`flex items-center justify-center gap-4 my-6 ${shake ? 'pin-shake' : ''}`}>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
            i < value.length ? 'bg-white border-white scale-110' : 'bg-transparent border-white/40'
          }`}
        />
      ))}
    </div>
  );
}

// ─── PIN Keypad ────────────────────────────────────────────────────────────────

const ROWS = [['1','2','3'],['4','5','6'],['7','8','9'],['','0','del']];

function PinKeypad({ onKey, disabled }: { onKey: (k: string) => void; disabled?: boolean }) {
  return (
    <div className="w-full mt-2 rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
      {ROWS.map((row, ri) => (
        <div key={ri} className="grid grid-cols-3" style={{ borderTop: ri > 0 ? '1px solid rgba(255,255,255,0.08)' : undefined }}>
          {row.map((k, ci) => {
            if (!k) {
              return <div key={ci} style={{ borderRight: '1px solid rgba(255,255,255,0.08)' }} />;
            }
            return (
              <button
                key={k}
                type="button"
                disabled={disabled}
                onPointerDown={(e) => {
                  e.preventDefault();
                  if (!disabled) onKey(k);
                }}
                className="h-16 flex items-center justify-center text-white select-none transition-colors active:bg-white/20 outline-none"
                style={{
                  borderRight: ci < 2 ? '1px solid rgba(255,255,255,0.08)' : undefined,
                  fontSize: k === 'del' ? undefined : '1.5rem',
                  fontWeight: 300,
                }}
              >
                {k === 'del' ? <Delete size={20} className="opacity-70" /> : k}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Back Button ──────────────────────────────────────────────────────────────

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="self-start flex items-center gap-1.5 text-white/60 hover:text-white text-sm mb-6 transition-colors"
    >
      <ArrowLeft size={16} /> Volver
    </button>
  );
}

// ─── Logo ─────────────────────────────────────────────────────────────────────

function AppLogo({ center = true }: { center?: boolean }) {
  return (
    <div className={`mb-6 ${center ? 'text-center' : ''}`}>
      <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3 shadow-lg ${center ? '' : ''}`}
        style={{ background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}
      >
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <rect x="4" y="8" width="24" height="16" rx="3" fill="white" fillOpacity="0.9"/>
          <rect x="8" y="13" width="16" height="2" rx="1" fill="#2241c8"/>
          <rect x="8" y="17" width="10" height="2" rx="1" fill="#2241c8"/>
          <circle cx="24" cy="24" r="6" fill="#4ade80"/>
          <path d="M21.5 24l2 2 3-3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-white tracking-tight">SellaPlus</h1>
      <p className="text-blue-200/70 text-sm mt-0.5">Tu punto de venta inteligente</p>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router    = useRouter();
  const setTokens = useAuthStore((s) => s.setTokens);

  const [loading,    setLoading]    = useState(false);
  const [showPass,   setShowPass]   = useState(false);
  const [screen,     setScreen]     = useState<Screen>('login');
  const [userRole,   setUserRole]   = useState('');

  const [devices,     setDevices]     = useState<PosDevice[]>([]);
  const [devLoading,  setDevLoading]  = useState(false);
  const [selectedDev, setSelectedDev] = useState<PosDevice | null>(null);

  const [pin,        setPin]        = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinStage,   setPinStage]   = useState<'enter' | 'confirm'>('enter');
  const [pinLoading, setPinLoading] = useState(false);
  const [shake,      setShake]      = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const resetPinState = () => {
    setPin('');
    setConfirmPin('');
    setPinStage('enter');
    setSelectedDev(null);
  };

  const loadDevices = useCallback(async () => {
    setDevLoading(true);
    try {
      const res = await apiClient.get('/pos-devices');
      setDevices(res.data);
    } catch {
      toast.error('Error cargando los TPV');
    } finally {
      setDevLoading(false);
    }
  }, []);

  const handleGoToPOS = useCallback(async () => {
    const session = typeof window !== 'undefined' ? localStorage.getItem('pos_session') : null;
    if (session) { router.push('/pos/touch'); return; }
    await loadDevices();
    resetPinState();
    setScreen('tpv-list');
  }, [loadDevices, router]);

  const handleSelectDevice = useCallback(async (device: PosDevice) => {
    setSelectedDev(device);
    setPin('');
    setConfirmPin('');
    setPinStage('enter');
    try {
      const res = await apiClient.get('/users/me/pin/status');
      setScreen(res.data.hasPin ? 'pin-lock' : 'pin-create');
    } catch {
      setScreen('pin-create');
    }
  }, []);

  const claimDevice = useCallback(async (pin: string) => {
    if (!selectedDev) return;
    setPinLoading(true);
    try {
      const res = await apiClient.post(`/pos-devices/${selectedDev.id}/claim`, { pin });
      localStorage.setItem('pos_session', JSON.stringify({
        deviceId:     res.data.deviceId,
        sessionToken: res.data.sessionToken,
        deviceName:   res.data.deviceName,
        cashierName:  res.data.cashierName,
      }));
      router.push('/pos/touch');
    } catch (err: any) {
      triggerShake();
      toast.error(err?.response?.data?.message || 'PIN incorrecto');
      setTimeout(() => setPin(''), 400);
    } finally {
      setPinLoading(false);
    }
  }, [selectedDev, router]);

  const handlePinLockKey = useCallback((k: string) => {
    if (pinLoading) return;
    if (k === 'del') { setPin((p) => p.slice(0, -1)); return; }
    const next = pin + k;
    setPin(next);
    if (next.length === 4) claimDevice(next);
  }, [pin, pinLoading, claimDevice]);

  const handlePinCreateKey = useCallback(async (k: string) => {
    if (pinLoading) return;
    if (pinStage === 'enter') {
      if (k === 'del') { setPin((p) => p.slice(0, -1)); return; }
      const next = pin + k;
      setPin(next);
      if (next.length === 4) { setPinStage('confirm'); setConfirmPin(''); }
    } else {
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
        setPinLoading(true);
        try {
          await apiClient.post('/users/me/pin', { pin: next });
          await claimDevice(next);
        } catch (err: any) {
          toast.error(err?.response?.data?.message || 'Error al guardar el PIN');
          setPinStage('enter'); setPin(''); setConfirmPin('');
        } finally {
          setPinLoading(false);
        }
      }
    }
  }, [pin, confirmPin, pinStage, pinLoading, claimDevice]);

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

      setUserRole(role);

      if (role === 'CASHIER') {
        await handleGoToPOS();
        return;
      }

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

  const availableDevices = devices.filter((d) => d.isActive && !d.currentCashier);
  const inUseDevices     = devices.filter((d) => d.isActive && d.currentCashier);
  const canCreateTpv     = userRole === 'OWNER' || userRole === 'ADMIN';

  return (
    <div
      className="min-h-[100dvh] flex flex-col relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #080f3a 0%, #0f1f7a 40%, #1a35c4 75%, #2563eb 100%)' }}
    >
      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-25"
          style={{ background: 'radial-gradient(circle, #60a5fa, transparent 70%)' }} />
        <div className="absolute top-1/2 -right-40 w-[400px] h-[400px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #818cf8, transparent 70%)' }} />
        <div className="absolute -bottom-32 left-1/4 w-[450px] h-[450px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #3b82f6, transparent 70%)' }} />
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center px-5 py-10">

        {/* ── LOGIN ─────────────────────────────────────────────────────────── */}
        {screen === 'login' && (
          <div className="w-full max-w-4xl flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-14">

            {/* Glass login card — first on mobile (order-1), second on desktop (md:order-2) */}
            <div className="w-full max-w-sm md:max-w-none md:w-[380px] shrink-0 order-1 md:order-2">

              {/* Logo — only visible on mobile, centered above the card */}
              <div className="md:hidden text-center mb-6">
                <AppLogo center />
              </div>

              <div
                className="relative rounded-3xl overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.4)]"
                style={{
                  background: 'rgba(255,255,255,0.09)',
                  backdropFilter: 'blur(28px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(28px) saturate(180%)',
                  border: '1px solid rgba(255,255,255,0.18)',
                }}
              >
                {/* Specular top highlight */}
                <div
                  className="absolute inset-x-0 top-0 h-px"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }}
                />
                {/* Inner glow */}
                <div
                  className="absolute inset-0 pointer-events-none rounded-3xl"
                  style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 50%)' }}
                />

                <div className="relative p-7 md:p-8">
                  <h2 className="text-xl font-semibold text-white mb-1">Bienvenido</h2>
                  <p className="text-white/45 text-sm mb-7">Inicia sesión en tu cuenta</p>

                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-white/65 mb-1.5">Email</label>
                      <input
                        {...register('email')}
                        type="email" autoComplete="email" inputMode="email"
                        placeholder="tu@negocio.com"
                        className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none transition-colors"
                        style={{
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.14)',
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'}
                        onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'}
                      />
                      {errors.email && <p className="text-red-300 text-xs mt-1.5">{errors.email.message}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/65 mb-1.5">Contraseña</label>
                      <div className="relative">
                        <input
                          {...register('password')}
                          type={showPass ? 'text' : 'password'} autoComplete="current-password"
                          placeholder="••••••••"
                          className="w-full rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-white/25 focus:outline-none transition-colors"
                          style={{
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.14)',
                          }}
                          onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'}
                          onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'}
                        />
                        <button type="button" onClick={() => setShowPass((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/70 p-1 transition-colors">
                          {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      </div>
                      {errors.password && <p className="text-red-300 text-xs mt-1.5">{errors.password.message}</p>}
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full font-semibold py-3 rounded-xl transition-all disabled:opacity-50 mt-1 text-sm shadow-lg active:scale-[0.98]"
                      style={{ background: 'rgba(255,255,255,0.95)', color: '#1e3a8a' }}
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 size={15} className="animate-spin" /> Iniciando sesión...
                        </span>
                      ) : 'Iniciar Sesión'}
                    </button>
                  </form>

                  <p className="text-center text-sm text-white/35 mt-6">
                    ¿No tienes cuenta?{' '}
                    <a href="/register" className="text-white/75 font-medium hover:text-white transition-colors">
                      Registra tu negocio
                    </a>
                  </p>
                </div>
              </div>
            </div>

            {/* Left — branding + FAQ — second on mobile (order-2), first on desktop (md:order-1) */}
            <div className="flex-1 w-full max-w-sm md:max-w-none flex flex-col md:items-start items-center order-2 md:order-1 md:pt-2">
              {/* Logo — only visible on desktop */}
              <div className="hidden md:block">
                <AppLogo center={false} />
              </div>

              <p className="text-white/50 text-[11px] font-semibold uppercase tracking-widest mb-3 md:mt-2 md:text-left text-center">
                Preguntas frecuentes
              </p>
              <div className="w-full">
                <FaqAccordion />
              </div>
            </div>

          </div>
        )}

        {/* ── MODE PICKER ──────────────────────────────────────────── */}
        {screen === 'mode-picker' && (
          <div className="w-full max-w-sm">
            <div className="mb-8 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3 shadow-lg"
                style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.2)' }}>
                <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                  <rect x="4" y="8" width="24" height="16" rx="3" fill="white" fillOpacity="0.9"/>
                  <rect x="8" y="13" width="16" height="2" rx="1" fill="#2241c8"/>
                  <rect x="8" y="17" width="10" height="2" rx="1" fill="#2241c8"/>
                  <circle cx="24" cy="24" r="6" fill="#4ade80"/>
                  <path d="M21.5 24l2 2 3-3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">SellaPlus</h1>
            </div>
            <p className="text-white/70 text-sm text-center mb-5 font-medium">¿A dónde quieres ir?</p>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full flex items-center gap-4 bg-white/10 hover:bg-white/20 active:bg-white/25 backdrop-blur-sm border border-white/20 rounded-2xl p-5 text-left transition-all duration-150 shadow-lg"
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
                onClick={handleGoToPOS}
                className="w-full flex items-center gap-4 bg-white/10 hover:bg-white/20 active:bg-white/25 backdrop-blur-sm border border-white/20 rounded-2xl p-5 text-left transition-all duration-150 shadow-lg"
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

        {/* ── TPV LIST ─────────────────────────────────────────────── */}
        {screen === 'tpv-list' && (
          <div className="w-full max-w-sm flex flex-col">
            <BackBtn onClick={() => setScreen(userRole === 'CASHIER' ? 'login' : 'mode-picker')} />
            <p className="text-white/70 text-sm text-center mb-5 font-medium">Selecciona tu TPV</p>

            {devLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 size={28} className="text-white/50 animate-spin" />
              </div>
            ) : (
              <>
                {devices.filter(d => d.isActive).length === 0 && (
                  <div className="bg-white/10 border border-white/15 rounded-2xl p-6 text-center">
                    <Monitor size={36} className="text-white/30 mx-auto mb-3" />
                    <p className="text-white font-medium text-sm">No hay TPV disponibles</p>
                    {canCreateTpv ? (
                      <p className="text-blue-200 text-xs mt-2 leading-relaxed">
                        Ve al Backoffice para crear un TPV en <strong>Configuración → Dispositivos</strong>.
                      </p>
                    ) : (
                      <p className="text-blue-200 text-xs mt-2 leading-relaxed">
                        Pide al Administrador de la tienda que cree un TPV.
                      </p>
                    )}
                  </div>
                )}

                {devices.filter(d => d.isActive).length > 0 && availableDevices.length === 0 && (
                  <div className="bg-amber-500/20 border border-amber-400/30 rounded-2xl p-4 mb-4 flex items-start gap-3">
                    <AlertCircle size={18} className="text-amber-300 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white text-sm font-medium">Todos los TPV están en uso</p>
                      {canCreateTpv ? (
                        <p className="text-blue-200 text-xs mt-1 leading-relaxed">
                          Puedes crear un nuevo TPV desde <strong>Configuración → Dispositivos</strong> en el Backoffice.
                        </p>
                      ) : (
                        <p className="text-blue-200 text-xs mt-1 leading-relaxed">
                          Pide al Administrador de la tienda que cree un TPV adicional.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {availableDevices.length > 0 && (
                  <div className="space-y-2 mb-4">
                    <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-2">Disponibles</p>
                    {availableDevices.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => handleSelectDevice(d)}
                        className="w-full flex items-center gap-4 bg-white/10 hover:bg-white/20 active:bg-white/25 border border-white/15 rounded-2xl px-4 py-4 text-left transition-all active:scale-[0.98]"
                      >
                        <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                          <Monitor size={22} className="text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-semibold">{d.name}</p>
                          <p className="text-green-300 text-xs font-medium mt-0.5">● Disponible</p>
                        </div>
                        <svg className="text-white/40" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    ))}
                  </div>
                )}

                {inUseDevices.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-2">En uso</p>
                    {inUseDevices.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-4 py-4 opacity-60 cursor-not-allowed"
                      >
                        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                          <Monitor size={22} className="text-white/50" />
                        </div>
                        <div className="flex-1">
                          <p className="text-white/70 font-semibold">{d.name}</p>
                          <p className="text-amber-300 text-xs font-medium mt-0.5">● En uso — {d.currentCashier?.name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── PIN LOCK ─────────────────────────────────────────────── */}
        {screen === 'pin-lock' && (
          <div className="w-full max-w-xs flex flex-col items-center">
            <BackBtn onClick={() => { setScreen('tpv-list'); setPin(''); }} />
            <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center mb-3 shadow-lg">
              <Monitor size={26} className="text-white" />
            </div>
            <p className="text-white font-semibold text-lg">Introduce tu PIN</p>
            <p className="text-blue-200 text-xs mt-1 text-center px-4">
              Para acceder a <strong className="text-white">{selectedDev?.name}</strong>
            </p>
            <PinDots value={pin} shake={shake} />
            <PinKeypad onKey={handlePinLockKey} disabled={pinLoading} />
            {pinLoading && <p className="text-white/50 text-xs mt-4 animate-pulse">Verificando...</p>}
          </div>
        )}

        {/* ── PIN CREATE ───────────────────────────────────────────── */}
        {screen === 'pin-create' && (
          <div className="w-full max-w-xs flex flex-col items-center">
            <BackBtn onClick={() => { setScreen('tpv-list'); setPin(''); setConfirmPin(''); setPinStage('enter'); }} />
            <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center mb-3 shadow-lg">
              <ShieldCheck size={28} className="text-white" />
            </div>

            {pinStage === 'enter' ? (
              <>
                <p className="text-white font-semibold text-lg">Crea tu PIN de acceso</p>
                <p className="text-blue-200 text-xs mt-1 text-center px-6 leading-relaxed">
                  Este PIN te identificará en el Punto de Venta
                </p>
                <PinDots value={pin} shake={shake} />
                <PinKeypad onKey={handlePinCreateKey} disabled={pinLoading} />
              </>
            ) : (
              <>
                <p className="text-white font-semibold text-lg">Confirma tu PIN</p>
                <p className="text-blue-200 text-xs mt-1">Introduce el mismo PIN de nuevo</p>
                <PinDots value={confirmPin} shake={shake} />
                <PinKeypad onKey={handlePinCreateKey} disabled={pinLoading} />
              </>
            )}

            {pinLoading && <p className="text-white/50 text-xs mt-4 animate-pulse">Guardando...</p>}

            <button
              type="button"
              onClick={() => {
                toast('Necesitas un PIN para acceder al TPV. Configúralo en Cuenta → Perfil.', {
                  icon: '🔒', duration: 4000,
                });
                setScreen('tpv-list');
              }}
              className="mt-6 text-white/40 hover:text-white/70 text-xs transition-colors underline underline-offset-2"
            >
              Omitir por ahora
            </button>
          </div>
        )}

      </div>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <footer className="relative text-center py-5 px-4">
        <p className="text-white/25 text-xs leading-relaxed">
          © 2026 Desarrollado por{' '}
          <span className="text-white/45 font-medium">Istav Nile</span>
          {' '}·{' '}
          <span className="text-white/35">12 Development</span>
        </p>
      </footer>

      <style jsx>{`
        @keyframes pinShake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-8px); }
          40%       { transform: translateX(8px); }
          60%       { transform: translateX(-5px); }
          80%       { transform: translateX(5px); }
        }
        .pin-shake { animation: pinShake 0.44s ease-in-out; }
      `}</style>
    </div>
  );
}
