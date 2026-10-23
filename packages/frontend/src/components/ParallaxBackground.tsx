import { useEffect, useRef, type ReactElement } from "react";

/** How much slower the poster scrolls than the page (0 = fixed, 1 = static). */
const PARALLAX_RATE = 0.3;

/**
 * Full-viewport arcade poster behind the page that scrolls at a fraction of
 * the page speed. A transform on a fixed layer works everywhere, including
 * iOS Safari, which breaks `background-attachment: fixed` on cover images.
 * Honours `prefers-reduced-motion` by staying still.
 */
export default function ParallaxBackground(): ReactElement {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const apply = () => {
      frame = 0;
      const offset = reduced.matches ? 0 : -window.scrollY * PARALLAX_RATE;
      el.style.transform = `translate3d(0, ${offset}px, 0)`;
    };
    const onScroll = () => {
      if (frame === 0) frame = window.requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    reduced.addEventListener("change", apply);
    return () => {
      window.removeEventListener("scroll", onScroll);
      reduced.removeEventListener("change", apply);
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, []);

  return <div ref={ref} className="parallax-bg" aria-hidden="true" />;
}
