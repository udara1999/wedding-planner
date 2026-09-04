import { useState } from 'react';
import { NavLink, Outlet, useParams, Link } from 'react-router-dom';
import {
  Armchair,
  BedDouble,
  BookOpen,
  CakeSlice,
  CalendarClock,
  Camera,
  Car,
  ClipboardList,
  CreditCard,
  Download,
  Flower2,
  Gem,
  Gift,
  HandCoins,
  Hourglass,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Music,
  Package,
  PackageCheck,
  Palette,
  PartyPopper,
  Phone,
  Printer,
  Scale,
  Settings,
  ShieldAlert,
  Shirt,
  Sparkles,
  Store,
  Truck,
  UserCheck,
  Users,
  UsersRound,
  UtensilsCrossed,
  Wallet,
  X,
} from 'lucide-react';
import { useMyWeddings } from './api';
import { useAuth } from '../auth/AuthProvider';
import { Badge, Button, ErrorState, IconButton, Spinner, cn } from '../../components/ui';
import type { MemberRole } from '../../types/db';
import { CHECKLIST_MODULES, MODULE_GROUPS } from '../checklists/config';

/**
 * Navigation is derived from the caller's role, mirroring the RLS policies.
 *
 * The nav hiding a link is a convenience, NOT the security boundary — the
 * database refuses the query regardless (plan §4.6). Keeping the two in the
 * same shape makes drift obvious.
 */
interface NavItem {
  to: string;
  label: string;
  roles: MemberRole[];
  icon: React.ReactNode;
  phase?: string;
}

const ALL: MemberRole[] = ['owner', 'partner', 'family', 'coordinator', 'viewer'];
const COUPLE: MemberRole[] = ['owner', 'partner'];
const MONEY: MemberRole[] = ['owner', 'partner', 'family'];
const OPS: MemberRole[] = ['owner', 'partner', 'coordinator'];

const ICON = 'size-4 shrink-0';

/** One icon per module. Missing ones fall back rather than breaking the nav. */
const MODULE_ICONS: Record<string, React.ReactNode> = {
  attire: <Shirt className={ICON} />,
  jewellery: <Gem className={ICON} />,
  beauty: <Sparkles className={ICON} />,
  ceremony: <Flower2 className={ICON} />,
  legal: <Scale className={ICON} />,
  decor: <Palette className={ICON} />,
  menu: <UtensilsCrossed className={ICON} />,
  cake: <CakeSlice className={ICON} />,
  transport: <Car className={ICON} />,
  accommodation: <BedDouble className={ICON} />,
  shots: <Camera className={ICON} />,
  procurement: <Package className={ICON} />,
  party: <PartyPopper className={ICON} />,
  music: <Music className={ICON} />,
  contacts: <Phone className={ICON} />,
  closure: <PackageCheck className={ICON} />,
  lessons: <BookOpen className={ICON} />,
};
/** Grouped so a fifteen-item list reads as four short ones. */
const GROUPS: { heading: string; items: NavItem[] }[] = [
  {
    heading: 'Plan',
    items: [
      { to: '', label: 'Dashboard', roles: ALL, icon: <LayoutDashboard className={ICON} /> },
      { to: 'setup', label: 'Setup', roles: ALL, icon: <Settings className={ICON} /> },
      { to: 'tasks', label: 'Tasks', roles: ALL, icon: <ListChecks className={ICON} /> },
      // Phase 5. Grouped with Plan rather than with the day, because the
      // countdown is planning right up until it is not.
      { to: 'countdown', label: 'Countdown', roles: ALL, icon: <Hourglass className={ICON} /> },
      {
        to: 'responsibilities',
        label: 'Who does what',
        roles: ALL,
        icon: <UserCheck className={ICON} />,
      },
    ],
  },
  {
    // Vendors lead the money section because that is the order the work
    // happens in: you find and compare vendors, and the budget lines and
    // payments follow from what you agree with them.
    heading: 'Vendors & money',
    items: [
      { to: 'vendors', label: 'Vendors', roles: ALL, icon: <Store className={ICON} /> },
      {
        to: 'compare',
        label: 'Compare vendors',
        roles: COUPLE,
        icon: <ClipboardList className={ICON} />,
      },
      { to: 'budget', label: 'Budget', roles: MONEY, icon: <Wallet className={ICON} /> },
      { to: 'payments', label: 'Payments', roles: MONEY, icon: <CreditCard className={ICON} /> },
      {
        to: 'contributions',
        label: 'Contributions',
        roles: MONEY,
        icon: <HandCoins className={ICON} />,
      },
      // Gifts sit with the money rather than with the guests: they are the
      // other source of incoming cash, and they feed the dashboard's net cost.
      { to: 'gifts', label: 'Gifts', roles: MONEY, icon: <Gift className={ICON} /> },
    ],
  },
  {
    heading: 'People',
    items: [
      { to: 'guests', label: 'Guests', roles: ALL, icon: <UsersRound className={ICON} /> },
      { to: 'seating', label: 'Seating', roles: ALL, icon: <Armchair className={ICON} /> },
      { to: 'members', label: 'People', roles: COUPLE, icon: <Users className={ICON} /> },
    ],
  },
  {
    heading: 'The day',
    items: [
      {
        to: 'timeline',
        label: 'Day timeline',
        roles: OPS,
        icon: <CalendarClock className={ICON} />,
      },
      { to: 'schedule', label: 'Vendor arrivals', roles: OPS, icon: <Truck className={ICON} /> },
      { to: 'contacts', label: 'Contact sheet', roles: OPS, icon: <Phone className={ICON} /> },
      {
        to: 'risks',
        label: 'If it goes wrong',
        roles: OPS,
        icon: <ShieldAlert className={ICON} />,
      },
      // Ticket 8.6. Last, because it is the thing you do once, on the way out
      // of the door.
      { to: 'pack', label: 'Print the pack', roles: OPS, icon: <Printer className={ICON} /> },
    ],
  },
  // Phase 6. Generated from the module registry so a module cannot be added
  // and left unreachable — the config carries its own group.
  ...MODULE_GROUPS.map((heading) => ({
    heading,
    items: CHECKLIST_MODULES.filter((m) => m.group === heading).map((m) => ({
      to: `m/${m.slug}`,
      label: m.title,
      roles: ALL,
      icon: MODULE_ICONS[m.slug] ?? <ClipboardList className={ICON} />,
    })),
  })),
  {
    heading: 'Your data',
    items: [
      // Ticket 9.2. Deliberately visible rather than buried in a settings
      // menu: a couple who can see the export believe they can leave, and
      // that is why they stay.
      {
        to: 'export',
        label: 'Export everything',
        roles: MONEY,
        icon: <Download className={ICON} />,
      },
    ],
  },
];

export function WeddingLayout() {
  const { weddingId } = useParams<{ weddingId: string }>();
  const { data, isLoading, error, refetch } = useMyWeddings();
  const { signOut } = useAuth();
  const [navOpen, setNavOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="p-10">
        <Spinner label="Loading wedding" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-10">
        <ErrorState error={error} onRetry={() => void refetch()} />
      </div>
    );
  }

  const wedding = data?.find((w) => w.id === weddingId);

  if (!wedding) {
    return (
      <div className="mx-auto max-w-lg p-10 text-center">
        <h1 className="text-lg font-semibold text-stone-900">Wedding not found</h1>
        <p className="mt-1 text-sm text-stone-500">
          Either it does not exist, or you do not have access to it.
        </p>
        <Link to="/" className="mt-4 inline-block text-sm text-wine-700 underline">
          Back to your weddings
        </Link>
      </div>
    );
  }

  const groups = GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => i.roles.includes(wedding.role)),
  })).filter((g) => g.items.length > 0);

  const days = wedding.days_to_go;

  return (
    /**
     * The shell owns the only scroll container. `h-full overflow-hidden` on the
     * frame plus `overflow-y-auto` on the content means the sidebar stays put
     * while a long budget scrolls — previously the whole page scrolled and took
     * the navigation with it.
     */
    <>
      {/* Ticket 9.7. Fifteen nav items before the page content is a lot of
          tabbing on every navigation. Visible only when focused. */}
      <a
        href="#main"
        className="focus-ring sr-only rounded-lg bg-wine-700 px-3 py-2 text-sm font-medium text-white focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50"
      >
        Skip to the page
      </a>
      <div className="flex h-full overflow-hidden bg-ivory">
        {/* Backdrop for the mobile drawer. */}
        {navOpen && (
          <button
            aria-label="Close navigation"
            className="fixed inset-0 z-30 bg-stone-900/25 backdrop-blur-[1px] lg:hidden"
            onClick={() => setNavOpen(false)}
          />
        )}

        <aside
          className={cn(
            'no-print scroll-subtle z-40 flex h-full w-64 shrink-0 flex-col overflow-y-auto',
            'border-r border-stone-200/80 bg-white',
            // Off-canvas below lg, a normal column above it.
            'fixed inset-y-0 left-0 transition-transform duration-200 lg:static lg:translate-x-0',
            'pb-[env(safe-area-inset-bottom)]',
            navOpen ? 'translate-x-0 shadow-pop' : '-translate-x-full',
          )}
        >
          <div className="flex items-start justify-between gap-2 px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-3">
            <Link
              to="/"
              className="focus-ring group min-w-0 rounded-lg"
              onClick={() => setNavOpen(false)}
            >
              <span className="text-xs sm:text-[11px] font-medium text-stone-500 group-hover:text-stone-600">
                All weddings
              </span>
              <p className="truncate text-[15px] leading-snug font-semibold tracking-tight text-stone-900">
                {wedding.bride_name} &amp; {wedding.groom_name}
              </p>
            </Link>
            <IconButton
              label="Close navigation"
              className="lg:hidden"
              size="sm"
              onClick={() => setNavOpen(false)}
            >
              <X className="size-4" />
            </IconButton>
          </div>

          <div className="mx-4 mb-3 flex items-center gap-2 rounded-lg bg-stone-50 px-3 py-2">
            <Badge tone="gold">{wedding.role}</Badge>
            {typeof days === 'number' && (
              <span className="tabular text-xs text-stone-500">
                {days >= 0 ? `${days} days to go` : `${Math.abs(days)} days ago`}
              </span>
            )}
          </div>

          <nav className="flex-1 space-y-4 px-2 pb-2">
            {groups.map((group) => (
              <div key={group.heading}>
                <p className="px-3 pb-1 text-[11px] sm:text-[10px] font-semibold tracking-wider text-stone-500 uppercase">
                  {group.heading}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === ''}
                      onClick={() => setNavOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          'focus-ring group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                          isActive
                            ? 'bg-wine-50 font-medium text-wine-800'
                            : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span className={isActive ? 'text-wine-600' : 'text-stone-500'}>
                            {item.icon}
                          </span>
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.phase && (
                            <span
                              title={`Arrives in phase ${item.phase}`}
                              className="rounded bg-stone-100 px-1 text-[11px] sm:text-[10px] text-stone-500"
                            >
                              P{item.phase}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="border-t border-stone-100 p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              icon={<LogOut className="size-4" />}
              onClick={() => void signOut()}
            >
              Sign out
            </Button>
          </div>
        </aside>

        {/* The one scrolling region. min-w-0 stops a wide child widening the
          flex item and reintroducing a horizontal scrollbar. */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="no-print sticky top-0 z-20 flex items-center gap-3 border-b border-stone-200/80 bg-white/90 px-4 pt-[calc(0.625rem+env(safe-area-inset-top))] pb-2.5 backdrop-blur lg:hidden">
            <IconButton label="Open navigation" onClick={() => setNavOpen(true)}>
              <Menu className="size-5" />
            </IconButton>
            <p className="truncate text-sm font-semibold text-stone-900">
              {wedding.bride_name} &amp; {wedding.groom_name}
            </p>
          </header>

          <main id="main" tabIndex={-1} className="scroll-subtle min-w-0 flex-1 overflow-y-auto">
            <Outlet context={{ wedding }} />
          </main>
        </div>
      </div>
    </>
  );
}
