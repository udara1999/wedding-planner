import { z } from 'zod';

/**
 * Kept in step with `[auth]  minimum_password_length` in supabase/config.toml.
 * Validating here only spares the user a round trip — the server is what enforces it.
 */
export const MIN_PASSWORD_LENGTH = 8;

const email = z.string().email('Enter a valid email address');
const newPassword = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`);

/** Sign-in deliberately does not impose the length rule: an older account may predate it. */
export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password'),
});

export const forgotPasswordSchema = z.object({ email });

/** Mismatch is reported on `confirm` so the error sits under the field the user retypes. */
const matching = <T extends { password: string; confirm: string }>(data: T) =>
  data.password === data.confirm;
const mismatchMessage = { path: ['confirm'], message: 'Passwords do not match' };

export const signUpSchema = z
  .object({ email, password: newPassword, confirm: z.string() })
  .refine(matching, mismatchMessage);

export const newPasswordSchema = z
  .object({ password: newPassword, confirm: z.string() })
  .refine(matching, mismatchMessage);

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type NewPasswordValues = z.infer<typeof newPasswordSchema>;
