/**
 * Convenience aliases over the generated schema types.
 *
 * `database.types.ts` is generated output and must stay byte-identical to
 *   npm run types:gen
 * because CI regenerates it and fails on any difference. Nothing hand-written
 * belongs in that file — it lives here instead, derived from the generated
 * `Database` type so a schema change flows through automatically.
 */
import type { Database, Enums, Tables } from './database.types';

export type { Database };

export type MemberRole = Enums<'member_role'>;
export type WeddingSide = Enums<'wedding_side'>;

export type WeddingRow = Tables<'weddings'>;
export type ProfileRow = Tables<'profiles'>;
export type WeddingMemberRow = Tables<'wedding_members'>;
export type WeddingInvitationRow = Tables<'wedding_invitations'>;

export type Applicability = Enums<'applicability'>;
export type TaskStatus = Enums<'task_status'>;

export type BudgetCategoryRow = Tables<'budget_categories'>;
export type BudgetLineRow = Tables<'budget_lines'>;

/** One row of the `my_weddings()` RPC — a wedding plus the caller's role in it. */
export type MyWedding = Database['public']['Functions']['my_weddings']['Returns'][number];

export type PaymentStage = Enums<'payment_stage'>;
export type PaymentStatus = Enums<'payment_status'>;
export type PaymentRow = Tables<'payments'>;

/** Views: every column is nullable in the generated types. */
export type BudgetByCategory = Database['public']['Views']['v_budget_by_category']['Row'];
export type BudgetLineView = Database['public']['Views']['v_budget_lines']['Row'];
export type PaymentView = Database['public']['Views']['v_payments']['Row'];
