import { useEffect, useState, type DependencyList } from 'react';

const EMPTY_DEPS: DependencyList = [];

export function usePageTransition(deps?: DependencyList): string {
  const [ready, setReady] = useState(false);
  const effectDeps = deps ?? EMPTY_DEPS;

  useEffect(() => {
    setReady(false);
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, effectDeps);

  return ready ? 'page-enter-active' : 'page-enter';
}
