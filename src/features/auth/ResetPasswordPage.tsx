import { useState } from 'react';
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

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-wine-800">Wedding Planner</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardBody>{children}</CardBody>
        </Card>
      </div>
    </div>
  );
}
