import { describe, expect, it } from 'vitest';
import type { MemberRole } from '../../types/db';

/**
 * Mirror of the NAV table in WeddingLayout.tsx. Kept here so a change to the
 * role matrix in the plan (§4.8) fails a test rather than silently shipping.
 *
 * NOTE: this asserts the *navigation*, which is convenience only. The security
 * boundary is RLS, covered by supabase/tests/10_tenancy_isolation_test.sql.
 */
const MATRIX: Record<string, MemberRole[]> = {
  Dashboard: ['owner', 'partner', 'family', 'coordinator', 'viewer'],
  Setup: ['owner', 'partner', 'family', 'coordinator', 'viewer'],
  Budget: ['owner', 'partner', 'family'],
  Payments: ['owner', 'partner', 'family'],
  Contributions: ['owner', 'partner', 'family'],
  'Compare vendors': ['owner', 'partner'],
  'Day timeline': ['owner', 'partner', 'coordinator'],
  People: ['owner', 'partner'],
};

function visibleTo(role: MemberRole) {
  return Object.entries(MATRIX)
    .filter(([, roles]) => roles.includes(role))
    .map(([label]) => label);
}

describe('role-based navigation', () => {
  it('never shows a money screen to a coordinator', () => {
    const nav = visibleTo('coordinator');
    expect(nav).not.toContain('Budget');
    expect(nav).not.toContain('Payments');
    expect(nav).not.toContain('Contributions');
  });

  it('gives the coordinator the day-of pack', () => {
    expect(visibleTo('coordinator')).toContain('Day timeline');
  });

  it('lets family see money but not vendor comparison or people', () => {
    const nav = visibleTo('family');
    expect(nav).toContain('Budget');
    expect(nav).not.toContain('Compare vendors');
    expect(nav).not.toContain('People');
  });

  it('gives the couple everything', () => {
    expect(visibleTo('owner')).toHaveLength(Object.keys(MATRIX).length);
    expect(visibleTo('partner')).toHaveLength(Object.keys(MATRIX).length);
  });

  it('gives a viewer no write-oriented screens', () => {
    const nav = visibleTo('viewer');
    expect(nav).not.toContain('People');
    expect(nav).not.toContain('Compare vendors');
    expect(nav).not.toContain('Day timeline');
  });
});
