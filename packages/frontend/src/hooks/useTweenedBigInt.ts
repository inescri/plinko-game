import { useEffect, useRef, useState } from "react";

/** Resolution of the interpolation: steps per tween. */
const STEPS = 1000n;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Animate a `bigint` towards `target`: when the target changes, the returned
 * value counts from the previous value to the new one over `durationMs`.
 * The first value, and any change that comes with a new `key` (a different
 * token: counting one token's balance into another's is meaningless), is
 * shown at once. Interpolation stays in `bigint` space so base units are
 * never rounded through a `number`.
 */
export function useTweenedBigInt(
  target: bigint,
  durationMs = 700,
  key: string | null = null,
): bigint {
  const [shown, setShown] = useState(target);
  const shownRef = useRef(target);
  const firstRef = useRef(true);
  const keyRef = useRef(key);

  useEffect(() => {
    const keyChanged = keyRef.current !== key;
    keyRef.current = key;
    if (firstRef.current || keyChanged || durationMs <= 0) {
      firstRef.current = false;
      shownRef.current = target;
      setShown(target);
      return;
    }
    const from = shownRef.current;
    if (from === target) return;
    const delta = target - from;
    const start = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const step = BigInt(Math.round(easeOutCubic(t) * Number(STEPS)));
      const next = t >= 1 ? target : from + (delta * step) / STEPS;
      shownRef.current = next;
      setShown(next);
      if (t < 1) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [target, durationMs, key]);

  return shown;
}
