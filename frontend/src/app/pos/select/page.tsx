'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Monitor, Lock, ArrowLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils/cn';

interface PosDevice {
  id: string;
  name: string;
  isActive: boolean;
  currentCashier?: { id: string; name: string } | null;
}

// ── PIN pad ───────────────────────────────────────────────────────────────────

function PinPad({ onSubmit, loading, error }: {
  onSubmit: (pin: string) => void;
  loading: boolean;
  error: string | null;
}) {
  const [digits, setDigits] = useState<string[]>([]);

  const press = (d: string) => {
    if (loading) return;
    setDigits((prev) => {
      const next = [...prev, d].slice(0, 4);
      if (next.length === 4) setTimeout(() => onSubmit(next.join('')), 80);
      return next;
    });
  };

  const del = () => setDigits((prev) => prev.slice(0, -1));

  useEffect(() => { if (error) setDigits([]); }, [error]);

  const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

  return (
    <div className="flex flex-col items-center">
      {/* Dots */}
      <div className="flex gap-4 mb-8">
        {[0,1,2,3].map((i) => (
          <div key={i} className={cn(
            'w-4 h-4 rounded-full border-2 transition-all duration-150',
            digits.length > i ? 'bg-brand-600 border-brand-600 scale-110' : 'border-gray-300',
            error && 'border-red-400 bg-red-100',
          )} />
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm mb-4 bg-red-50 px-4 py-2 rounded-lg">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {KEYS.map((k, i) => {
          if (!k) return <div key={i} />;
          const isDelete = k === '⌫';
          return (
            <button
              key={k + i}
              onClick={() => isDelete ? del() : press(k)}
              disabled={loading}
              className={cn(
                'h-16 rounded-2xl text-xl font-semibold transition-all active:scale-95 select-none',
                isDelete
                  ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  : 'bg-white border border-gray-200 text-gray-900 hover:bg-gray-50 shadow-sm',
                loading && 'opacity-50 cursor-not-allowed',
              )}
            >
              {loading && digits.length === 4 && !isDelete ? (
                <span className="inline-block w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
              ) : k}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Step = 'list' | 'pin';

export default function SelectTpvPage() {
  const router = useRouter();
  const [devices,  setDevices]  = useState<PosDevice[]>([]);
  const [selected, setSelected] = useState<PosDevice | null>(null);
  const [step,     setStep]     = useState<Step>('list');
  const [loading,  setLoading]  = useState(true);
  const [pinError, setPinError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    // If we already have an active session, go straight to POS
    const session = typeof window !== 'undefined' ? localStorage.getItem('pos_session') : null;
    if (session) {
      router.replace('/pos/touch');
      return;
    }
    apiClient.get('/pos-devices')
      .then((r) => setDevices(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const handleSelectDevice = (d: PosDevice) => {
    setSelected(d);
    setPinError(null);
    setStep('pin');
  };

  const handlePin = async (pin: string) => {
    if (!selected) return;
    setClaiming(true);
    setPinError(null);
    try {
      const res = await apiClient.post(`/pos-devices/${selected.id}/claim`, { pin });
      // Store session
      localStorage.setItem('pos_session', JSON.stringify({
        deviceId:     res.data.deviceId,
        sessionToken: res.data.sessionToken,
        deviceName:   res.data.deviceName,
        cashierName:  res.data.cashierName,
      }));
      router.push('/pos/touch');
    } catch (err: any) {
      setPinError(err?.response?.data?.message || 'PIN incorrecto');
    } finally {
      setClaiming(false);
    }
  };

  const availableDevices = devices.filter((d) => d.isActive && !d.currentCashier);
  const inUseDevices     = devices.filter((d) => d.isActive && d.currentCashier);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3 safe-top">
        {step === 'pin' ? (
          <button onClick={() => { setStep('list'); setSelected(null); setPinError(null); }}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors -ml-1">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
        ) : (
          <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
            <Monitor size={18} className="text-brand-600" />
          </div>
        )}
        <div className="flex-1">
          <h1 className="font-bold text-gray-900 leading-tight">
            {step === 'pin' ? selected?.name ?? 'TPV' : 'Seleccionar TPV'}
          </h1>
          {step === 'list' && <p className="text-xs text-gray-500">Elige el punto de venta que vas a usar</p>}
          {step === 'pin' && <p className="text-xs text-gray-500">Introduce tu PIN de 4 dígitos</p>}
        </div>
        <span className="text-xs text-gray-400 font-medium">SellaPlus</span>
      </div>

      <div className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">
        {/* ── Device list ─────────────────────────────────────────────────── */}
        {step === 'list' && (
          <>
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {availableDevices.length === 0 && inUseDevices.length === 0 && (
                  <div className="text-center py-16">
                    <Monitor size={40} className="text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No hay TPV disponibles.</p>
                    <p className="text-gray-400 text-xs mt-1">Pide al propietario que cree un TPV.</p>
                  </div>
                )}

                {availableDevices.length > 0 && (
                  <div className="mb-6">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Disponibles</p>
                    <div className="space-y-2">
                      {availableDevices.map((d) => (
                        <button key={d.id} onClick={() => handleSelectDevice(d)}
                          className="w-full flex items-center gap-4 bg-white border border-gray-200 rounded-2xl px-4 py-4 hover:border-brand-400 hover:shadow-sm transition-all active:scale-[0.98]">
                          <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                            <Monitor size={22} className="text-brand-600" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-semibold text-gray-900">{d.name}</p>
                            <p className="text-xs text-green-500 font-medium mt-0.5">Disponible</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Lock size={14} className="text-gray-300" />
                            <ChevronRight size={18} className="text-gray-300" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {inUseDevices.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">En uso</p>
                    <div className="space-y-2">
                      {inUseDevices.map((d) => (
                        <div key={d.id}
                          className="flex items-center gap-4 bg-white border border-gray-100 rounded-2xl px-4 py-4 opacity-60">
                          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                            <Monitor size={22} className="text-gray-400" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-semibold text-gray-700">{d.name}</p>
                            <p className="text-xs text-orange-500 font-medium mt-0.5">
                              En uso — {d.currentCashier?.name}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ── PIN entry ────────────────────────────────────────────────────── */}
        {step === 'pin' && selected && (
          <div className="flex flex-col items-center pt-6">
            <div className="w-20 h-20 rounded-full bg-brand-100 flex items-center justify-center mb-6">
              <Lock size={32} className="text-brand-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Ingresa tu PIN</h2>
            <p className="text-sm text-gray-500 mb-8 text-center">
              Identifícate en <strong>{selected.name}</strong> con tu PIN personal
            </p>
            <PinPad onSubmit={handlePin} loading={claiming} error={pinError} />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-4 text-center safe-bottom">
        <button
          onClick={() => {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            router.push('/login');
          }}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
