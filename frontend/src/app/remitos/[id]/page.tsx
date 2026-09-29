'use client';

import { use } from 'react';
import { RemitoPantalla } from '@/components/remitos/RemitoPantalla';

export default function RemitoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <RemitoPantalla id={id} />;
}
