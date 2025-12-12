import { useEffect, useState } from 'react';

export function usePageTransition(): string {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return ready ? 'page-enter-active' : 'page-enter';
}
