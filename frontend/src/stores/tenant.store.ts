import { create } from 'zustand';
import { apiClient } from '@/lib/api/client';

// Maps backend currency code → { symbol, locale }
const CURRENCY_MAP: Record<string, { symbol: string; locale: string }> = {
  PEN: { symbol: 'S/', locale: 'es-PE' },
  USD: { symbol: '$',  locale: 'en-US' },
  EUR: { symbol: '€',  locale: 'es-ES' },
  MXN: { symbol: '$',  locale: 'es-MX' },
  COP: { symbol: '$',  locale: 'es-CO' },
  ARS: { symbol: '$',  locale: 'es-AR' },
  CLP: { symbol: '$',  locale: 'es-CL' },
  BRL: { symbol: 'R$', locale: 'pt-BR' },
  GBP: { symbol: '£',  locale: 'en-GB' },
};

interface TenantState {
  currency: string;    // e.g. "PEN"
  locale: string;      // e.g. "es-PE"
  symbol: string;      // e.g. "S/"
  loaded: boolean;
  load: () => Promise<void>;
  reset: () => void;
  format: (amount: number) => string;
}

export const useTenantStore = create<TenantState>((set, get) => ({
  currency: 'PEN',
  locale: 'es-PE',
  symbol: 'S/',
  loaded: false,

  reset: () => set({ loaded: false }),

  load: async () => {
    if (get().loaded) return;
    try {
      const res = await apiClient.get('/tenant/settings');
      const currency: string = res.data.currency ?? 'PEN';
      const { symbol, locale } = CURRENCY_MAP[currency] ?? { symbol: currency, locale: 'es-PE' };
      set({ currency, symbol, locale, loaded: true });
    } catch {
      // keep defaults
      set({ loaded: true });
    }
  },

  format: (amount: number) => {
    const { currency, locale } = get();
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  },
}));
