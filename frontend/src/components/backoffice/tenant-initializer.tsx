'use client';

import { useEffect } from 'react';
import { useTenantStore } from '@/stores/tenant.store';

export function TenantInitializer() {
  const { load, loaded } = useTenantStore();
  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);
  return null;
}
