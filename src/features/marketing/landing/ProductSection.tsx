import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../../../components/ui';
import { AppMock } from './appmock';
import { APP_WIDTH, SCREENS, type Screen } from './screens';
import { Display, Eyebrow } from './primitives';

/** Distance from the top of the viewport the sticky frame settles at. */
const STICKY_TOP = 82;

/**
 * Smallest scale the product shot is allowed to shrink to on a narrow screen.
 *
 * The design scales the frame to whatever width is left, with a floor of 0.25.
 * On a phone that works out at roughly 0.28 — a 14px row of the app rendered
 * at four pixels, which is a picture of a screenshot rather than a screenshot.
 * Below this floor the frame stops shrinking and pans sideways instead, which
 * is the one deliberate departure from the design's own sizing.
 */
const MIN_SCALE_NARROW = 0.55;

/**
 * True from md up.
 *
 * Guarded because matchMedia is the one API here that is not optional to the
 * component: without it, `fit` throws in an effect and takes the whole page
 * down after the prerendered markup has already painted and looked fine. A DOM
 * without matchMedia gets the narrow path — tabs, no scroll hijacking — which
 * is the safe half of the behaviour.
 */
function isWide() {
  return (
    typeof window.matchMedia === 'function' && window.matchMedia('(min-width: 768px)').matches
  );
}

/**
 * The product tour: four real screens in a browser frame that changes as you
 * scroll past it.
 *
 * The frame holds the app at its true 1240px width and scales the whole thing
 * down, rather than reflowing the app into whatever column is left over. That
 * is the difference between a product shot and a picture of a squeezed layout
 * nobody actually uses — the proportions stay the app's own.
 */
export function ProductSection() {
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [canPan, setCanPan] = useState(false);

  const stage = useRef<HTMLDivElement>(null);
  const sticky = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const app = useRef<HTMLDivElement>(null);

  /**
   * A manual pick has to win for a moment, or the scroll handler immediately
   * overrides the tab you just pressed with whatever the scroll position says.
   */
  const lockUntil = useRef(0);
  const pick = useCallback((next: Screen) => {
    lockUntil.current = Date.now() + 1400;
    setScreen(next);
  }, []);

  // Scale the frame to the room available. Both axes come off one scale, so
  // the browser chrome and the page inside it always agree.
  useEffect(() => {
    function fit() {
      const stickyEl = sticky.current;
      const frameEl = frame.current;
      const wrapEl = wrap.current;
      const appEl = app.current;
      if (!stickyEl || !frameEl || !wrapEl || !appEl) return;

      const wide = isWide();
      // Whatever the sticky block spends on things that are not the frame —
      // the step tabs and the active line.
      const overhead = stickyEl.offsetHeight - wrapEl.offsetHeight;
      const height = appEl.offsetHeight || 715;
      // Available width comes from the column, not from the wrap: the wrap is
      // sized BY this function, so reading it back would feed on itself.
      const available = stickyEl.clientWidth - 2;

      const toWidth = available / APP_WIDTH;
      let scale: number;
      if (wide) {
        // Height matters too, or the frame runs past the fold and the last
        // step is never reachable.
        const room = window.innerHeight - STICKY_TOP - overhead - 12;
        scale = Math.max(0.25, Math.min(1, toWidth, room / height));
      } else {
        scale = Math.max(MIN_SCALE_NARROW, Math.min(1, toWidth));
      }

      appEl.style.transform = `scale(${scale})`;
      const scaledWidth = Math.round(APP_WIDTH * scale);
      wrapEl.style.height = `${Math.round(height * scale)}px`;

      if (scaledWidth > available) {
        // Panning case: the wrap fills the column and scrolls sideways.
        wrapEl.style.width = '100%';
        frameEl.style.width = '100%';
        frameEl.style.margin = '0';
        setCanPan(true);
      } else {
        wrapEl.style.width = `${scaledWidth}px`;
        frameEl.style.width = 'max-content';
        frameEl.style.margin = '0 auto';
        setCanPan(false);
      }
    }

    fit();
    window.addEventListener('resize', fit);
    // A serif headline swapping in changes the tabs' height, which changes the
    // room left for the frame.
    void document.fonts?.ready.then(fit).catch(() => {});
    return () => window.removeEventListener('resize', fit);
  }, []);

  // How far through the stage you are decides which screen shows. Measured
  // against the distance the stage can actually travel, so the fourth step is
  // reachable rather than falling past the point where the frame unsticks.
  useEffect(() => {
    let raf = 0;

    function read() {
      const stageEl = stage.current;
      const stickyEl = sticky.current;
      if (!stageEl || !stickyEl) return;
      // Below md the stage is not tall and nothing is sticky: the tabs are the
      // only control, and hijacking the scroll on a phone is a good way to
      // make a page feel broken.
      if (!isWide()) return;

      const travel = stageEl.offsetHeight - stickyEl.offsetHeight - STICKY_TOP;
      if (travel <= 0) return;

      const progress = Math.min(
        0.999,
        Math.max(0, (STICKY_TOP - stageEl.getBoundingClientRect().top) / travel),
      );
      const next = SCREENS[Math.floor(progress * SCREENS.length)].id;
      if (Date.now() >= lockUntil.current) {
        setScreen((current) => (current === next ? current : next));
      }
    }

    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        read();
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    read();
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const active = SCREENS.find((s) => s.id === screen) ?? SCREENS[0];

  return (
    <section
      id="product"
      className="relative bg-[linear-gradient(180deg,var(--color-ivory)_0%,var(--color-surface)_14%,var(--color-surface)_86%,var(--color-ivory)_100%)] px-5 pt-5 sm:px-8"
    >
      <div className="mx-auto max-w-[1440px] pt-16 sm:pt-23">
        <div className="max-w-[640px]">
          <Eyebrow>The product</Eyebrow>
          <Display>Four screens do most of the work</Display>
          <p
            data-reveal
            data-reveal-delay="120"
            className="mt-4.5 mb-11 text-[17px] leading-[1.65] text-stone-600"
          >
            Scroll, or pick a tab. These are the real screens.
          </p>
        </div>

        <div ref={stage} className="relative md:h-[380vh]">
          <div ref={sticky} className="pb-3 md:sticky md:top-[82px]">
            <div className="mb-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {SCREENS.map((s) => {
                const on = s.id === screen;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => pick(s.id)}
                    aria-pressed={on}
                    className={cn(
                      'border-t-2 pt-2.5 pr-3.5 pb-2.5 text-left transition-[opacity,border-color] duration-[450ms]',
                      on ? 'border-wine-600 opacity-100' : 'border-stone-200 opacity-45',
                    )}
                  >
                    <p className="text-[12px] font-semibold tracking-[0.12em] text-gold-500 tabular-nums">
                      {s.step}
                    </p>
                    <p className="mt-1.5 text-[15.5px] leading-[1.3] font-semibold tracking-[-0.01em] text-stone-900">
                      {s.title}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Fixed height, so swapping the line never nudges the frame — and
                the frame's scale is computed from what is left over. */}
            <p className="mb-3 h-[22px] max-w-[980px] overflow-hidden text-[14px] leading-[22px] text-stone-600 max-sm:h-auto max-sm:overflow-visible">
              {active.line}
            </p>

            <div
              ref={frame}
              className="overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-[0_4px_8px_-2px_rgb(28_25_23/0.08),0_30px_70px_-24px_rgb(28_25_23/0.32)]"
            >
              <div
                ref={wrap}
                className={cn('bg-surface', canPan ? 'overflow-x-auto overflow-y-hidden' : 'overflow-hidden')}
              >
                <div ref={app} className="origin-top-left">
                  <AppMock screen={screen} onPick={pick} />
                </div>
              </div>
            </div>

            {canPan && (
              <p className="mt-2 text-center text-[12px] text-stone-500 md:hidden">
                The panel scrolls sideways — it is the desktop screen, at size.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
