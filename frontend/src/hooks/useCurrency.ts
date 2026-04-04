import { useEffect } from 'react';
import { useTenantStore } from '@/stores/tenant.store';

export function useCurrency() {
  const { symbol, format, load, loaded } = useTenantStore();

  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);

  return { symbol, format };
}
