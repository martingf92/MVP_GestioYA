'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUsuario } from '@/lib/api';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace(getUsuario() ? '/entidades' : '/login');
  }, [router]);

  return null;
}
