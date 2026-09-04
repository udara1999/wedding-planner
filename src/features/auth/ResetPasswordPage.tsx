import { useState } from 'react';
import { Heart } from 'lucide-react';
import { Navigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from './AuthProvider';
import { describeAuthError } from './auth-errors';
import { newPasswordSchema, type NewPasswordValues } from './schemas';
import { Button, Card, CardBody, CardHeader, CardTitle, Field, Input, Spinner } from '../../components/ui';

/**
 * Landing point for the emailed recovery link. The link carries tokens that the
 * Supabase client exchanges for a session on load (`detectSessionInUrl`), so the
 * presence of a session is what tells us the link was good.
 */
export function ResetPasswordPage() {
  const { session, loading, updatePassword } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NewPasswordValues>({ resolver: zodResolver(newPasswordSchema) });

  async function onSubmit(values: NewPasswordValues) {
    setError(null);
    try {
      await updatePassword(values.password);
      setDone(true);
    } catch (e) {
      setError(describeAuthError(e instanceof Error ? e.message : 'Could not save the password').message);
    }
  }

  if (done) return <Navigate to="/" replace />;

  if (loading) {
    return (
      <Shell title="Choose a new password">
        <Spinner label="Checking your link" />
      </Shell>
    );
  }

  if (!session) {
    return (
      <Shell title="That link has expired">
        <div className="space-y-3 text-sm text-stone-700">
          <p>Reset links can only be used once, and they do not last long. Request a fresh one.</p>
          <Link to="/signin">
            <Button variant="secondary" size="sm">
              Back to sign in
            </Button>
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell title="Choose a new password">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="New password" error={errors.password?.message}>
          <Input type="password" autoComplete="new-password" {...register('password')} />
        </Field>

        <Field label="Confirm new password" error={errors.confirm?.message}>
          <Input type="password" autoComplete="new-password" {...register('confirm')} />
        </Field>

        {error && <p className="text-xs text-red-700">{error}</p>}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save password'}
        </Button>
      </form>
    </Shell>
  );
}

function Shell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-full items-center justify-center bg-ivory px-4 py-12">
      {/* A soft wash behind the card: enough to stop a white card on an ivory
          page reading as a plain form, without becoming decoration. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(60rem_40rem_at_50%_-10%,var(--color-wine-100),transparent)] opacity-70"
      />
      <div className="relative w-full max-w-sm">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-2xl bg-wine-700 text-white shadow-raised">
            <Heart className="size-5" fill="currentColor" />
          </div>
          <h1 className="text-[22px] font-semibold tracking-tight text-stone-900">Wedding Planner</h1>
          <p className="mt-1 text-sm text-stone-500">Plan the whole day in one place.</p>
        </div>

        <Card className="shadow-raised">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardBody>
            {subtitle && <p className="mb-4 text-sm text-stone-500">{subtitle}</p>}
            {children}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
