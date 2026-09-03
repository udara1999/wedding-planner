export interface AuthErrorInfo {
  /** Copy safe to show the user. */
  message: string;
  /** True when the account exists but the email was never confirmed, so the page can offer a resend. */
  needsConfirmation: boolean;
}

/**
 * GoTrue's wording leaks implementation detail ("Invalid login credentials") and,
 * in the unconfirmed-email case, describes a state the user can actually fix.
 * Anything unrecognised passes through — swallowing it would hide real faults.
 */
export function describeAuthError(raw: string): AuthErrorInfo {
  if (/email not confirmed/i.test(raw)) {
    return {
      message: 'Confirm your email address first — we sent you a link when you signed up.',
      needsConfirmation: true,
    };
  }

  if (/invalid login credentials/i.test(raw)) {
    return { message: 'That email and password do not match an account.', needsConfirmation: false };
  }

  if (/user already registered|already been registered/i.test(raw)) {
    return {
      message: 'An account with that email already exists — sign in instead.',
      needsConfirmation: false,
    };
  }

  if (/rate limit|too many requests/i.test(raw)) {
    return { message: 'Too many attempts. Wait a minute, then try again.', needsConfirmation: false };
  }

  return { message: raw, needsConfirmation: false };
}
