import { BrowserRouter, Navigate, Route, Routes, useSearchParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './features/auth/AuthProvider';
import { SignInPage } from './features/auth/SignInPage';
import { ResetPasswordPage } from './features/auth/ResetPasswordPage';
import { WeddingListPage } from './features/weddings/WeddingListPage';
import { CreateWeddingPage } from './features/weddings/CreateWeddingPage';
import { WeddingLayout } from './features/weddings/WeddingLayout';
import { DashboardPage } from './features/weddings/DashboardPage';
import { SetupPage } from './features/weddings/SetupPage';
import { MembersPage } from './features/weddings/MembersPage';
import { BudgetPage } from './features/budget/BudgetPage';
import { PaymentsPage } from './features/payments/PaymentsPage';
import { ContributionsPage } from './features/contributions/ContributionsPage';
import { ComparePage } from './features/vendors/ComparePage';
import { supabase } from './lib/supabase';
import { Spinner } from './components/ui';

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
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/signin" element={<SignInPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/auth/reset" element={<ResetPasswordPage />} />
            <Route path="/invite" element={<AcceptInvitePage />} />

            <Route
              path="/"
              element={
                <RequireAuth>
                  <WeddingListPage />
                </RequireAuth>
              }
            />
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
              <Route path="*" element={<NotBuiltYet />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
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
