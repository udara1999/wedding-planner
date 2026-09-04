import type { PaymentStage, PaymentStatus } from '../../types/db';

/**
 * Shared so the payments list and the vendor screen label the same status the
 * same way. They drifted for one commit when the vendor panel was added, which
 * is exactly how "due soon" ends up meaning two things.
 */
export const STAGES: { value: PaymentStage; label: string }[] = [
  { value: 'booking_deposit', label: 'Booking deposit' },
  { value: 'advance', label: 'Advance' },
  { value: 'progress_payment', label: 'Progress payment' },
  { value: 'final_payment', label: 'Final payment' },
  { value: 'extra_overtime', label: 'Extra / overtime' },
  { value: 'refundable_deposit', label: 'Refundable deposit' },
  { value: 'refund_received', label: 'Refund received' },
];

export const STAGE_LABEL: Record<PaymentStage, string> = Object.fromEntries(
  STAGES.map((s) => [s.value, s.label]),
) as Record<PaymentStage, string>;

export const STATUS_TONE: Record<PaymentStatus, 'neutral' | 'good' | 'warn' | 'stop' | 'gold'> = {
  draft: 'neutral',
  paid: 'good',
  overdue: 'stop',
  due: 'warn',
  due_soon: 'gold',
  not_due: 'neutral',
};

export const STATUS_LABEL: Record<PaymentStatus, string> = {
  draft: 'draft',
  paid: 'paid',
  overdue: 'overdue',
  due: 'due',
  due_soon: 'due soon',
  not_due: 'not due',
};
