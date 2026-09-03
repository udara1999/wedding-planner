import { NavLink, Outlet, useParams, Link } from 'react-router-dom';
import { useMyWeddings } from './api';
import { useAuth } from '../auth/AuthProvider';
import { Badge, ErrorState, Spinner } from '../../components/ui';
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
  phase?: string;
}

const ALL: MemberRole[] = ['owner', 'partner', 'family', 'coordinator', 'viewer'];
const COUPLE: MemberRole[] = ['owner', 'partner'];
const MONEY: MemberRole[] = ['owner', 'partner', 'family'];
const OPS: MemberRole[] = ['owner', 'partner', 'coordinator'];

const NAV: NavItem[] = [
  { to: '', label: 'Dashboard', roles: ALL },
  { to: 'setup', label: 'Setup', roles: ALL },
  { to: 'budget', label: 'Budget', roles: MONEY, phase: '2' },
  { to: 'payments', label: 'Payments', roles: MONEY, phase: '2' },
  { to: 'contributions', label: 'Contributions', roles: MONEY, phase: '2' },
  { to: 'vendors', label: 'Vendors', roles: ALL, phase: '3' },
  { to: 'compare', label: 'Compare vendors', roles: COUPLE, phase: '3' },
  { to: 'guests', label: 'Guests', roles: ALL, phase: '4' },
  { to: 'seating', label: 'Seating', roles: ALL, phase: '4' },
  { to: 'tasks', label: 'Tasks', roles: ALL, phase: '5' },
  { to: 'timeline', label: 'Day timeline', roles: OPS, phase: '8' },
  { to: 'contacts', label: 'Contact sheet', roles: OPS, phase: '8' },
  { to: 'members', label: 'People', roles: COUPLE },
];

export function WeddingLayout() {
  const { weddingId } = useParams<{ weddingId: string }>();
  const { data, isLoading, error, refetch } = useMyWeddings();
  const { signOut } = useAuth();

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

  const visible = NAV.filter((i) => i.roles.includes(wedding.role));

  return (
    <div className="flex min-h-full">
      <aside className="no-print w-60 shrink-0 border-r border-stone-200 bg-white">
        <div className="border-b border-stone-200 px-4 py-4">
          <Link to="/" className="text-xs text-stone-400 hover:text-stone-700">
            ← All weddings
          </Link>
          <p className="mt-1.5 truncate text-sm font-semibold text-stone-900">
            {wedding.bride_name} &amp; {wedding.groom_name}
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <Badge tone="gold">{wedding.role}</Badge>
            {typeof wedding.days_to_go === 'number' && (
              <span className="text-xs text-stone-500">
                {wedding.days_to_go >= 0
                  ? `${wedding.days_to_go} days to go`
                  : `${Math.abs(wedding.days_to_go)} days ago`}
              </span>
            )}
          </div>
        </div>

        <nav className="space-y-0.5 p-2">
          {visible.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === ''}
              className={({ isActive }) =>
                [
                  'flex items-center justify-between rounded-md px-3 py-2 text-sm',
                  isActive
                    ? 'bg-wine-50 font-medium text-wine-800'
                    : 'text-stone-700 hover:bg-stone-50',
                ].join(' ')
              }
            >
              <span>{item.label}</span>
              {item.phase && (
                <span className="text-[10px] text-stone-300" title={`Phase ${item.phase}`}>
                  P{item.phase}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-2">
          <button
            onClick={() => void signOut()}
            className="w-full rounded-md px-3 py-2 text-left text-sm text-stone-500 hover:bg-stone-50"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <Outlet context={{ wedding }} />
      </main>
    </div>
  );
}
