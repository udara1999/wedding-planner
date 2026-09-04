import { useEffect, useMemo, useState } from 'react';
import type { ContactSheetRow, ConflictRow, RiskRow, ScheduleRow, TimelineRow } from './api';
import type { GuestRow } from '../guests/api';
import type { SeatingTableRow } from '../seating/api';
import type { ChecklistRow } from '../checklists/config';
import type { VendorRow } from '../../types/db';

export interface PackData {
  timeline: TimelineRow[];
  conflicts: ConflictRow[];
  schedule: ScheduleRow[];
  contacts: ContactSheetRow[];
  risks: RiskRow[];
  tables: SeatingTableRow[];
  guests: GuestRow[];
  packing: ChecklistRow[];
  vendors: VendorRow[];
}

const EMPTY: PackData = {
  timeline: [],
  conflicts: [],
  schedule: [],
  contacts: [],
  risks: [],
  tables: [],
  guests: [],
  packing: [],
  vendors: [],
};

const key = (weddingId: string) => `dayof-pack:${weddingId}`;

/**
 * Ticket 8.7. The day-of pack, readable with no network.
 *
 * WHAT THIS IS AND IS NOT
 *
 * Plan risk R8 is explicit about the order of these two: "Printable pack (8.6)
 * is the real mitigation; PWA cache is secondary. Never let the day depend on
 * connectivity." This is the secondary one, and it is deliberately the simple
 * version.
 *
 * The service worker caches the app shell so the page loads offline. That gets
 * you a working app with no data in it, which is useless — so whenever the
 * pack loads with a connection, its contents are written to localStorage, and
 * when the queries fail they are read back. Read-only, one wedding at a time,
 * and openly stale.
 *
 * The alternative was persisting the whole React Query cache. That would need
 * another dependency, would cache every screen rather than the one that
 * matters, and would put a stale money figure in front of somebody without
 * saying so. The pack tells you when it is showing a saved copy and when it
 * was saved, because a coordinator acting on yesterday's timeline is worse off
 * than one who knows they need to find a signal.
 *
 * Nothing here is a write path. Offline writes are an explicit non-goal (§6),
 * and they would need conflict resolution nobody wants on a wedding day.
 */
export function usePackSnapshot(
  weddingId: string,
  live: Partial<PackData>,
): { data: PackData; fromCache: boolean; savedAt: string | null } {
  const [cached, setCached] = useState<{ data: PackData; savedAt: string } | null>(null);

  // What arrived from the network this render. Every part must be present
  // before this counts as a complete pack worth saving — a half-loaded pack
  // written over a good snapshot would be a downgrade.
  const complete =
    live.timeline !== undefined &&
    live.schedule !== undefined &&
    live.contacts !== undefined &&
    live.risks !== undefined &&
    live.tables !== undefined &&
    live.guests !== undefined &&
    live.packing !== undefined &&
    live.vendors !== undefined;

  useEffect(() => {
    if (!complete) return;
    const payload = { savedAt: new Date().toISOString(), data: { ...EMPTY, ...live } };
    try {
      window.localStorage.setItem(key(weddingId), JSON.stringify(payload));
    } catch {
      // A full or blocked store is not worth interrupting anyone over: the
      // printed pack is the real mitigation and this is the fallback to it.
    }
    // `live` is a fresh object every render; `complete` plus the query data
    // identity is what actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    complete,
    weddingId,
    live.timeline,
    live.schedule,
    live.contacts,
    live.risks,
    live.tables,
    live.guests,
    live.packing,
    live.vendors,
  ]);

  // Read the saved copy once, so it is available the moment the queries fail.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key(weddingId));
      if (!raw) return;
      const parsed = JSON.parse(raw) as { savedAt: string; data: PackData };
      if (parsed?.data) setCached({ data: { ...EMPTY, ...parsed.data }, savedAt: parsed.savedAt });
    } catch {
      // A snapshot written by an older version of this shape is not worth
      // migrating; it will be replaced the next time the pack loads online.
    }
  }, [weddingId]);

  return useMemo(() => {
    if (complete) {
      return { data: { ...EMPTY, ...live } as PackData, fromCache: false, savedAt: null };
    }
    if (cached) return { data: cached.data, fromCache: true, savedAt: cached.savedAt };
    return { data: EMPTY, fromCache: false, savedAt: null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    complete,
    cached,
    live.timeline,
    live.schedule,
    live.contacts,
    live.risks,
    live.tables,
    live.guests,
    live.packing,
    live.vendors,
  ]);
}
