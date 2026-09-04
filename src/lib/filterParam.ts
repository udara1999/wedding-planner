import { useSearchParams } from 'react-router-dom';

/**
 * A filter that lives in the URL rather than in component state.
 *
 * Ticket 7.5 asks that every alert "navigates to the exact filtered screen".
 * The obvious implementation — initialise state from the query string — does
 * not work: React Router keeps a component mounted when only the search
 * changes, so arriving at `payments?status=overdue` from
 * `payments?status=paid` would leave the old filter in place. Syncing state to
 * the URL with an effect works but renders once wrong first.
 *
 * Keeping the value in the URL removes the question. There is one source of
 * truth, deep links always land filtered, and the filters become shareable and
 * bookmarkable, which was not the goal but is worth having.
 *
 * The default is represented by the parameter being absent, so a screen at
 * rest has a clean URL instead of `?status=all&side=all&view=open`.
 */
export function useFilterParam<T extends string>(
  key: string,
  fallback: T,
  allowed?: readonly T[],
): [T, (next: T) => void] {
  const [params, setParams] = useSearchParams();

  const raw = params.get(key);
  // An unrecognised value in a hand-edited URL falls back rather than
  // filtering everything out and looking like an empty screen.
  const value =
    raw !== null && (!allowed || (allowed as readonly string[]).includes(raw))
      ? (raw as T)
      : fallback;

  function set(next: T) {
    const updated = new URLSearchParams(params);
    if (next === fallback) updated.delete(key);
    else updated.set(key, next);
    // replace: changing a filter should not put a step in the back button for
    // every dropdown a person tries.
    setParams(updated, { replace: true });
  }

  return [value, set];
}
