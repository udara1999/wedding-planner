import { z } from 'zod';

/**
 * Fail loudly at startup rather than with a confusing 401 on the first query.
 */
const schema = z.object({
  VITE_SUPABASE_URL: z.string().url('VITE_SUPABASE_URL must be a full https URL'),
  VITE_SUPABASE_ANON_KEY: z.string().min(20, 'VITE_SUPABASE_ANON_KEY looks wrong'),
});

const parsed = schema.safeParse(import.meta.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  • ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(
    `Missing or invalid environment variables.\n\n${issues}\n\n` +
      'Copy .env.example to .env and fill in your Supabase project values.',
  );
}

export const env = parsed.data;
