/**
 * The small shared pieces of the landing page. Animation lives next door in
 * animation.ts, so this file exports only components.
 */

/** Small uppercase label above a section heading. */
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p
      data-reveal
      className="text-[12px] font-semibold tracking-[0.14em] text-gold-500 uppercase"
    >
      {children}
    </p>
  );
}

/**
 * A section headline. `font-display` is Cormorant Garamond, at a weight and
 * size that only works because it is a display face — the same size in Inter
 * would be shouting.
 */
export function Display({
  children,
  className = '',
  delay = 60,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <h2
      data-reveal
      data-reveal-delay={delay}
      className={`mt-4 font-display text-[34px] leading-[1.08] font-normal tracking-[-0.02em] text-stone-900 sm:text-[44px] lg:text-[52px] ${className}`}
    >
      {children}
    </h2>
  );
}

/**
 * Stands in for the photographs the design leaves as slots.
 *
 * The design has two: a portrait hero and a family shot beside the roles. No
 * image was supplied with it, and an empty box would read as a broken page, so
 * this draws something deliberate instead — a wine-to-gold wash with a
 * repeating motif. Drop a real photograph in by passing `src`; everything
 * around it, including the aspect ratio, already expects one.
 */
export function Photo({
  src,
  alt,
  className = '',
  priority = false,
  width,
  height,
}: {
  src?: string;
  alt: string;
  className?: string;
  /** Set on the hero. See below — this is the page's LCP element. */
  priority?: boolean;
  width?: number;
  height?: number;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        // The hero photograph is the largest thing above the fold, which makes
        // it the Largest Contentful Paint. Lazy-loading it would defer the
        // request until layout, delaying the one paint the score is measured
        // on; everything further down the page wants the opposite.
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        // Intrinsic size, so the browser can reserve the box before the bytes
        // arrive even though the frame's aspect ratio already fixes it.
        width={width}
        height={height}
        className={`size-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={alt}
      className={`relative size-full overflow-hidden bg-gradient-to-br from-wine-800 via-wine-700 to-wine-900 ${className}`}
    >
      {/* Two washes and a lattice: enough texture that the frame reads as a
          considered panel rather than a missing image. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(28rem_20rem_at_20%_15%,rgba(201,168,106,0.45),transparent_70%),radial-gradient(24rem_18rem_at_85%_80%,rgba(238,200,206,0.35),transparent_70%)]"
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.18] bg-[repeating-linear-gradient(45deg,transparent_0_14px,rgba(251,248,244,0.7)_14px_15px),repeating-linear-gradient(-45deg,transparent_0_14px,rgba(251,248,244,0.7)_14px_15px)]"
      />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-wine-900/70 to-transparent" />
    </div>
  );
}
