import { Fragment } from 'react';
import {
  AlertTriangle,
  Armchair,
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Gift,
  HandCoins,
  Hourglass,
  LayoutDashboard,
  ListChecks,
  Loader2,
  Lock,
  Plus,
  Printer,
  Search,
  Settings,
  Store,
  TrendingUp,
  Truck,
  UsersRound,
  Wallet,
} from 'lucide-react';
import { cn } from '../../../components/ui';
import { APP_WIDTH, SCREENS, type Screen } from './screens';

/**
 * A picture of the app, built in markup rather than captured as a screenshot.
 *
 * Why not a screenshot: it would be a second copy of the interface, it would
 * be a bitmap in a page that is otherwise text, and it would go stale the
 * first time a screen changed. This is the same tokens the app itself uses, so
 * when the palette moves the product shot moves with it.
 *
 * NOTHING IN HERE IS A HEADING. The screens have titles — "Budget", "Compare
 * vendors" — and in the app those are h1s. Here they are paragraphs, because
 * this is a picture of a page inside a page: real heading tags would give the
 * landing page five h1s and bury its actual outline. The design's own markup
 * used h1/h2/h3 throughout; this is the one place the port departs from it,
 * deliberately.
 *
 * The figures are illustrative — Nethmi & Sahan are not real, and the numbers
 * are a consistent worked example rather than anyone's wedding.
 */

type Tone = 'wine' | 'gold' | 'red' | 'emerald' | 'amber' | 'stone';

const TONES: Record<Tone, string> = {
  wine: 'bg-wine-50 text-wine-700 ring-wine-200',
  gold: 'bg-gold-50 text-gold-700 ring-gold-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  stone: 'bg-stone-50 text-stone-600 ring-stone-200',
};

/** The app's own badge, at the mock's smaller scale. */
function Pill({ tone = 'stone', children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-1.5 py-px text-[11px] font-medium ring-1 ring-inset',
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

function Metric({
  icon,
  label,
  value,
  note,
  valueClass = 'text-stone-900',
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  note?: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl border border-stone-200/80 bg-white px-3.5 py-2.5 shadow-card">
      <div className="flex items-center gap-1.5 text-[12px] font-medium text-stone-500">
        {icon}
        {label}
      </div>
      <p
        className={cn(
          'mt-0.5 text-[22px] leading-[1.15] font-semibold tracking-[-0.02em] tabular-nums',
          valueClass,
        )}
      >
        {value}
      </p>
      {note && <p className="mt-px text-[12px] text-stone-500">{note}</p>}
    </div>
  );
}

function PanelHead({
  title,
  pill,
  link,
}: {
  title: string;
  pill?: React.ReactNode;
  link: string;
}) {
  return (
    <div className="flex items-center gap-2.5 px-4 pt-3 pb-2">
      <p className="text-[13.5px] font-semibold tracking-[-0.01em] text-stone-900">{title}</p>
      {pill}
      <span className="ml-auto flex items-center gap-1 text-[12px] text-wine-700">
        {link} <ArrowRight className="size-[11px]" />
      </span>
    </div>
  );
}

/* ── The window: chrome, sidebar, and whichever screen is active ─────────── */

const SIDEBAR_GROUPS: { label: string; items: { icon: React.ReactNode; name: string; screen?: Screen }[] }[] = [
  {
    label: 'Plan',
    items: [
      { icon: <LayoutDashboard className="size-3.5" />, name: 'Dashboard', screen: 'dashboard' },
      { icon: <Settings className="size-3.5" />, name: 'Setup' },
      { icon: <ListChecks className="size-3.5" />, name: 'Tasks' },
      { icon: <Hourglass className="size-3.5" />, name: 'Countdown' },
    ],
  },
  {
    label: 'Vendors & money',
    items: [
      { icon: <Store className="size-3.5" />, name: 'Vendors' },
      { icon: <ClipboardList className="size-3.5" />, name: 'Compare vendors', screen: 'compare' },
      { icon: <Wallet className="size-3.5" />, name: 'Budget', screen: 'budget' },
      { icon: <CreditCard className="size-3.5" />, name: 'Payments' },
      { icon: <HandCoins className="size-3.5" />, name: 'Contributions' },
      { icon: <Gift className="size-3.5" />, name: 'Gifts' },
    ],
  },
  {
    label: 'People',
    items: [
      { icon: <UsersRound className="size-3.5" />, name: 'Guests' },
      { icon: <Armchair className="size-3.5" />, name: 'Seating' },
    ],
  },
  {
    label: 'The day',
    items: [
      { icon: <CalendarClock className="size-3.5" />, name: 'Day timeline', screen: 'timeline' },
      { icon: <Truck className="size-3.5" />, name: 'Vendor arrivals' },
      { icon: <Printer className="size-3.5" />, name: 'Print the pack' },
    ],
  },
];

export function AppMock({ screen, onPick }: { screen: Screen; onPick: (screen: Screen) => void }) {
  const path = SCREENS.find((s) => s.id === screen)?.path ?? '';

  return (
    <div className="flex flex-col bg-ivory" style={{ width: APP_WIDTH }}>
      {/* browser chrome */}
      <div className="flex items-center gap-3.5 border-b border-stone-200/90 bg-surface px-3.5 py-2.5">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-wine-300" />
          <span className="size-2.5 rounded-full bg-gold-200" />
          <span className="size-2.5 rounded-full bg-stone-300" />
        </div>
        <div className="flex h-[26px] flex-1 items-center gap-[7px] rounded-full border border-stone-200 bg-white px-2.5 text-[12px] text-stone-500">
          <Lock className="size-2.5 text-stone-400" />
          app.mangalahub.lk/w/nethmi-sahan{path}
        </div>
        <div className="flex gap-1">
          {SCREENS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onPick(s.id)}
              className={cn(
                'h-6 rounded-[7px] px-2.5 text-[12px] transition-colors hover:bg-stone-200',
                s.id === screen ? 'bg-white text-stone-800 shadow-card' : 'text-stone-600',
              )}
            >
              {s.id === 'dashboard'
                ? 'Dashboard'
                : s.id === 'budget'
                  ? 'Budget'
                  : s.id === 'compare'
                    ? 'Compare'
                    : 'The day'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex h-[668px] bg-ivory">
        {/* the sidebar, as WeddingLayout renders it */}
        <aside className="flex w-64 shrink-0 flex-col overflow-hidden border-r border-stone-200/80 bg-white">
          <div className="px-3.5 pt-3.5 pb-2.5">
            <span className="text-[11px] font-medium text-stone-500">All weddings</span>
            <p className="mt-0.5 text-[14px] leading-[1.3] font-semibold tracking-[-0.01em] text-stone-900">
              Nethmi &amp; Sahan
            </p>
          </div>
          <div className="mx-3.5 mb-3 flex items-center gap-2 rounded-lg bg-stone-50 px-2.5 py-[7px]">
            <Pill tone="gold">owner</Pill>
            <span className="text-[11px] text-stone-500 tabular-nums">163 days to go</span>
          </div>
          <nav className="flex-1 overflow-hidden px-2">
            {SIDEBAR_GROUPS.map((group) => (
              <div key={group.label} className="mb-3.5 last:mb-0">
                <p className="mb-1 px-2.5 text-[10px] font-semibold tracking-[0.09em] text-stone-500 uppercase">
                  {group.label}
                </p>
                {group.items.map((item) => {
                  const active = item.screen === screen;
                  return (
                    <div
                      key={item.name}
                      className={cn(
                        'flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13.5px] transition-colors duration-300',
                        active
                          ? 'bg-wine-50 font-medium text-wine-800 [&_svg]:text-wine-600'
                          : 'text-stone-600 [&_svg]:text-stone-500',
                      )}
                    >
                      {item.icon}
                      <span>{item.name}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </nav>
        </aside>

        <div className="relative min-w-0 flex-1">
          {screen === 'dashboard' && <DashboardScreen />}
          {screen === 'budget' && <BudgetScreen />}
          {screen === 'compare' && <CompareScreen />}
          {screen === 'timeline' && <TimelineScreen />}
        </div>
      </div>
    </div>
  );
}

/** Each screen fills the frame and fades in, as the design's mh-fade does. */
function ScreenShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="absolute inset-0 overflow-hidden px-5.5 py-4.5"
      style={{ animation: 'mh-fade .5s ease both' }}
    >
      {children}
    </div>
  );
}

/* ── 01 Dashboard ────────────────────────────────────────────────────────── */

function DashboardScreen() {
  return (
    <ScreenShell>
      <div className="mb-4.5 flex items-start justify-between gap-4">
        <div>
          <p className="text-[20px] font-semibold tracking-[-0.02em] text-stone-900">
            Nethmi &amp; Sahan
          </p>
          <p className="mt-1 text-[14px] text-stone-500">Saturday, 14 February 2027</p>
        </div>
        <div className="rounded-xl border border-wine-200 bg-wine-50 px-4 py-2 text-center">
          <p className="text-[22px] leading-none font-semibold text-wine-800 tabular-nums">163</p>
          <p className="mt-[3px] text-[11px] font-medium text-wine-700">days to go</p>
        </div>
      </div>

      {/* AlertsPanel: the dashboard opens on whatever is wrong, not on a chart */}
      <div className="mb-4 rounded-xl border border-red-200 bg-white shadow-card">
        <div className="flex items-center justify-between gap-3 px-4.5 pt-3 pb-2">
          <p className="text-[14px] font-semibold tracking-[-0.01em] text-stone-900">
            Needs your attention
          </p>
          <div className="flex items-center gap-2.5">
            <span className="text-[12px] text-stone-500 tabular-nums">2 of 19 checks</span>
            <span className="text-[12px] text-wine-700 underline underline-offset-2">
              Show every check
            </span>
          </div>
        </div>
        <div className="px-4.5 pb-4">
          <p className="mb-1.5 flex items-center gap-2">
            <Pill tone="red">Critical</Pill>
          </p>
          <ul className="overflow-hidden rounded-xl border border-stone-200">
            <li className="flex items-center gap-3 border-b border-stone-100 px-3.5 py-2.5">
              <span
                className="flex size-6.5 shrink-0 items-center justify-center rounded-full bg-red-50 text-[11px] font-semibold text-red-700 tabular-nums"
                style={{ animation: 'mh-pulse 2.6s ease-out infinite' }}
              >
                3
              </span>
              <span className="flex-1 text-[14px] text-stone-800">payments are overdue</span>
              <ChevronRight className="size-3.5 text-stone-500" />
            </li>
            <li className="flex items-center gap-3 px-3.5 py-2.5">
              <span className="flex size-6.5 shrink-0 items-center justify-center rounded-full bg-red-50 text-[11px] font-semibold text-red-700 tabular-nums">
                7
              </span>
              <span className="flex-1 text-[14px] text-stone-800">
                budget lines forecast over what was budgeted for them
              </span>
              <ChevronRight className="size-3.5 text-stone-500" />
            </li>
          </ul>
        </div>
      </div>

      <div className="mb-3.5 grid grid-cols-4 gap-3">
        <Metric
          icon={<UsersRound className="size-[13px]" />}
          label="Guests invited"
          value="412"
          note="268 confirmed so far"
        />
        <Metric label="Replies in" value="74%" note="107 still to answer" />
        <Metric label="Tasks done" value="61%" note="57 of 93" />
        <Metric icon={<Store className="size-[13px]" />} label="Vendors confirmed" value="9 of 14" />
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <Metric
          icon={<Wallet className="size-[13px]" />}
          label="Total budget (LKR)"
          value="4,800,000"
        />
        <Metric
          icon={<TrendingUp className="size-[13px]" />}
          label="Forecast final cost (LKR)"
          value="5,120,400"
          note="107% of budget"
          valueClass="text-wine-700"
        />
        <Metric label="Over budget (LKR)" value="320,400" valueClass="text-red-700" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-stone-200/80 bg-white shadow-card">
          <PanelHead
            title="Where the money is going"
            pill={<Pill tone="red">107% of budget</Pill>}
            link="Budget"
          />
          <div className="px-4 pb-3.5">
            <ul className="flex flex-col gap-2.5">
              <MoneyBar name="Venue & Reception" amount="1,640,000" budgeted="100%" forecast="100%" paid="62%" over={false} />
              <MoneyBar name="Photography & Video" amount="720,000" budgeted="40%" forecast="44%" paid="18%" over />
              <MoneyBar name="Attire & Jewellery" amount="610,000" budgeted="34%" forecast="37%" paid="23%" over />
            </ul>
            <div className="mt-2.5 flex flex-wrap gap-2.5 border-t border-stone-100 pt-2 text-[11px] text-stone-500">
              <Legend swatch="bg-stone-200">budgeted</Legend>
              <Legend swatch="bg-wine-300">forecast</Legend>
              <Legend swatch="bg-wine-700">paid</Legend>
              <Legend swatch="bg-red-400">over its budget</Legend>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-stone-200/80 bg-white shadow-card">
          <PanelHead title="Readiness" pill={<Pill>61%</Pill>} link="Tasks" />
          <div className="px-4 pb-3.5">
            <ul className="flex flex-col gap-2.5">
              <li>
                <div className="flex items-baseline justify-between gap-2 text-[12px]">
                  <span className="text-stone-600">Day-of operations</span>
                  <span className="flex items-center gap-1.5">
                    <Pill tone="red">3 late</Pill>
                    <span className="text-stone-500 tabular-nums">12%</span>
                  </span>
                </div>
                <Track><span className="block h-full w-[12%] rounded-full bg-amber-500" /></Track>
              </li>
              <li>
                <div className="flex items-baseline justify-between gap-2 text-[12px]">
                  <span className="text-stone-600">Attire &amp; jewellery</span>
                  <span className="text-stone-500 tabular-nums">40%</span>
                </div>
                <Track><span className="block h-full w-[40%] rounded-full bg-wine-500" /></Track>
              </li>
              <li>
                <div className="flex items-baseline justify-between gap-2 text-[12px]">
                  <span className="text-stone-600">Ceremony &amp; legal</span>
                  <span className="text-stone-500 tabular-nums">92%</span>
                </div>
                <Track><span className="block h-full w-[92%] rounded-full bg-emerald-500" /></Track>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </ScreenShell>
  );
}

function Track({ children }: { children: React.ReactNode }) {
  return <div className="mt-1 h-[7px] w-full overflow-hidden rounded-full bg-stone-100">{children}</div>;
}

function Legend({ swatch, children }: { swatch: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('size-[7px] rounded-full', swatch)} />
      {children}
    </span>
  );
}

/**
 * One category's bar: budgeted underneath, forecast over it, paid on top. Three
 * layers rather than three bars, because what matters is the comparison.
 */
function MoneyBar({
  name,
  amount,
  budgeted,
  forecast,
  paid,
  over,
}: {
  name: string;
  amount: string;
  budgeted: string;
  forecast: string;
  paid: string;
  over: boolean;
}) {
  return (
    <li>
      <div className="flex items-baseline justify-between gap-2 text-[12px]">
        <span className="text-stone-600">{name}</span>
        <span className="text-stone-500 tabular-nums">{amount}</span>
      </div>
      <div className="relative mt-1 h-[7px] w-full overflow-hidden rounded-full bg-stone-100">
        <span className="absolute inset-y-0 left-0 rounded-full bg-stone-200" style={{ width: budgeted }} />
        <span
          className={cn('absolute inset-y-0 left-0 rounded-full', over ? 'bg-red-400' : 'bg-wine-300')}
          style={{ width: forecast }}
        />
        <span className="absolute inset-y-0 left-0 rounded-full bg-wine-700" style={{ width: paid }} />
      </div>
    </li>
  );
}

/* ── 02 Budget ───────────────────────────────────────────────────────────── */

const BUDGET_CATEGORIES = [
  ['Venue & Reception', '1,640,000'],
  ['Photography & Video', '720,000'],
  ['Attire & Jewellery', '610,000'],
  ['Food & Beverage', '580,000'],
  ['Decor & Flowers', '430,000'],
  ['Music & Entertainment', '290,000'],
  ['Transport & Stay', '180,000'],
  ['Ceremony & Legal', '95,000'],
];

const BUDGET_LINES: {
  name: string;
  code: string;
  owner: string;
  status?: { tone: Tone; text: string };
  actual: string;
  budget: string;
  applicability: 'Req' | 'Opt' | 'N/A';
  struck?: boolean;
}[] = [
  {
    name: 'Bridal saree — Kandyan osari',
    code: 'BG077',
    owner: "bride's family",
    status: { tone: 'amber', text: 'payment due' },
    actual: '385,000',
    budget: '350,000',
    applicability: 'Req',
  },
  {
    name: 'Photography — full day + drone',
    code: 'BG103',
    owner: 'couple',
    status: { tone: 'wine', text: 'deposit paid · 312,000 to go' },
    actual: '420,000',
    budget: '380,000',
    applicability: 'Req',
  },
  {
    name: 'Poruwa ceremony platform & decor',
    code: 'BG012',
    owner: "bride's family",
    status: { tone: 'emerald', text: 'paid · final' },
    actual: '145,000',
    budget: '140,000',
    applicability: 'Req',
  },
  {
    name: 'Reception hall — Grand Ballroom',
    code: 'BG001',
    owner: "groom's family",
    status: { tone: 'red', text: 'payment overdue' },
    actual: '1,240,000',
    budget: '1,200,000',
    applicability: 'Req',
  },
  {
    name: 'Live band — second session',
    code: 'BG158',
    owner: 'couple',
    actual: '0',
    budget: '120,000',
    applicability: 'N/A',
    struck: true,
  },
  {
    name: 'Bridal jewellery — rented set',
    code: 'BG081',
    owner: "bride's family",
    status: { tone: 'gold', text: 'due within a month' },
    actual: '225,000',
    budget: '260,000',
    applicability: 'Req',
  },
  {
    name: 'Catering — dinner, 412 covers',
    code: 'BG044',
    owner: "groom's family",
    status: { tone: 'wine', text: 'advance paid · 486,000 to go' },
    actual: '742,000',
    budget: '700,000',
    applicability: 'Req',
  },
];

function BudgetScreen() {
  return (
    <ScreenShell>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[20px] font-semibold tracking-[-0.02em] text-stone-900">Budget</p>
          <p className="mt-1 max-w-[520px] text-[13.5px] leading-[1.55] text-stone-500">
            Forecast is worked out by the database — actual, else negotiated, else quoted, else
            budgeted. A line marked not applicable forecasts nothing but keeps its budget.
          </p>
        </div>
        <span className="inline-flex h-8.5 items-center gap-1.5 rounded-lg bg-wine-700 px-3.5 text-[14px] font-medium text-white shadow-card">
          <Plus className="size-3.5" />
          Add line
        </span>
      </div>

      <div className="mb-4.5 grid grid-cols-3 gap-3">
        <Metric
          icon={<Wallet className="size-[13px]" />}
          label="Budgeted (LKR)"
          value="4,800,000"
          note="194 lines in view"
        />
        <Metric
          label="Forecast (LKR)"
          value="5,120,400"
          note="11 not applicable, excluded"
          valueClass="text-wine-700"
        />
        <Metric
          label="Variance (LKR)"
          value="320,400"
          note="Forecast is over budget"
          valueClass="text-red-700"
        />
      </div>

      <div className="grid grid-cols-[196px_minmax(0,1fr)] items-start gap-4">
        <div className="rounded-xl border border-stone-200/80 bg-white px-3.5 py-3 shadow-card">
          <div className="flex items-baseline justify-between gap-2 rounded-lg bg-wine-50 px-2 py-[5px]">
            <span className="text-[13.5px] font-medium text-wine-800">All categories</span>
            <span className="text-[12px] text-stone-500 tabular-nums">194</span>
          </div>
          <div className="mt-1 flex flex-col gap-px">
            {BUDGET_CATEGORIES.map(([name, forecast]) => (
              <div key={name} className="px-2 py-[5px]">
                <span className="block text-[12px] text-stone-700">{name}</span>
                <span className="block text-[11px] text-stone-500 tabular-nums">
                  {forecast} forecast
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-stone-200/80 bg-white shadow-card">
          <div className="flex items-center gap-2 border-b border-stone-100 px-3.5 py-2.5">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-stone-500" />
              <div className="flex h-8.5 w-full items-center rounded-lg border border-stone-200 bg-white pr-3 pl-8.5 text-[14px] text-stone-500 shadow-card">
                Search a line name or code, e.g. necklace or BG077
              </div>
            </div>
            <div className="flex h-8.5 w-[150px] items-center justify-between rounded-lg border border-stone-200 bg-white px-2.5 text-[14px] text-stone-800 shadow-card">
              Any applicability <ChevronDown className="size-[13px] text-stone-500" />
            </div>
          </div>

          <ul>
            {BUDGET_LINES.map((line) => (
              <li
                key={line.code}
                className="flex items-center gap-3 border-b border-stone-100 px-3.5 py-2 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'text-[14px]',
                      line.struck
                        ? 'text-stone-500 line-through decoration-stone-300'
                        : 'text-stone-900',
                    )}
                  >
                    {line.name}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-stone-500">
                    <span className="font-mono text-[11px]">{line.code}</span>
                    <span>· {line.owner}</span>
                    {line.status && <Pill tone={line.status.tone}>{line.status.text}</Pill>}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={cn(
                      'text-[14px] tabular-nums',
                      line.struck ? 'text-stone-500' : 'text-stone-900',
                    )}
                  >
                    {line.actual}
                  </p>
                  <p className="mt-px text-[11px] text-stone-500 tabular-nums">
                    of {line.budget} LKR
                  </p>
                </div>
                <div className="flex shrink-0 gap-0.5 rounded-lg bg-stone-100 p-0.5">
                  {(['Req', 'Opt', 'N/A'] as const).map((option) => (
                    <span
                      key={option}
                      className={cn(
                        'px-2 py-[3px] text-[11px]',
                        option === line.applicability
                          ? 'rounded-[7px] bg-white font-medium text-stone-800 shadow-card'
                          : 'text-stone-500',
                      )}
                    >
                      {option}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ScreenShell>
  );
}

/* ── 03 Compare ──────────────────────────────────────────────────────────── */

const COMPARE_GROUPS: {
  label: string;
  className: string;
  rows: { question: string; answers: (string | { text: string; tone: 'bad' | 'muted' | 'saving' })[] }[];
}[] = [
  {
    label: 'Money',
    className: 'bg-wine-50 text-wine-800',
    rows: [
      {
        question: 'What is the total price, all in?',
        answers: ['LKR 420,000', 'LKR 365,000', 'LKR 398,000'],
      },
      {
        question: 'What is payable as a deposit, and when?',
        answers: ['30% on booking', '50% on booking', { text: '25%, 60 days out', tone: 'saving' }],
      },
      {
        question: 'What happens to the deposit if we postpone?',
        answers: [
          'Transferable once, 6 months',
          { text: 'Non-refundable', tone: 'bad' },
          'Transferable, no limit',
        ],
      },
    ],
  },
  {
    label: "What's included",
    className: 'bg-emerald-50 text-emerald-800',
    rows: [
      {
        question: 'How many hours of coverage?',
        answers: ['12 hours', '8 hours', 'Unlimited, one day'],
      },
      {
        question: 'How many edited photographs?',
        answers: ['600 edited', '300 edited', { text: 'Not answered yet', tone: 'muted' }],
      },
    ],
  },
  {
    label: 'Logistics',
    className: 'bg-stone-100 text-stone-700',
    rows: [
      {
        question: 'What time do you arrive, and where?',
        answers: ["06:30, bride's home", '08:00, venue', "07:00, bride's home"],
      },
    ],
  },
  {
    label: 'Risk',
    className: 'bg-amber-50 text-amber-800',
    rows: [
      {
        question: 'What if the assigned photographer is ill?',
        answers: [
          'Named backup in contract',
          { text: 'No answer given', tone: 'bad' },
          'Two-person team always',
        ],
      },
    ],
  },
];

function CompareScreen() {
  return (
    <ScreenShell>
      <div className="mb-4">
        <p className="text-[20px] font-semibold tracking-[-0.02em] text-stone-900">
          Compare vendors
        </p>
        <p className="mt-1 max-w-[560px] text-[13.5px] leading-[1.55] text-stone-500">
          Photography &amp; Video · 14 of the 227 questions apply to this category. Money first,
          because a quote you cannot compare is worthless.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-stone-200/80 bg-white shadow-card">
        <table className="w-full border-collapse text-[14px]">
          <thead>
            <tr>
              <th className="w-[236px] border-b border-stone-200 bg-white px-3.5 py-2.5 text-left text-[11px] font-semibold tracking-[0.08em] text-stone-500 uppercase">
                Question
              </th>
              {[
                ['Gold package', 'Studio Amaya'],
                ['Silver + drone', 'Chathu Weddings'],
                ['Full day', 'Lensfolk'],
              ].map(([name, vendor]) => (
                <th
                  key={name}
                  className="border-b border-l border-stone-200 bg-white px-3 py-1.5 text-left align-bottom"
                >
                  <p className="text-[13.5px] font-semibold text-stone-900">{name}</p>
                  <p className="mt-px text-[12px] font-normal text-stone-500">{vendor}</p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARE_GROUPS.map((group) => (
              <Fragment key={group.label}>
                <tr>
                  <td
                    colSpan={4}
                    className={cn(
                      'px-3.5 py-1 text-[11px] font-semibold tracking-[0.08em] uppercase',
                      group.className,
                    )}
                  >
                    {group.label}
                  </td>
                </tr>
                {group.rows.map((row) => (
                  <tr key={row.question}>
                    <td className="border-b border-stone-100 px-3.5 py-1.5 text-stone-700">
                      {row.question}
                    </td>
                    {row.answers.map((answer, index) => {
                      const text = typeof answer === 'string' ? answer : answer.text;
                      const tone = typeof answer === 'string' ? undefined : answer.tone;
                      return (
                        <td
                          key={index}
                          className={cn(
                            'relative border-b border-l border-stone-100 px-3 py-1.5',
                            tone === 'bad'
                              ? 'text-red-700'
                              : tone === 'muted'
                                ? 'text-stone-500'
                                : 'text-stone-900',
                            text.startsWith('LKR') && 'tabular-nums',
                          )}
                        >
                          {text}
                          {tone === 'saving' && (
                            <span className="absolute top-1/2 right-2.5 inline-flex -translate-y-1/2 items-center gap-1 text-[10px] text-stone-500">
                              <Loader2
                                className="size-2.5"
                                style={{ animation: 'mh-spin 1s linear infinite' }}
                              />
                              saving
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-gold-50 px-3.5 py-2.5 text-[13.5px] text-gold-700">
        <CheckCircle2 className="size-[15px] text-gold-600" />
        <span className="flex-1">
          Decision recorded: <strong className="font-semibold text-gold-800">Studio Amaya — Gold package</strong>,
          chosen on price per covered hour and the named backup.
        </span>
      </div>
    </ScreenShell>
  );
}

/* ── 04 The day ──────────────────────────────────────────────────────────── */

const TIMELINE: {
  block: string;
  span: string;
  events: {
    from: string;
    to?: string;
    what: string;
    note?: string;
    clash?: boolean;
    who: string;
    where: string;
    vendor?: string;
    done?: boolean;
  }[];
}[] = [
  {
    block: 'Morning preparation',
    span: '05:30–09:15',
    events: [
      {
        from: '05:30',
        to: '–06:45',
        what: "Bride's hair and make-up",
        note: 'Nayana arrives 05:15 with two assistants',
        who: "Bride's party",
        where: "Bride's home",
        vendor: 'Nayana Bridal',
      },
      {
        from: '06:30',
        to: '–07:30',
        what: 'Photographer arrives, getting-ready shots',
        note: 'Clashes with the poruwa decor load-in van',
        clash: true,
        who: 'Studio Amaya',
        where: "Bride's home",
      },
      {
        from: '08:00',
        to: '–08:40',
        what: 'Nekath — auspicious time for dressing',
        who: 'Family',
        where: "Bride's home",
        done: true,
      },
    ],
  },
  {
    block: 'Poruwa ceremony',
    span: '09:45–11:20',
    events: [
      {
        from: '09:45',
        to: '–10:05',
        what: "Groom's party arrives, welcomed with betel leaves",
        who: 'Both families',
        where: 'Garden lawn',
      },
      {
        from: '10:12',
        to: '–10:48',
        what: 'Poruwa ceremony — 24 steps',
        note: 'Ashtaka chanting begins at the nekath, 10:12 exactly',
        who: 'Couple',
        where: 'Poruwa',
      },
      {
        from: '10:50',
        to: '–11:20',
        what: 'Registrar signing and witnesses',
        who: 'Couple',
        where: 'Library room',
      },
    ],
  },
  {
    block: 'Reception',
    span: '18:30–23:00',
    events: [
      {
        from: '18:30',
        to: '–19:00',
        what: 'Guests seated, welcome drinks',
        who: 'Coordinator',
        where: 'Grand Ballroom',
      },
      {
        from: '19:15',
        what: 'Grand entrance, first dance',
        note: 'Music cue 14 — DJ Ravi has the track list',
        who: 'Couple',
        where: 'Grand Ballroom',
        vendor: 'Beat Lounge',
      },
    ],
  },
];

function TimelineScreen() {
  return (
    <ScreenShell>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-[20px] font-semibold tracking-[-0.02em] text-stone-900">Day timeline</p>
          <p className="mt-1 text-[13.5px] text-stone-500">
            57 events · 2 clashes flagged · Asia/Colombo
          </p>
        </div>
        <span className="inline-flex h-8.5 items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3.5 text-[14px] font-medium text-stone-800 shadow-card">
          <Printer className="size-3.5" />
          Print the pack
        </span>
      </div>

      <div className="rounded-xl border border-stone-200/80 bg-white px-4.5 py-4 shadow-card">
        {TIMELINE.map((section) => (
          <div key={section.block} className="mt-4 first:mt-0">
            <p className="mb-1 border-b border-stone-200 pb-1 text-[12px] font-semibold tracking-[0.05em] text-stone-600 uppercase">
              {section.block}
              <span className="ml-2 font-normal tracking-normal text-stone-500 normal-case">
                {section.span}
              </span>
            </p>
            <table className="w-full border-collapse text-left">
              <tbody>
                {section.events.map((event) => (
                  <tr
                    key={event.what}
                    className={cn(
                      'border-b border-stone-100 align-top last:border-b-0',
                      event.clash && 'bg-amber-50/60',
                    )}
                  >
                    <td className="w-[88px] py-1.5 text-[12px] whitespace-nowrap tabular-nums">
                      <span className="font-medium text-stone-800">{event.from}</span>
                      {event.to && <span className="text-stone-500">{event.to}</span>}
                    </td>
                    <td className="py-1.5 pr-2 text-[14px] text-stone-900">
                      {event.what}
                      {event.clash && (
                        <AlertTriangle className="ml-1 inline size-3 -translate-y-px text-amber-600" />
                      )}
                      {event.note && (
                        <span className="block text-[11px] text-stone-500">{event.note}</span>
                      )}
                    </td>
                    <td className="w-24 py-1.5 pr-2 text-[12px] text-stone-500">{event.who}</td>
                    <td className="w-[118px] py-1.5 pr-2 text-[12px] text-stone-500">
                      {event.where}
                      {event.vendor && <span className="block">{event.vendor}</span>}
                    </td>
                    <td className="w-8.5 py-1.5 text-right">
                      <span
                        className={cn(
                          'inline-flex size-4.5 items-center justify-center rounded-[5px]',
                          event.done ? 'bg-wine-700' : 'border border-stone-300',
                        )}
                      >
                        {event.done && <Check className="size-[11px] text-white" />}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </ScreenShell>
  );
}
