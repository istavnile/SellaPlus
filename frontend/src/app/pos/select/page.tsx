'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * /pos/select now just redirects:
 * - If there's an active session → /pos/touch
 * - Otherwise → /login (which contains the full TPV-selection + PIN flow)
 *
 * This avoids duplicating the TPV picker / PIN screen.
 */
export default function SelectTpvPage() {
  const router = useRouter();

  useEffect(() => {
    const session = typeof window !== 'undefined' ? localStorage.getItem('pos_session') : null;
    if (session) {
      router.replace('/pos/touch');
    } else {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
