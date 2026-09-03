/**
 * Traditions offered at wedding creation.
 *
 * Decision D2 (plan §8): Poruwa only for M1–M3. Adding a tradition is content
 * work — a template locale plus its seed rows — so this list and the
 * `weddings.tradition` column are both deliberately open-ended rather than an
 * enum that would need a migration per tradition.
 */
export interface Tradition {
  value: string;
  label: string;
}

export const TRADITIONS: Tradition[] = [{ value: 'poruwa', label: 'Poruwa (Sinhala Buddhist)' }];
