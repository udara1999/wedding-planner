import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarClock,
  ClipboardCheck,
  Flower2,
  Printer,
  UsersRound,
  Wallet,
} from 'lucide-react';
import { useHead } from '../../lib/head';
import { Badge, Button, Card, CardBody, cn } from '../../components/ui';

/**
 * The only public page in the app, and therefore the only one SEO applies to.
 *
 * `/` used to redirect an unauthenticated visitor straight to /signin, which
 * meant there was nothing to rank and nothing to share — a sign-in form is not
 * a landing page and no crawler will treat it as one.
 *
 * The copy targets the niche rather than the category. "Wedding planner" is
 * unwinnable and would bring the wrong visitor anyway; "poruwa running order"
 * and "Sri Lankan wedding budget" describe what this actually does, and the
 * headings say so in the words somebody would search with. The FAQ below
 * mirrors the FAQPage JSON-LD in index.html — the same four questions, so the
 * structured data describes content that is genuinely on the page rather than
 * markup asserting things a visitor cannot see.
 */
export function LandingPage() {
  useHead({
    title: 'Sri Lankan Wedding Planner — budget, guests, RSVPs and the day itself',
    description:
      'Plan a Sri Lankan wedding in one place: a poruwa checklist, a budget that tracks quoted against actual, guest lists with RSVP links, vendor comparisons, and a day-of pack you can print and run without a signal.',
    index: true,
    exact: true,
  });

  return (
    <div className="min-h-full bg-ivory">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(60rem_40rem_at_50%_-20%,var(--color-wine-100),transparent)] opacity-70"
      />

      <div className="relative mx-auto w-full max-w-5xl px-4 pt-10 pb-16 sm:px-8 sm:pt-16">
        <header className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl bg-wine-700 text-white">
              <Flower2 className="size-4" />
            </span>
            <span className="text-sm font-semibold tracking-tight text-stone-900">
              Wedding Planner
            </span>
          </span>
          <Link
            to="/signin"
            className="focus-ring rounded-lg px-3 py-2 text-sm font-medium text-wine-700 hover:text-wine-800"
          >
            Sign in
          </Link>
        </header>

        <main>
          <section className="pt-12 sm:pt-20">
            <Badge tone="gold">Built for a poruwa wedding</Badge>
            <h1 className="mt-4 max-w-3xl text-3xl leading-tight font-semibold tracking-tight text-stone-900 sm:text-5xl">
              Plan a Sri Lankan wedding without twenty-seven spreadsheet tabs
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-stone-600 sm:text-lg">
              A poruwa checklist that knows the running order, a budget that tracks what you were
              quoted against what you actually paid, RSVP links for every household, and a day-of
              pack you can print and hand to your coordinator.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link to="/signin">
                <Button size="lg" icon={<ArrowRight className="size-4" />}>
                  Start planning
                </Button>
              </Link>
              <p className="text-sm text-stone-500">
                Free while your wedding is more than 30 days away.
              </p>
            </div>
          </section>

          <section aria-labelledby="what-it-does" className="pt-16 sm:pt-24">
            <h2
              id="what-it-does"
              className="text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl"
            >
              Everything a Sri Lankan wedding actually needs
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-stone-600">
              It arrives filled in — the ceremony components, the tasks, the packing list — because
              a blank planner is just a spreadsheet with rounder corners.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Feature
                icon={<Flower2 className="size-4" />}
                title="The poruwa, in order"
                body="Twenty-four components from the Hewisi drummers to the coconut being split, with durations that add up. Switch off what you are not having and the running time follows."
              />
              <Feature
                icon={<Wallet className="size-4" />}
                title="A budget that tells the truth"
                body="Budgeted, quoted, negotiated and actual on every line, with the forecast taking whichever is most real. Overpayments show up instead of hiding at zero."
              />
              <Feature
                icon={<UsersRound className="size-4" />}
                title="Guests by household"
                body="One row per household with adults and children counted, the way invitations actually work. Every household gets a private RSVP link to answer on their phone."
              />
              <Feature
                icon={<ClipboardCheck className="size-4" />}
                title="Vendors, compared properly"
                body="227 questions across 16 categories, so the photographer you pick is the one who answered about the second shooter and the raw files."
              />
              <Feature
                icon={<CalendarClock className="size-4" />}
                title="A timeline that moves"
                body="Set your ceremony time and the whole day shifts to fit. Move the nekath and every task, deadline and appointment re-dates in one go."
              />
              <Feature
                icon={<Printer className="size-4" />}
                title="A day that survives no signal"
                body="Print the pack: running order, vendor arrivals, who to phone, seating, and what is in the bags. The venue's reception is not a dependency."
              />
            </div>
          </section>

          <section aria-labelledby="faq" className="pt-16 sm:pt-24">
            <h2
              id="faq"
              className="text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl"
            >
              Questions people ask first
            </h2>
            {/* Kept in step with the FAQPage JSON-LD in index.html. Structured
                data describing answers a visitor cannot read is the kind of
                thing that earns a manual action. */}
            <dl className="mt-6 max-w-3xl space-y-5">
              <Faq q="Does it cover a poruwa ceremony?">
                Yes. It starts with the full poruwa running order — 24 components from the Hewisi
                drummers to the coconut being split — with durations that add up, and each one can
                be switched off if you are not having it. The registration checklist follows the Sri
                Lankan registrar's requirements, and every item is marked to confirm with your own
                registrar rather than stated as fact.
              </Faq>
              <Faq q="How do guests reply?">
                Each household gets a private link with no login. They see who is invited, how many
                places are reserved, and answer on their phone. You can send it on WhatsApp with one
                tap. Replies update your headcount, your seating and the number you give the
                caterer.
              </Faq>
              <Faq q="What happens on the day if there is no signal?">
                You print the day-of pack beforehand: the running order, when each vendor arrives,
                who to phone, the seating plan and what is in the bags. The app also installs to
                your phone and keeps a copy of the pack readable offline, but the printed version is
                the one to rely on.
              </Faq>
              <Faq q="Can I get my data out?">
                Yes, in one click, as a spreadsheet with the same sheets a wedding workbook has —
                budget, payments, guests, timeline. It is built in your browser, so nothing is
                uploaded to produce it.
              </Faq>
            </dl>
          </section>

          <section className="pt-16 sm:pt-24">
            <Card className="bg-white/80">
              <CardBody className="flex flex-wrap items-center justify-between gap-4 py-7">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold tracking-tight text-stone-900">
                    Start with the ceremony, not a blank page
                  </h2>
                  <p className="mt-1 text-sm text-stone-600">
                    Create a wedding and it comes with the checklist already in it.
                  </p>
                </div>
                <Link to="/signin">
                  <Button icon={<ArrowRight className="size-4" />}>Start planning</Button>
                </Link>
              </CardBody>
            </Card>
          </section>
        </main>

        <footer className="mt-16 border-t border-stone-200 pt-6 text-xs text-stone-500">
          <p>
            Built around the poruwa tradition. Registration requirements are things to confirm with
            your registrar, never advice from this app.
          </p>
        </footer>
      </div>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <Card className="bg-white/80">
      <CardBody className="pt-5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-wine-50 text-wine-700 ring-1 ring-wine-100">
          {icon}
        </span>
        {/* h3 under the section's h2: a flat heading structure is one of the
            few things a crawler reads as strongly as the copy itself. */}
        <h3 className="mt-3 text-sm font-semibold text-stone-900">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{body}</p>
      </CardBody>
    </Card>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className={cn('border-b border-stone-200 pb-5 last:border-0')}>
      <dt className="text-sm font-semibold text-stone-900">{q}</dt>
      <dd className="mt-1.5 text-sm leading-relaxed text-stone-600">{children}</dd>
    </div>
  );
}
