import { useState } from 'react';
import { NavLink, Outlet, useParams, Link } from 'react-router-dom';
import {
  CalendarClock,
  ClipboardList,
  CreditCard,
  HandCoins,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Phone,
  Settings,
  Store,
  Users,
  UsersRound,
  Wallet,
  X,
} from 'lucide-react';
import { useMyWeddings } from './api';
import { useAuth } from '../auth/AuthProvider';
import { Badge, Button, ErrorState, IconButton, Spinner, cn } from '../../components/ui';
import type { MemberRole } from '../../types/db';

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

/** Grouped so a fifteen-item list reads as four short ones. */
const GROUPS: { heading: string; items: NavItem[] }[] = [
  {
    heading: 'Plan',
    items: [
      { to: '', label: 'Dashboard', roles: ALL, icon: <LayoutDashboard className={ICON} /> },
      { to: 'setup', label: 'Setup', roles: ALL, icon: <Settings className={ICON} /> },
      {
        to: 'tasks',
        label: 'Tasks',
        roles: ALL,
        icon: <ListChecks className={ICON} />,
        phase: '5',
      },
    ],
  },
  {
    heading: 'Money',
    items: [
      { to: 'budget', label: 'Budget', roles: MONEY, icon: <Wallet className={ICON} /> },
      { to: 'payments', label: 'Payments', roles: MONEY, icon: <CreditCard className={ICON} /> },
      {
        to: 'contributions',
        label: 'Contributions',
        roles: MONEY,
        icon: <HandCoins className={ICON} />,
      },
    ],
  },
  {
    heading: 'People & vendors',
    items: [
      { to: 'vendors', label: 'Vendors', roles: ALL, icon: <Store className={ICON} /> },
      {
        to: 'compare',
        label: 'Compare vendors',
        roles: COUPLE,
        icon: <ClipboardList className={ICON} />,
      },
      {
        to: 'guests',
        label: 'Guests',
        roles: ALL,
        icon: <UsersRound className={ICON} />,
        phase: '4',
      },
      {
        to: 'seating',
        label: 'Seating',
        roles: ALL,
        icon: <UsersRound className={ICON} />,
        phase: '4',
      },
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
        phase: '8',
      },
      {
        to: 'contacts',
        label: 'Contact sheet',
        roles: OPS,
        icon: <Phone className={ICON} />,
        phase: '8',
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
          navOpen ? 'translate-x-0 shadow-pop' : '-translate-x-full',
        )}
      >
        <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-3">
          <Link
            to="/"
            className="focus-ring group min-w-0 rounded-lg"
            onClick={() => setNavOpen(false)}
          >
            <span className="text-[11px] font-medium text-stone-400 group-hover:text-stone-600">
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
              <p className="px-3 pb-1 text-[10px] font-semibold tracking-wider text-stone-400 uppercase">
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
                        <span className={isActive ? 'text-wine-600' : 'text-stone-400'}>
                          {item.icon}
                        </span>
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.phase && (
                          <span
                            title={`Arrives in phase ${item.phase}`}
                            className="rounded bg-stone-100 px-1 text-[10px] text-stone-400"
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
        <header className="no-print flex items-center gap-3 border-b border-stone-200/80 bg-white/80 px-4 py-2.5 backdrop-blur lg:hidden">
          <IconButton label="Open navigation" onClick={() => setNavOpen(true)}>
            <Menu className="size-5" />
          </IconButton>
          <p className="truncate text-sm font-semibold text-stone-900">
            {wedding.bride_name} &amp; {wedding.groom_name}
          </p>
        </header>

        <main className="scroll-subtle min-w-0 flex-1 overflow-y-auto">
          <Outlet context={{ wedding }} />
        </main>
      </div>
    </div>
  );
}
