import { Plus } from 'lucide-react';

/**
 * The five questions, and the answers index.html declares in its FAQPage
 * structured data.
 *
 * KEEP THIS IN STEP WITH THE JSON-LD. Google treats structured data that
 * describes content a visitor cannot read as spam, and it is a manual action
 * rather than a ranking nudge. src/prerender.test.tsx compares the two in
 * full, so a drifting answer fails the build rather than quietly shipping.
 */
const QUESTIONS = [
  {
    q: 'Is it only for Sri Lankan weddings?',
    a: 'No. The Buddhist Poruwa template is the most complete one because that is where the content came from, but Christian, Hindu, Muslim and generic templates use the same engine. The tradition is data, not code.',
  },
  {
    q: 'Can I bring my existing spreadsheet in?',
    a: 'Guests import from CSV today. For the budget, most couples find the template already covers what their sheet had, and renaming lines is quicker than mapping columns.',
  },
  {
    q: 'What if we change the wedding date?',
    a: 'Every task, appointment and countdown item is stored as an offset from the wedding day rather than as a fixed date. Change the date in Setup and the whole plan moves with it. Anything you dated by hand stays where you put it.',
  },
  {
    q: 'Can our coordinator really not see the money?',
    a: 'Correct. Financial tables return no rows at all for the coordinator role — not blurred, not hidden in the interface, simply not sent. Screens that mix money with operations use a separate operations-facing view.',
  },
  {
    q: 'How many guests can it handle?',
    a: 'Guests are grouped by household, and each household gets one RSVP link. A thousand-guest list is a few hundred links, which is well within what the RSVP endpoint is rate-limited for.',
  },
];

/**
 * Built on <details>, not on React state.
 *
 * The design animates a max-height between 0 and 260px, which needs
 * JavaScript to toggle. This page is prerendered precisely so it works before
 * — or without — the bundle, and a JavaScript accordion on a prerendered page
 * means a visitor with no JavaScript sees five questions and no answers. A
 * <details> element opens on its own, is keyboard-operable and announces its
 * state without an aria attribute in sight.
 *
 * The shared `name` makes it an exclusive accordion, matching the design's
 * one-open-at-a-time behaviour. Browsers that do not support it yet simply let
 * you open more than one, which is not a failure worth code to prevent.
 *
 * Deliberately not a <dl>, which the first draft used: a definition list may
 * only contain dt, dd and div, so <details> inside one is invalid markup, and
 * a <dt> inside a <summary> is invalid twice over. The question is the
 * summary — that is what the element is for.
 */
export function FaqSection() {
  return (
    <section id="faq" className="px-5 pb-20 sm:px-8 sm:pb-26">
      <div className="mx-auto max-w-[820px]">
        <h2
          data-reveal
          className="mb-9 text-center font-display text-[32px] leading-[1.1] font-normal tracking-[-0.02em] text-stone-900 sm:text-[40px] lg:text-[46px]"
        >
          Questions
        </h2>

        <div className="flex flex-col gap-2.5">
          {QUESTIONS.map(({ q, a }) => (
            <details
              key={q}
              name="mh-faq"
              className="group overflow-hidden rounded-xl border border-stone-200/80 bg-white shadow-card"
            >
              <summary className="flex list-none items-center justify-between gap-4 px-5.5 py-4.5 text-[15.5px] font-medium text-stone-900 [&::-webkit-details-marker]:hidden">
                <span>{q}</span>
                <Plus className="size-4 shrink-0 text-wine-600 transition-transform duration-300 group-open:rotate-45" />
              </summary>
              <p className="px-5.5 pb-5 text-[14.5px] leading-[1.65] text-stone-600">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
