import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Gem, Play, Sparkles, TrendingUp, UsersRound } from 'lucide-react';
import { useHead } from '../../lib/head';
import { cn } from '../../components/ui';
import { useCountUp, useReveals } from './landing/animation';
import { Photo } from './landing/primitives';
import { ProductSection } from './landing/ProductSection';
import {
  DayOfSection,
  LibrarySection,
  ModulesSection,
  ProblemSection,
  RolesSection,
  SecuritySection,
} from './landing/sections';
import { FaqSection } from './landing/FaqSection';
import { WaitlistSection } from './landing/WaitlistSection';

/**
 * The only public page in the app, and therefore the only one SEO applies to.
 *
 * `/` used to redirect an unauthenticated visitor straight to /signin, which
 * meant there was nothing to rank and nothing to share — a sign-in form is not
 * a landing page and no crawler will treat it as one.
 *
 * It is rendered twice: here in the browser, and at build time by
 * src/prerender.tsx, which injects the result into index.html. That is why
 * this page must not touch a provider — no QueryClient, no AuthProvider, no
 * Supabase — and why every piece of copy has to be readable with the bundle
 * removed. The reveals and the scroll-driven product tour are enhancements
 * layered onto a page that already says everything.
 *
 * Every "Start free" goes to /signin rather than to the design's #waitlist
 * anchor: there is a real account form behind it, so a waitlist would be
 * theatre.
 */

const NAV = [
  { href: '#problem', label: 'Why' },
  { href: '#product', label: 'Product' },
  { href: '#roles', label: "Who it's for" },
  { href: '#library', label: 'Template library' },
  { href: '#faq', label: 'FAQ' },
];

/** Every figure here is checked in landing/sections.tsx. */
const MARQUEE = [
  '194 budget lines',
  '227 vendor questions',
  '93 planning tasks',
  '56 timeline events',
  '82 procurement items',
  '62 shot-list items',
  '24 ceremony steps',
  '17 legal requirements',
];

export function LandingPage() {
  useHead({
    title: 'MangalaHub — Sri Lankan wedding planner for your Mangala day',
    description:
      'Every rupee, every vendor, every guest and every hour of the day itself, in one place your whole family can use. A poruwa running order, a budget kept in cents, RSVP links per household, and a day-of pack that prints.',
    index: true,
    exact: true,
  });

  // One container, one query for the whole page: see landing/primitives.tsx
  // for why these animate the DOM instead of holding state.
  const page = useRef<HTMLDivElement>(null);
  useReveals(page);
  useCountUp(page);

  return (
    <div ref={page} className="mh-page relative min-h-full overflow-x-clip bg-ivory">
      <Header />
      <main>
        <Hero />
        <MarqueeBand />
        <ProblemSection />
        <ProductSection />
        <ModulesSection />
        <RolesSection />
        <LibrarySection />
        <DayOfSection />
        <SecuritySection />
        <FaqSection />
        <WaitlistSection />
      </main>
      <Footer />
    </div>
  );
}

/** The wordmark, at the two sizes it appears in. */
function Wordmark({ size = 'md' }: { size?: 'sm' | 'md' }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        className={cn(
          'flex items-center justify-center rounded-[9px] bg-[linear-gradient(140deg,var(--color-wine-600),var(--color-wine-900))] shadow-[0_2px_8px_-2px_rgb(85_22_34/0.5)]',
          size === 'md' ? 'size-7.5' : 'size-7',
        )}
      >
        <Gem className={size === 'md' ? 'size-[15px] text-gold-200' : 'size-3.5 text-gold-200'} />
      </span>
      <span
        className={cn(
          'font-semibold tracking-[-0.02em] text-stone-900',
          size === 'md' ? 'text-[17px]' : 'text-[16px]',
        )}
      >
        Mangala<span className="text-wine-600">Hub</span>
      </span>
    </span>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-60 border-b border-stone-200/70 bg-ivory/80 backdrop-blur-[14px]">
      <div className="mx-auto flex h-16.5 max-w-[1400px] flex-nowrap items-center gap-9 px-5 sm:px-8">
        <a href="#top" className="shrink-0">
          <Wordmark />
        </a>

        {/* Anchor navigation is the first thing to go when the width runs out:
            every section it points at is still reachable by scrolling. */}
        <nav className="hidden items-center gap-6.5 text-[13.5px] text-stone-600 lg:flex">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="hover:text-wine-700">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2.5">
          <Link
            to="/signin"
            className="hidden h-9.5 items-center rounded-lg px-3.5 text-[13.5px] font-medium text-stone-700 hover:text-wine-700 sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            to="/signin"
            className="inline-flex h-9.5 items-center gap-[7px] rounded-lg bg-wine-700 px-4.5 text-[13.5px] font-medium text-white shadow-card transition-[background-color,transform] duration-200 hover:-translate-y-px hover:bg-wine-800"
          >
            Start free <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

/**
 * The figures lifted off the hero photograph. Positioned absolutely only from
 * lg up; below that the wrapper stops being a layout box (`lg:contents`) and
 * they sit in a row under the picture — which is why there is one copy of them
 * rather than a desktop set and a mobile set to keep in step.
 */
function HeroChips() {
  return (
    <div className="mt-4 flex flex-wrap gap-3 lg:mt-0 lg:contents">
      <div
        className="rounded-xl bg-white px-4.5 py-3 shadow-pop lg:absolute lg:top-6.5 lg:-left-7.5"
        style={{ animation: 'mh-drift 7s ease-in-out infinite' }}
      >
        <p className="text-[30px] leading-none font-semibold text-wine-800 tabular-nums">163</p>
        <p className="mt-1 text-[11px] font-medium text-wine-700">days to go</p>
      </div>

      <div
        className="w-59 rounded-xl bg-white px-4 py-3.5 shadow-pop lg:absolute lg:bottom-24 lg:-left-14"
        style={{ animation: 'mh-drift 9s ease-in-out infinite .8s' }}
      >
        <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-stone-500">
          <TrendingUp className="size-[13px]" /> Forecast final cost (LKR)
        </div>
        <p className="mt-1.5 text-[22px] leading-[1.15] font-semibold tracking-[-0.02em] text-wine-700 tabular-nums">
          5,120,400
        </p>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-stone-100">
          <div
            className="h-full w-[107%] origin-left rounded-full bg-red-400"
            style={{ animation: 'mh-grow 1.4s cubic-bezier(.16,1,.3,1) both .5s' }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-stone-500">107% of a 4,800,000 budget</p>
      </div>

      <div
        className="w-52 rounded-xl bg-white px-4 py-3.5 shadow-pop lg:absolute lg:-right-6 lg:-bottom-6.5"
        style={{ animation: 'mh-drift 8s ease-in-out infinite 1.6s' }}
      >
        <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-stone-500">
          <UsersRound className="size-[13px]" /> Replies in
        </div>
        <div className="flex items-baseline gap-2">
          <p className="mt-1 text-[22px] leading-[1.15] font-semibold tracking-[-0.02em] text-stone-900 tabular-nums">
            74%
          </p>
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-px text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200 ring-inset">
            +18 today
          </span>
        </div>
        <p className="mt-1.5 text-[11px] text-stone-500">107 still to answer</p>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section id="top" className="relative px-5 pt-14 pb-20 sm:px-8 sm:pt-24 sm:pb-27">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-45 -left-35 size-155 rounded-full bg-[radial-gradient(circle,rgba(238,200,206,0.55),rgba(251,248,244,0)_68%)]"
        style={{ animation: 'mh-float-a 22s ease-in-out infinite' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-30 -right-50 size-170 rounded-full bg-[radial-gradient(circle,rgba(231,214,180,0.5),rgba(251,248,244,0)_68%)]"
        style={{ animation: 'mh-float-b 26s ease-in-out infinite' }}
      />

      <div className="relative mx-auto grid max-w-[1400px] items-center gap-12 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,1fr)] lg:gap-16">
        <div>
          <div
            data-reveal
            className="inline-flex items-center gap-2 rounded-full border border-gold-200 bg-white py-1.5 pr-3 pl-1.5 shadow-card"
          >
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-gold-100">
              <Sparkles className="size-3 text-gold-600" />
            </span>
            <span className="text-[12px] font-medium tracking-[0.01em] text-gold-700">
              Built from a real 27-sheet Sri Lankan wedding workbook
            </span>
          </div>

          <h1
            data-reveal
            data-reveal-delay="80"
            className="mt-6.5 font-display text-[40px] leading-[1.02] font-normal tracking-[-0.022em] text-stone-900 text-balance sm:text-[58px] lg:text-[76px]"
          >
            Your journey to the perfect <em className="text-wine-600 italic">Mangala</em> day
          </h1>

          <p
            data-reveal
            data-reveal-delay="160"
            className="mt-6.5 max-w-[530px] text-[16.5px] leading-[1.62] text-stone-600 text-pretty sm:text-[17.5px]"
          >
            Every rupee, every vendor, every guest and every hour of the day itself — in one place
            your whole family can actually use. MangalaHub replaces the spreadsheet that only one
            person understands.
          </p>

          <div
            data-reveal
            data-reveal-delay="240"
            className="mt-8.5 flex flex-wrap items-center gap-3"
          >
            <Link
              to="/signin"
              className="inline-flex h-12.5 items-center gap-2 rounded-xl bg-wine-700 px-6.5 text-[15px] font-medium text-white shadow-[0_8px_24px_-8px_rgb(85_22_34/0.55)] transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-0.5 hover:bg-wine-800 hover:shadow-[0_14px_30px_-10px_rgb(85_22_34/0.6)]"
            >
              Start free <ArrowRight className="size-4" />
            </Link>
            <a
              href="#product"
              className="inline-flex h-12.5 items-center gap-2 rounded-xl border border-stone-200 bg-white px-5.5 text-[15px] font-medium text-stone-700 shadow-card transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-stone-300"
            >
              <Play className="size-[15px] text-wine-600" /> See the product
            </a>
          </div>

          <p data-reveal data-reveal-delay="300" className="mt-5 text-[12.5px] text-stone-500">
            Free while in beta · No card · Export everything to Excel any time
          </p>
        </div>

        <div data-reveal data-reveal-delay="140" className="relative">
          <div className="relative aspect-4/5 overflow-hidden rounded-3xl shadow-[0_4px_8px_-2px_rgb(28_25_23/0.08),0_30px_60px_-20px_rgb(28_25_23/0.3)]">
            {/* 660x660, so the 4:5 frame crops the sides. A wider source
                would render more crisply on a dense display — see the note in
                public/hero.webp's commit. */}
            <Photo
              src="/hero.webp"
              alt="A newly married couple leaving their ceremony as guests throw confetti"
              width={660}
              height={660}
              priority
            />
          </div>
          <HeroChips />
        </div>
      </div>
    </section>
  );
}

function MarqueeBand() {
  return (
    <div className="overflow-hidden border-y border-stone-200/80 bg-surface py-3.5">
      <div className="flex w-max" style={{ animation: 'mh-marquee 42s linear infinite' }}>
        {[false, true].map((duplicate) => (
          <div
            key={String(duplicate)}
            aria-hidden={duplicate || undefined}
            className="flex gap-11 pr-11 font-display text-[19px] whitespace-nowrap text-gold-700"
          >
            {MARQUEE.map((item) => (
              <span key={item} className="flex gap-11">
                {item}
                <span className="text-gold-400">✦</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

const FOOTER_COLUMNS = [
  {
    heading: 'Product',
    links: [
      { href: '#product', label: 'Dashboard' },
      { href: '#product', label: 'Budget & payments' },
      { href: '#product', label: 'Vendor comparison' },
      { href: '#product', label: 'Day-of console' },
      { href: '#library', label: 'Template library' },
    ],
  },
  {
    heading: 'For',
    links: [
      { href: '#roles', label: 'Couples' },
      { href: '#roles', label: 'Families' },
      { href: '#roles', label: 'Coordinators' },
      { href: '#roles', label: 'Guests' },
    ],
  },
];

function Footer() {
  return (
    <footer className="border-t border-stone-200/80 bg-surface px-5 pt-13 pb-10 sm:px-8">
      <div className="mx-auto grid max-w-[1120px] gap-10 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]">
        <div>
          <Wordmark size="sm" />
          <p className="mt-3.5 max-w-70 font-display text-[18px] leading-[1.45] text-stone-600">
            Your journey to the perfect Mangala day.
          </p>
          <p className="mt-4.5 text-[12px] text-stone-500">
            Colombo, Sri Lanka · hello@mangalahub.lk
          </p>
        </div>

        {FOOTER_COLUMNS.map((column) => (
          <div key={column.heading}>
            <p className="mb-3 text-[11px] font-semibold tracking-[0.1em] text-stone-500 uppercase">
              {column.heading}
            </p>
            <div className="flex flex-col gap-2 text-[13.5px]">
              {column.links.map((link) => (
                <a key={link.label} href={link.href} className="text-stone-600 hover:text-wine-700">
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        ))}

        <div>
          <p className="mb-3 text-[11px] font-semibold tracking-[0.1em] text-stone-500 uppercase">
            Company
          </p>
          {/* The design also listed Privacy and Terms, both pointing at #top.
              Two links that go nowhere are worse than two links that are
              missing, so they wait for real pages. */}
          <div className="flex flex-col gap-2 text-[13.5px]">
            <a href="#faq" className="text-stone-600 hover:text-wine-700">
              FAQ
            </a>
            <Link to="/signin" className="text-stone-600 hover:text-wine-700">
              Start free
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-9 flex max-w-[1120px] flex-wrap justify-between gap-3 border-t border-stone-200/90 pt-5 text-[12px] text-stone-500">
        <span>© 2026 MangalaHub</span>
        <span>Built on the Sri Lankan Wedding Master Planner workbook</span>
      </div>
    </footer>
  );
}
