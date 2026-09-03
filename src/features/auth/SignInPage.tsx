import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from './AuthProvider';
import { Button, Card, CardBody, CardHeader, CardTitle, Field, Input } from '../../components/ui';

const schema = z.object({ email: z.string().email('Enter a valid email address') });
type FormValues = z.infer<typeof schema>;

export function SignInPage() {
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setFormError(null);
    try {
      await signInWithEmail(values.email);
      setSentTo(values.email);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Could not send the link');
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-wine-800">Wedding Planner</h1>
          <p className="mt-1 text-sm text-stone-500">Plan the whole day in one place.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{sentTo ? 'Check your email' : 'Sign in'}</CardTitle>
          </CardHeader>
          <CardBody>
            {sentTo ? (
              <div className="space-y-3 text-sm text-stone-700">
                <p>
                  We sent a sign-in link to <strong>{sentTo}</strong>. Open it on this device to
                  continue.
                </p>
                <Button variant="ghost" size="sm" onClick={() => setSentTo(null)}>
                  Use a different email
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Field label="Email address" error={errors.email?.message}>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    {...register('email')}
                  />
                </Field>

                {formError && <p className="text-xs text-red-700">{formError}</p>}

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Sending…' : 'Email me a sign-in link'}
                </Button>

                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-stone-200" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-2 text-xs text-stone-400">or</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => void signInWithGoogle()}
                >
                  Continue with Google
                </Button>
              </form>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
