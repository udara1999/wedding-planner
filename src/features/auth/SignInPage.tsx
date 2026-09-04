import { useHead } from '../../lib/head';
import { useState } from 'react';
import { Heart } from 'lucide-react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from './AuthProvider';
import { describeAuthError } from './auth-errors';
import {
  forgotPasswordSchema,
  signInSchema,
  signUpSchema,
  type ForgotPasswordValues,
  type SignInValues,
  type SignUpValues,
} from './schemas';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Field,
  Input,
  Spinner,
} from '../../components/ui';

type Mode = 'signin' | 'signup' | 'forgot';

export function SignInPage() {
  // Reachable without a session, so a crawler can fetch it. A sign-in form
  // ranking for anything is a liability, not a win: it competes with the
  // landing page for the same terms and answers no question.
  useHead({ title: 'Sign in', index: false });
  const { session, loading } = useAuth();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<Mode>('signin');

  if (loading) {
    return (
      <Shell title="Sign in">
        <Spinner label="Checking your session" />
      </Shell>
    );
  }

  // A password sign-in completes on this page, so this is what actually lands the
  // user somewhere. Only relative paths, so `next` can't be used as an open redirect.
  if (session) {
    const next = params.get('next');
    return <Navigate to={next?.startsWith('/') ? next : '/'} replace />;
  }

  if (mode === 'signup') return <SignUpForm onDone={() => setMode('signin')} />;
  if (mode === 'forgot') return <ForgotPasswordForm onDone={() => setMode('signin')} />;
  return (
    <SignInForm onForgot={() => setMode('forgot')} onCreateAccount={() => setMode('signup')} />
  );
}

function Shell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
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
          <h1 className="text-[22px] font-semibold tracking-tight text-stone-900">
            Wedding Planner
          </h1>
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

function FormError({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-red-700">{children}</p>;
}

function SignInForm({
  onForgot,
  onCreateAccount,
}: {
  onForgot: () => void;
  onCreateAccount: () => void;
}) {
  const { signIn, resendConfirmation } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [unconfirmed, setUnconfirmed] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({ resolver: zodResolver(signInSchema) });

  async function onSubmit(values: SignInValues) {
    setError(null);
    setUnconfirmed(null);
    try {
      await signIn(values.email, values.password);
    } catch (e) {
      const info = describeAuthError(e instanceof Error ? e.message : 'Could not sign you in');
      setError(info.message);
      if (info.needsConfirmation) setUnconfirmed(values.email);
    }
  }

  return (
    <Shell title="Sign in">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Email address" error={errors.email?.message}>
          <Input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...register('email')}
          />
        </Field>

        <Field label="Password" error={errors.password?.message}>
          <Input type="password" autoComplete="current-password" {...register('password')} />
        </Field>

        {error && <FormError>{error}</FormError>}

        {unconfirmed &&
          (resent ? (
            <p className="text-xs text-stone-500">Confirmation link sent again.</p>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void resendConfirmation(unconfirmed).then(() => setResent(true))}
            >
              Resend the confirmation link
            </Button>
          ))}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>

        <div className="flex items-center justify-between pt-1 text-xs">
          <button type="button" onClick={onForgot} className="text-stone-500 hover:text-stone-800">
            Forgot your password?
          </button>
          <button
            type="button"
            onClick={onCreateAccount}
            className="font-medium text-wine-700 hover:text-wine-800"
          >
            Create an account
          </button>
        </div>
      </form>
    </Shell>
  );
}

function SignUpForm({ onDone }: { onDone: () => void }) {
  const { signUp } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [confirmSentTo, setConfirmSentTo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({ resolver: zodResolver(signUpSchema) });

  async function onSubmit(values: SignUpValues) {
    setError(null);
    try {
      const { needsEmailConfirmation } = await signUp(values.email, values.password);
      // Without confirmations the sign-up already produced a session, and
      // SignInPage's redirect takes over; nothing more to show.
      if (needsEmailConfirmation) setConfirmSentTo(values.email);
    } catch (e) {
      setError(
        describeAuthError(e instanceof Error ? e.message : 'Could not create your account').message,
      );
    }
  }

  if (confirmSentTo) {
    return (
      <Shell title="Confirm your email">
        <div className="space-y-3 text-sm text-stone-700">
          <p>
            We sent a confirmation link to <strong>{confirmSentTo}</strong>. Open it to finish
            setting up your account, then sign in.
          </p>
          <Button variant="secondary" size="sm" onClick={onDone}>
            Back to sign in
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell title="Create your account">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Email address" error={errors.email?.message}>
          <Input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...register('email')}
          />
        </Field>

        <Field label="Password" error={errors.password?.message}>
          <Input type="password" autoComplete="new-password" {...register('password')} />
        </Field>

        <Field label="Confirm password" error={errors.confirm?.message}>
          <Input type="password" autoComplete="new-password" {...register('confirm')} />
        </Field>

        {error && <FormError>{error}</FormError>}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Creating…' : 'Create account'}
        </Button>

        <p className="pt-1 text-center text-xs text-stone-500">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onDone}
            className="font-medium text-wine-700 hover:text-wine-800"
          >
            Sign in
          </button>
        </p>
      </form>
    </Shell>
  );
}

function ForgotPasswordForm({ onDone }: { onDone: () => void }) {
  const { sendPasswordReset } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(values: ForgotPasswordValues) {
    setError(null);
    try {
      await sendPasswordReset(values.email);
      setSentTo(values.email);
    } catch (e) {
      setError(
        describeAuthError(e instanceof Error ? e.message : 'Could not send the link').message,
      );
    }
  }

  if (sentTo) {
    return (
      <Shell title="Check your email">
        <div className="space-y-3 text-sm text-stone-700">
          <p>
            If an account exists for <strong>{sentTo}</strong>, we sent it a link for choosing a new
            password.
          </p>
          <Button variant="secondary" size="sm" onClick={onDone}>
            Back to sign in
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell title="Reset your password">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-sm text-stone-600">
          Enter your email address and we will send you a link to choose a new password.
        </p>

        <Field label="Email address" error={errors.email?.message}>
          <Input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...register('email')}
          />
        </Field>

        {error && <FormError>{error}</FormError>}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Sending…' : 'Email me a reset link'}
        </Button>

        <p className="pt-1 text-center text-xs">
          <button type="button" onClick={onDone} className="text-stone-500 hover:text-stone-800">
            Back to sign in
          </button>
        </p>
      </form>
    </Shell>
  );
}
