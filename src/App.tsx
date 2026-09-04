import { BrowserRouter, Navigate, Route, Routes, useSearchParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './features/auth/AuthProvider';
import { SignInPage } from './features/auth/SignInPage';
import { ResetPasswordPage } from './features/auth/ResetPasswordPage';
import { WeddingListPage } from './features/weddings/WeddingListPage';
import { LandingPage } from './features/marketing/LandingPage';
import { CreateWeddingPage } from './features/weddings/CreateWeddingPage';
import { WeddingLayout } from './features/weddings/WeddingLayout';
import { DashboardPage } from './features/weddings/DashboardPage';
import { SetupPage } from './features/weddings/SetupPage';
import { MembersPage } from './features/weddings/MembersPage';
import { BudgetPage } from './features/budget/BudgetPage';
import { PaymentsPage } from './features/payments/PaymentsPage';
import { ContributionsPage } from './features/contributions/ContributionsPage';
import { ComparePage } from './features/vendors/ComparePage';
import { VendorsPage } from './features/vendors/VendorsPage';
import { GuestsPage } from './features/guests/GuestsPage';
import { SeatingPage } from './features/seating/SeatingPage';
import { GiftsPage } from './features/gifts/GiftsPage';
import { TasksPage } from './features/tasks/TasksPage';
import { CountdownPage } from './features/countdown/CountdownPage';
import { ResponsibilitiesPage } from './features/responsibilities/ResponsibilitiesPage';
import { ChecklistModulePage } from './features/checklists/ChecklistModule';
import {
  ContactSheetPage,
  RisksPage,
  TimelinePage,
  VendorSchedulePage,
} from './features/dayof/DayOfPages';
import { PackPage } from './features/dayof/PackPage';
import { ExportPage } from './features/export/ExportPage';
import { PublicRsvpPage } from './features/guests/PublicRsvpPage';
import { supabase } from './lib/supabase';
import { Spinner } from './components/ui';
import { ErrorBoundary } from './components/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (count, error) => {
        // Never retry an authorisation failure — it will never succeed.
        const msg = error instanceof Error ? error.message : '';
        if (/permission|denied|JWT|row-level/i.test(msg)) return false;
        return count < 2;
      },
    },
  },
});

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <Spinner label="Checking your session" />
      </div>
    );
  }
  if (!session) return <Navigate to="/signin" replace />;
  return <>{children}</>;
}

/**
 * The public landing page for a visitor, the wedding list for a member.
 *
 * Deliberately not wrapped in RequireAuth: that redirect is what made the
 * homepage unindexable. The session check happens here instead so a crawler
 * gets real content and a signed-in user goes straight to their weddings.
 */
function RootRoute() {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <Spinner label="Checking your session" />
      </div>
    );
  }
  return session ? <WeddingListPage /> : <LandingPage />;
}

/** Landing point for the emailed sign-up confirmation link. */
function AuthCallback() {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <Spinner label="Signing you in" />
      </div>
    );
  }
  return <Navigate to={session ? '/' : '/signin'} replace />;
}

/** /invite?token=… — accept, then drop the user into the wedding. */
function AcceptInvitePage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const { session, loading } = useAuth();
  const [state, setState] = useState<{ status: 'idle' | 'error'; message?: string }>({
    status: 'idle',
  });
  const [weddingId, setWeddingId] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !session || !token) return;
    void supabase
      .rpc('accept_invitation', { p_token: token })
      .then(({ data, error }) =>
        error
          ? setState({ status: 'error', message: error.message })
          : setWeddingId(data as string),
      );
  }, [loading, session, token]);

  if (!token) return <Navigate to="/" replace />;
  if (loading)
    return (
      <div className="p-10">
        <Spinner />
      </div>
    );
  if (!session) return <Navigate to={`/signin?next=/invite?token=${token}`} replace />;
  if (weddingId) return <Navigate to={`/w/${weddingId}`} replace />;
  if (state.status === 'error') {
    return (
      <div className="mx-auto max-w-md p-10 text-center">
        <h1 className="text-lg font-semibold text-stone-900">Invitation problem</h1>
        <p className="mt-1 text-sm text-stone-500">{state.message}</p>
      </div>
    );
  }
  return (
    <div className="p-10">
      <Spinner label="Accepting invitation" />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Public and unauthenticated: no RequireAuth, no wedding shell.
                A guest reaching this has no account and never will. */}
              <Route path="/rsvp/:token" element={<PublicRsvpPage />} />

              <Route path="/signin" element={<SignInPage />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/auth/reset" element={<ResetPasswordPage />} />
              <Route path="/invite" element={<AcceptInvitePage />} />

              {/* `/` is the one public URL. It used to redirect an
                  unauthenticated visitor to /signin, which left nothing to
                  rank and nothing to share — a sign-in form is not a landing
                  page. Signed in, it is still the wedding list. */}
              <Route path="/" element={<RootRoute />} />
              <Route
                path="/new"
                element={
                  <RequireAuth>
                    <CreateWeddingPage />
                  </RequireAuth>
                }
              />

              <Route
                path="/w/:weddingId"
                element={
                  <RequireAuth>
                    <WeddingLayout />
                  </RequireAuth>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path="setup" element={<SetupPage />} />
                <Route path="members" element={<MembersPage />} />
                <Route path="budget" element={<BudgetPage />} />
                <Route path="payments" element={<PaymentsPage />} />
                <Route path="contributions" element={<ContributionsPage />} />
                <Route path="compare" element={<ComparePage />} />
                <Route path="vendors" element={<VendorsPage />} />
                <Route path="guests" element={<GuestsPage />} />
                <Route path="seating" element={<SeatingPage />} />
                <Route path="gifts" element={<GiftsPage />} />
                <Route path="tasks" element={<TasksPage />} />
                <Route path="countdown" element={<CountdownPage />} />
                <Route path="responsibilities" element={<ResponsibilitiesPage />} />
                {/* Ticket 6.1: one route for all seventeen checklist modules.
                  Seventeen <Route> entries would be seventeen places to forget
                  the eighteenth. */}
                <Route path="m/:slug" element={<ChecklistModulePage />} />
                <Route path="timeline" element={<TimelinePage />} />
                <Route path="schedule" element={<VendorSchedulePage />} />
                <Route path="contacts" element={<ContactSheetPage />} />
                <Route path="risks" element={<RisksPage />} />
                {/* Ticket 8.6. Inside the wedding shell so it has the wedding,
                  but it lays itself out for paper. */}
                <Route path="pack" element={<PackPage />} />
                <Route path="export" element={<ExportPage />} />
                <Route path="*" element={<NotBuiltYet />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

function NotBuiltYet() {
  return (
    <div className="px-6 py-8">
      <div className="rounded-lg border border-dashed border-stone-300 px-6 py-12 text-center">
        <h3 className="text-sm font-semibold text-stone-800">Not built yet</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-stone-500">
          This module is scheduled in a later phase. See the development plan for its tickets and
          acceptance criteria.
        </p>
      </div>
    </div>
  );
}
