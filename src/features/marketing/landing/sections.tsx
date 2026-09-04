import {
  AlertTriangle,
  CalendarClock,
  ClipboardList,
  CreditCard,
  Download,
  Gem,
  HandCoins,
  Heart,
  Hourglass,
  Mail,
  Phone,
  Printer,
  Scale,
  ShieldCheck,
  UsersRound,
  Wallet,
  WifiOff,
} from 'lucide-react';
import { Display, Eyebrow, Photo } from './primitives';

/**
 * The narrative sections of the landing page, in the order they appear.
 *
 * ON THE FIGURES IN HERE
 * They are all checkable, and they were checked against the migrations rather
 * than copied from the design: 194 budget lines, 227 vendor questions, 93
 * tasks, 24 ceremony steps, 17 legal requirements and 62 shot-list items are
 * what template/ actually seeds. Two of the design's numbers were the
 * workbook's originals rather than what ships — 56 timeline events, not 57,
 * and 82 procurement items, not 83 — so the true ones are used here. A landing
 * page that overstates a row count is a landing page nobody can trust on the
 * things that are harder to verify.
 */

/* ── The problem ─────────────────────────────────────────────────────────── */

const PROBLEMS = [
  {
    icon: <Wallet className="size-4.5 text-wine-600" />,
    tint: 'bg-wine-50',
    title: 'The money quietly drifts',
    body: 'A quote becomes a negotiated price becomes an actual, and nothing recalculates. Nobody finds the overspend until the deposit is gone.',
  },
  {
    icon: <ClipboardList className="size-4.5 text-gold-600" />,
    tint: 'bg-gold-50',
    title: 'Decisions get lost',
    body: 'Three photographers, three WhatsApp threads, three different definitions of "full day". You end up choosing on price because price is the only thing you can line up.',
  },
  {
    icon: <CalendarClock className="size-4.5 text-stone-600" />,
    tint: 'bg-stone-100',
    title: 'The day lives in one head',
    body: 'The coordinator needs arrival times, phone numbers and a running order — on paper, under stress, with no signal in the hotel basement.',
  },
];

export function ProblemSection() {
  return (
    <section id="problem" className="px-5 pt-20 pb-16 sm:px-8 sm:pt-27 sm:pb-25">
      <div className="mx-auto max-w-[1120px]">
        <div className="max-w-[660px]">
          <Eyebrow>The problem</Eyebrow>
          <Display>It always starts as a spreadsheet.</Display>
          <p
            data-reveal
            data-reveal-delay="120"
            className="mt-5 text-[17px] leading-[1.65] text-stone-600 text-pretty"
          >
            And the spreadsheet is usually good. The problem is what happens to it: one person owns
            the file, the numbers stop agreeing with each other, and on the morning of the wedding
            the only copy of the running order is in someone's head.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PROBLEMS.map((problem, index) => (
            <div
              key={problem.title}
              data-reveal
              data-reveal-delay={index * 90}
              className="rounded-2xl border border-stone-200/80 bg-white p-6.5 shadow-card transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_2px_4px_-1px_rgb(28_25_23/0.06),0_18px_40px_-14px_rgb(28_25_23/0.22)]"
            >
              <div
                className={`flex size-9.5 items-center justify-center rounded-lg ${problem.tint}`}
              >
                {problem.icon}
              </div>
              <h3 className="mt-4.5 text-[16px] font-semibold tracking-[-0.01em] text-stone-900">
                {problem.title}
              </h3>
              <p className="mt-2.5 text-[14.5px] leading-[1.6] text-stone-600">{problem.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Everything else ─────────────────────────────────────────────────────── */

const MODULES = [
  {
    icon: <CreditCard className="size-[19px] text-wine-600" />,
    title: 'Payments with receipts',
    body: "Deposit, advance, instalment, final, refundable. Attach the receipt, and the line's status follows on its own.",
  },
  {
    icon: <HandCoins className="size-[19px] text-wine-600" />,
    title: 'Contributions and gifts',
    body: 'Who promised what, who has actually paid, and what the wedding really costs once the gifts are counted.',
  },
  {
    icon: <UsersRound className="size-[19px] text-wine-600" />,
    title: 'Guests and RSVP, no login',
    body: 'One link per household. Guests reply without an account; the counts, the seating and the headcount for catering all move together.',
  },
  {
    icon: <Hourglass className="size-[19px] text-wine-600" />,
    title: 'Move the date, move the plan',
    body: 'Every task and appointment is stored as an offset from the wedding day. Change the date and the whole plan re-dates itself.',
  },
  {
    icon: <Gem className="size-[19px] text-wine-600" />,
    title: 'Jewellery custody register',
    body: 'Borrowed, rented or family-owned — who is holding each piece right now, and when it goes back.',
  },
  {
    icon: <Download className="size-[19px] text-wine-600" />,
    title: 'Export everything, any time',
    body: 'One button, one workbook, every sheet. It sits in the navigation rather than buried in settings, on purpose.',
  },
];

export function ModulesSection() {
  return (
    <section className="px-5 pt-20 pb-16 sm:px-8 sm:pt-27 sm:pb-25">
      <div className="mx-auto max-w-[1120px]">
        <div className="mb-13 max-w-[620px]">
          <Eyebrow>Everything else</Eyebrow>
          <Display>Eighteen more modules, one shape</Display>
          <p
            data-reveal
            data-reveal-delay="120"
            className="mt-4.5 text-[17px] leading-[1.65] text-stone-600"
          >
            Attire, jewellery custody, beauty appointments, decor, menu, cake, transport,
            accommodation, shot lists, procurement and packing. Each one is a list you can own,
            cost, assign and tick off.
          </p>
        </div>

        <div className="grid gap-4.5 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((module, index) => (
            <div
              key={module.title}
              data-reveal
              data-reveal-delay={(index % 3) * 60}
              className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-card transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-16px_rgb(28_25_23/0.22)]"
            >
              {module.icon}
              <h3 className="mt-3.5 text-[15.5px] font-semibold text-stone-900">{module.title}</h3>
              <p className="mt-2 text-[14px] leading-[1.6] text-stone-600">{module.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Who it's for ────────────────────────────────────────────────────────── */

const ROLES = [
  {
    icon: <Heart className="size-4 text-wine-600" />,
    tint: 'bg-wine-50',
    title: 'The couple',
    qualifier: 'owner · partner',
    body: 'Everything. Money, vendors, guests, the day, and the button that exports it all.',
  },
  {
    icon: <HandCoins className="size-4 text-gold-600" />,
    tint: 'bg-gold-50',
    title: 'Family',
    qualifier: "bride's side · groom's side",
    body: 'The budget and the payments they are funding, scoped to their side. No arguments about who paid for what.',
  },
  {
    icon: <ClipboardList className="size-4 text-stone-600" />,
    tint: 'bg-stone-100',
    title: 'Coordinator',
    qualifier: 'no money, ever',
    body: 'Timeline, vendor arrivals, contact sheet, seating and the emergency plan. Financial rows are not hidden from them — they are not returned at all.',
  },
  {
    icon: <Mail className="size-4 text-stone-600" />,
    tint: 'bg-stone-100',
    title: 'Guests',
    qualifier: 'no login',
    body: 'A single RSVP link per household, rate-limited and captcha-protected. They see their own invitation and nothing else.',
  },
];

export function RolesSection() {
  return (
    <section id="roles" className="px-5 pb-20 sm:px-8 sm:pb-27">
      <div className="mx-auto max-w-[1120px]">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
          <div
            data-reveal
            className="relative aspect-4/3 overflow-hidden rounded-3xl shadow-[0_4px_8px_-2px_rgb(28_25_23/0.08),0_24px_56px_-20px_rgb(28_25_23/0.28)]"
          >
            <Photo alt="A family planning a wedding together" />
          </div>
          <div>
            <Eyebrow>Who it's for</Eyebrow>
            <Display className="lg:text-[48px]">
              Everyone sees what they should, and nothing more
            </Display>
            <p
              data-reveal
              data-reveal-delay="120"
              className="mt-4.5 mb-8 text-[16.5px] leading-[1.65] text-stone-600"
            >
              Access is enforced by the database, not by hiding a menu item. A coordinator with the
              link still cannot read a single figure.
            </p>

            <div className="flex flex-col gap-3">
              {ROLES.map((role, index) => (
                <div
                  key={role.title}
                  data-reveal
                  data-reveal-delay={index * 60}
                  className="flex gap-3.5 rounded-xl border border-stone-200/80 bg-white px-4.5 py-4 shadow-card"
                >
                  <span
                    className={`flex size-8.5 shrink-0 items-center justify-center rounded-lg ${role.tint}`}
                  >
                    {role.icon}
                  </span>
                  <div>
                    <h3 className="text-[14.5px] font-semibold text-stone-900">
                      {role.title}
                      <span className="ml-1.5 text-[12px] font-normal text-stone-500">
                        {role.qualifier}
                      </span>
                    </h3>
                    <p className="mt-1.5 text-[13.5px] leading-[1.55] text-stone-600">
                      {role.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── The template library ────────────────────────────────────────────────── */

/** Verified against the template migrations. See the note at the top. */
const LIBRARY = [
  { count: 194, label: 'budget lines, coded and categorised' },
  { count: 227, label: 'vendor questions across 16 categories' },
  { count: 93, label: 'tasks, each dated from the wedding day' },
  { count: 56, label: 'timeline events for the day itself' },
  { count: 24, label: 'Poruwa ceremony steps, in order' },
  { count: 82, label: 'procurement items — buy, pack, load' },
  { count: 62, label: 'shot-list items for photo and video' },
  { count: 17, label: 'legal requirements, each verifiable' },
];

export function LibrarySection() {
  return (
    <section
      id="library"
      className="border-y border-stone-200/80 bg-surface px-5 py-20 sm:px-8 sm:py-24"
    >
      <div className="mx-auto max-w-[1120px]">
        <div className="mb-13 max-w-[660px]">
          <Eyebrow>The template library</Eyebrow>
          <Display>You do not start with an empty page</Display>
          <p
            data-reveal
            data-reveal-delay="120"
            className="mt-4.5 text-[17px] leading-[1.65] text-stone-600 text-pretty"
          >
            Create a wedding and it arrives already planned, from a versioned template for your
            tradition. Every line is yours to rename, re-cost or mark not applicable — and marking
            something not applicable keeps its budget on the books, so the totals still reconcile.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-stone-200/90 bg-stone-200/90 sm:grid-cols-3 lg:grid-cols-4">
          {LIBRARY.map((entry, index) => (
            <div
              key={entry.label}
              data-reveal
              data-reveal-delay={(index % 4) * 60}
              className="bg-ivory px-5.5 py-6.5"
            >
              {/* The final figure is the markup; useCountUp animates over it
                  and puts it back, so it is never wrong without JavaScript. */}
              <p
                data-count={entry.count}
                className="font-display text-[46px] leading-none text-wine-700 tabular-nums"
              >
                {entry.count}
              </p>
              <p className="mt-2 text-[13.5px] text-stone-600">{entry.label}</p>
            </div>
          ))}
        </div>

        <div data-reveal className="mt-5.5 flex flex-wrap items-center gap-2.5">
          <span className="text-[13px] text-stone-500">Templates:</span>
          <span className="rounded-full border border-gold-200 bg-white px-3 py-1.5 text-[12.5px] text-gold-700">
            Buddhist · Poruwa
          </span>
          {['Christian', 'Hindu', 'Muslim', 'Generic'].map((tradition) => (
            <span
              key={tradition}
              className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-[12.5px] text-stone-600"
            >
              {tradition}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Day-of console ─────────────────────────────────────────────────────── */

const DAY_OF_POINTS = [
  {
    icon: <Printer className="mt-0.5 size-[17px] shrink-0 text-gold-400" />,
    lead: 'A printable pack',
    body: '— timeline, vendor arrivals, contact sheet and the emergency plan, with tick-boxes for a pen.',
  },
  {
    icon: <WifiOff className="mt-0.5 size-[17px] shrink-0 text-gold-400" />,
    lead: 'Cached for offline',
    body: "— a service worker keeps the day-of screens available when the venue's wifi does not cooperate.",
  },
  {
    icon: <AlertTriangle className="mt-0.5 size-[17px] shrink-0 text-gold-400" />,
    lead: 'Clashes flagged',
    body: '— two things booked into the same twenty minutes get caught before the morning, not during it.',
  },
  {
    icon: <Phone className="mt-0.5 size-[17px] shrink-0 text-gold-400" />,
    lead: 'Every number in one place',
    body: '— pulled from the vendor records, so it is never a version behind.',
  },
];

const ARRIVALS = [
  ['05:15', 'Nayana Bridal — hair & make-up', '077 412 8890'],
  ['06:30', 'Studio Amaya — photography', '071 902 3341'],
  ['06:45', 'Sithumina Decor — poruwa load-in', '070 556 1204'],
  ['16:00', 'Beat Lounge — sound check', '076 330 7788'],
];

const CONTINGENCIES = [
  ['Rain before the poruwa', 'Move to the banquet foyer · Anushka'],
  ['Registrar delayed', 'Run the cake cut first · Coordinator'],
  ['Power cut at the venue', 'Venue generator, confirm by 10 Feb'],
];

export function DayOfSection() {
  return (
    <section className="relative overflow-hidden bg-stone-900 px-5 py-20 sm:px-8 sm:py-26">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-30 size-130 rounded-full bg-[radial-gradient(circle,rgba(176,141,87,0.22),rgba(28,25,23,0)_70%)]"
        style={{ animation: 'mh-float-b 24s ease-in-out infinite' }}
      />
      <div className="relative mx-auto grid max-w-[1120px] items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:gap-16">
        <div>
          <p
            data-reveal
            className="text-[12px] font-semibold tracking-[0.14em] text-gold-400 uppercase"
          >
            Day-of console
          </p>
          <h2
            data-reveal
            data-reveal-delay="60"
            className="mt-4 font-display text-[34px] leading-[1.08] font-normal tracking-[-0.02em] text-ivory sm:text-[42px] lg:text-[50px]"
          >
            The one screen that has to work with no signal
          </h2>
          <p
            data-reveal
            data-reveal-delay="120"
            className="mt-5 text-[16.5px] leading-[1.68] text-stone-300 text-pretty"
          >
            The coordinator is standing in a hotel corridor at seven in the morning. Whatever else
            is true, the running order, the arrival times and the phone numbers have to be in their
            hand. So the app prints a pack — the same markup as the screen, not a second copy that
            drifts.
          </p>
          <ul className="mt-7.5 flex flex-col gap-3.5">
            {DAY_OF_POINTS.map((point, index) => (
              <li
                key={point.lead}
                data-reveal
                data-reveal-delay={index * 60}
                className="flex items-start gap-3"
              >
                {point.icon}
                <span className="text-[15px] leading-[1.55] text-stone-200">
                  <strong className="font-semibold text-ivory">{point.lead}</strong> {point.body}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* The printed pack, as a sheet of paper with a shadow behind it. */}
        <div data-reveal data-reveal-delay="100" className="relative">
          <div
            aria-hidden
            className="absolute inset-y-4 -right-3.5 -bottom-3.5 left-4 rotate-2 rounded-md bg-stone-600 opacity-35"
          />
          <div
            className="relative -rotate-1 rounded-md bg-white px-7 py-7.5 shadow-[0_30px_60px_-20px_rgb(0_0_0/0.6)]"
            style={{ animation: 'mh-drift 11s ease-in-out infinite' }}
          >
            <div className="flex items-baseline justify-between border-b-2 border-stone-900 pb-2">
              <p className="font-display text-[22px] text-stone-900">Nethmi &amp; Sahan — Day pack</p>
              <p className="text-[10.5px] text-stone-600">14 Feb 2027</p>
            </div>

            <p className="mt-3.5 mb-1.5 text-[10px] font-semibold tracking-[0.08em] text-stone-600 uppercase">
              Vendor arrivals
            </p>
            <table className="w-full border-collapse text-[11.5px]">
              <tbody>
                {ARRIVALS.map(([time, who, phone]) => (
                  <tr key={who} className="border-b border-stone-200">
                    <td className="w-13 py-1 text-stone-900 tabular-nums">{time}</td>
                    <td className="py-1 text-stone-900">{who}</td>
                    <td className="py-1 text-right text-stone-600">{phone}</td>
                    <td className="w-5.5 text-right">
                      <span className="inline-block size-2.75 border border-stone-500" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="mt-4 mb-1.5 text-[10px] font-semibold tracking-[0.08em] text-stone-600 uppercase">
              If it goes wrong
            </p>
            <table className="w-full border-collapse text-[11.5px]">
              <tbody>
                {CONTINGENCIES.map(([risk, plan]) => (
                  <tr key={risk} className="border-b border-stone-200 last:border-b-0">
                    <td className="py-1 text-stone-900">{risk}</td>
                    <td className="py-1 text-right text-stone-600">{plan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Your data ───────────────────────────────────────────────────────────── */

const GUARANTEES = [
  {
    icon: <ShieldCheck className="size-[19px] text-wine-600" />,
    title: 'Enforced at the row, not the menu',
    body: 'Hiding a navigation link is a convenience. The database refuses the query regardless of what the browser asks for.',
  },
  {
    icon: <Scale className="size-[19px] text-wine-600" />,
    title: 'Money in cents, never floats',
    body: 'Rounding errors are not a cosmetic bug in a wedding budget — one wrong total costs you every other number on the screen.',
  },
  {
    icon: <Download className="size-[19px] text-wine-600" />,
    title: 'Leaving is one click',
    body: 'Export the whole wedding to a workbook whenever you like. The export is in the navigation because a couple who can see it believe they can leave.',
  },
];

export function SecuritySection() {
  return (
    <section className="px-5 py-20 sm:px-8 sm:py-26">
      <div className="mx-auto max-w-[1120px]">
        <div className="mb-11 max-w-[640px]">
          <Eyebrow>Your data</Eyebrow>
          <Display>Separation you can check, not just trust</Display>
          <p
            data-reveal
            data-reveal-delay="120"
            className="mt-4.5 text-[17px] leading-[1.65] text-stone-600 text-pretty"
          >
            One wedding cannot see another's rows. That boundary is a database policy on every
            single table, written against 266 assertions that test it from the outside — as a
            member of the wrong wedding, as a coordinator reaching for money, as an anonymous
            request with a guessed identifier.
          </p>
        </div>

        <div className="grid gap-4.5 sm:grid-cols-2 lg:grid-cols-3">
          {GUARANTEES.map((item, index) => (
            <div
              key={item.title}
              data-reveal
              data-reveal-delay={index * 60}
              className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-card"
            >
              {item.icon}
              <h3 className="mt-3.5 text-[15.5px] font-semibold text-stone-900">{item.title}</h3>
              <p className="mt-2 text-[14px] leading-[1.6] text-stone-600">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
