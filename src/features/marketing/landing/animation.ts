import { useEffect, type RefObject } from 'react';

/**
 * Scroll-driven decoration for the landing page.
 *
 * Both hooks drive animation by mutating the DOM rather than by holding
 * animation state in React, which is how the design does it too: these nodes
 * are static content, nothing re-renders them, and putting "has this scrolled
 * into view yet" into state for sixty elements would re-render the page on
 * every scroll.
 */

const REVEAL_TRANSITION =
  'opacity .8s cubic-bezier(.16,1,.3,1), transform .8s cubic-bezier(.16,1,.3,1)';

/**
 * Fades content up as it scrolls into view. Mark an element with `data-reveal`
 * and optionally `data-reveal-delay` in milliseconds.
 *
 * The starting state is applied here, on mount, rather than in the markup. It
 * has to be this way round: the page is prerendered at build time, so opacity
 * in the markup would mean a visitor with no JavaScript — and every crawler
 * that does not run it — gets a blank page. Content is visible by default and
 * this hook is the enhancement, never the thing that makes it readable.
 */
export function useReveals(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const container = root.current;
    // No IntersectionObserver means no observer to un-hide things again, so
    // leave the page exactly as it was rendered.
    if (!container || typeof IntersectionObserver === 'undefined') return;

    const elements = Array.from(container.querySelectorAll<HTMLElement>('[data-reveal]'));
    for (const element of elements) {
      element.style.opacity = '0';
      element.style.transform = 'translateY(22px)';
      element.style.transition = REVEAL_TRANSITION;
      element.style.transitionDelay = `${element.dataset.revealDelay ?? 0}ms`;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const element = entry.target as HTMLElement;
          element.style.opacity = '1';
          element.style.transform = 'none';
          observer.unobserve(element);
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
    );

    for (const element of elements) observer.observe(element);
    return () => observer.disconnect();
  }, [root]);
}

/**
 * Counts a figure up once, the first time it is seen. Mark the element with
 * `data-count="194"` and render the final number as its text.
 *
 * The final value being in the markup is the point: the animation overwrites
 * it and puts it back, so a visitor without JavaScript, a crawler, and anyone
 * who scrolls past mid-animation all see the true figure rather than a
 * half-counted one.
 */
export function useCountUp(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const container = root.current;
    if (!container || typeof IntersectionObserver === 'undefined') return;

    // Counting up is pure decoration, and it makes numbers unreadable for a
    // second to anyone who finds motion difficult.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);

          const element = entry.target as HTMLElement;
          const target = Number(element.dataset.count);
          if (!Number.isFinite(target)) continue;

          const started = performance.now();
          const tick = (now: number) => {
            const progress = Math.min(1, (now - started) / 1100);
            const eased = 1 - (1 - progress) ** 3;
            element.textContent = String(Math.round(target * eased));
            if (progress < 1) frame = requestAnimationFrame(tick);
          };
          frame = requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 },
    );

    for (const element of container.querySelectorAll('[data-count]')) observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [root]);
}
