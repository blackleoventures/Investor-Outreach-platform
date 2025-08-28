'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DealRoomRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/pitch-analyzer');
  }, [router]);

  return null;
}