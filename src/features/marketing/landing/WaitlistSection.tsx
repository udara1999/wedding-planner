import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

/**
 * The closing call to action.
 *
 * The design's form captures an email and shows a thank-you: it is a waitlist,
 * for a product that does not exist yet. This one does, with real sign-up
 * behind /signin, so the form hands the address straight to the account form
 * rather than promising an email nobody sends.
 *
 * The address travels in router state, not in the query string — an email in a
 * URL ends up in history, in logs and in any referrer the next page sends.
 */
export function WaitlistSection() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');

  return (
    <section id="waitlist" className="relative px-5 pb-20 sm:px-8 sm:pb-26">
      <div className="relative mx-auto max-w-[1120px] overflow-hidden rounded-[1.75rem] bg-[linear-gradient(135deg,var(--color-wine-700)_0%,var(--color-wine-900)_62%,var(--color-wine-800)_100%)] px-7 py-14 shadow-[0_30px_70px_-28px_rgb(61_15_24/0.6)] sm:px-14 sm:py-19">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-35 -right-20 size-115 rounded-full bg-[radial-gradient(circle,rgba(201,168,106,0.28),rgba(61,15,24,0)_70%)]"
          style={{ animation: 'mh-float-a 20s ease-in-out infinite' }}
        />
        <div className="relative max-w-[640px]">
          <h2
            data-reveal
            className="font-display text-[34px] leading-[1.06] font-normal tracking-[-0.02em] text-ivory text-balance sm:text-[44px] lg:text-[52px]"
          >
            Start the plan tonight
          </h2>
          <p
            data-reveal
            data-reveal-delay="60"
            className="mt-4.5 text-[17px] leading-[1.65] text-wine-200"
          >
            Create a wedding, pick your tradition, and the template fills it in. Free while
            MangalaHub is in beta — and your data comes back out as a workbook whenever you want it.
          </p>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              navigate('/signin', { state: { email } });
            }}
            className="mt-8 flex max-w-[520px] flex-wrap gap-2.5"
          >
            <label htmlFor="mh-email" className="sr-only">
              Your email address
            </label>
            <input
              id="mh-email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-13 min-w-[240px] flex-1 rounded-xl border border-wine-200/35 bg-ivory/8 px-4.5 text-[15px] text-ivory transition-colors outline-none placeholder:text-wine-200/60 focus:border-gold-400 focus:bg-ivory/14"
            />
            <button
              type="submit"
              className="inline-flex h-13 items-center gap-2 rounded-xl bg-ivory px-7 text-[15px] font-semibold text-wine-900 shadow-[0_8px_24px_-8px_rgb(0_0_0/0.5)] transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-white"
            >
              Start free <ArrowRight className="size-4" />
            </button>
          </form>

          <p data-reveal data-reveal-delay="120" className="mt-4.5 text-[12.5px] text-wine-200/72">
            No card. Cancel by deleting the wedding — it takes its data with it.
          </p>
        </div>
      </div>
    </section>
  );
}
