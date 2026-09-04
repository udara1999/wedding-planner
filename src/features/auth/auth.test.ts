import { describe, expect, it } from 'vitest';
import { forgotPasswordSchema, newPasswordSchema, signInSchema, signUpSchema } from './schemas';
import { describeAuthError } from './auth-errors';

/** Helper: the first error message zod reports for a given field. */
function errorFor(
  result: { success: boolean; error?: { issues: readonly unknown[] } },
  field: string,
) {
  if (result.success) return undefined;
  const issues = (result.error?.issues ?? []) as { path: (string | number)[]; message: string }[];
  return issues.find((i) => i.path.join('.') === field)?.message;
}

describe('signInSchema', () => {
  it('rejects an address that is not an email', () => {
    const result = signInSchema.safeParse({ email: 'not-an-email', password: 'whatever' });
    expect(errorFor(result, 'email')).toBe('Enter a valid email address');
  });

  it('accepts a short password, because existing accounts may have one', () => {
    const result = signInSchema.safeParse({ email: 'a@b.com', password: 'abc' });
    expect(result.success).toBe(true);
  });

  it('requires a password to be typed at all', () => {
    const result = signInSchema.safeParse({ email: 'a@b.com', password: '' });
    expect(errorFor(result, 'password')).toBe('Enter your password');
  });
});

describe('signUpSchema', () => {
  it('rejects a password under eight characters', () => {
    const result = signUpSchema.safeParse({
      email: 'a@b.com',
      password: 'short7!',
      confirm: 'short7!',
    });
    expect(errorFor(result, 'password')).toBe('Use at least 8 characters');
  });

  it('reports a mismatch on the confirm field, where the user can see it', () => {
    const result = signUpSchema.safeParse({
      email: 'a@b.com',
      password: 'correct-horse',
      confirm: 'correct-house',
    });
    expect(errorFor(result, 'confirm')).toBe('Passwords do not match');
  });

  it('accepts a matching pair of long enough passwords', () => {
    const result = signUpSchema.safeParse({
      email: 'a@b.com',
      password: 'correct-horse',
      confirm: 'correct-horse',
    });
    expect(result.success).toBe(true);
  });
});

describe('forgotPasswordSchema', () => {
  it('only asks for a valid email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'a@b.com' }).success).toBe(true);
    expect(errorFor(forgotPasswordSchema.safeParse({ email: 'nope' }), 'email')).toBe(
      'Enter a valid email address',
    );
  });
});

describe('newPasswordSchema', () => {
  it('reports a mismatch on the confirm field', () => {
    const result = newPasswordSchema.safeParse({ password: 'a-new-one', confirm: 'a-new-two' });
    expect(errorFor(result, 'confirm')).toBe('Passwords do not match');
  });

  it('holds a new password to the same minimum as signup', () => {
    const result = newPasswordSchema.safeParse({ password: 'short7!', confirm: 'short7!' });
    expect(errorFor(result, 'password')).toBe('Use at least 8 characters');
  });
});

describe('describeAuthError', () => {
  it('does not blame the email when credentials are wrong, because it cannot tell which is', () => {
    const { message } = describeAuthError('Invalid login credentials');
    expect(message).toBe('That email and password do not match an account.');
  });

  it('flags an unconfirmed email so the page can offer to resend the link', () => {
    const result = describeAuthError('Email not confirmed');
    expect(result.needsConfirmation).toBe(true);
    expect(result.message).toMatch(/confirm/i);
  });

  it('does not flag confirmation for an ordinary failure', () => {
    expect(describeAuthError('Invalid login credentials').needsConfirmation).toBe(false);
  });

  it('points an existing account at the sign-in form instead', () => {
    expect(describeAuthError('User already registered').message).toBe(
      'An account with that email already exists — sign in instead.',
    );
  });

  it('softens the rate limit wording', () => {
    expect(describeAuthError('Email rate limit exceeded').message).toMatch(/too many/i);
  });

  it('falls back to the raw message rather than swallowing an unknown error', () => {
    expect(describeAuthError('Database is on fire').message).toBe('Database is on fire');
  });
});
