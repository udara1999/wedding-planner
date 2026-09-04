/**
 * A debounced write queue, one entry per cell (ticket 3.5).
 *
 * The acceptance criterion is "autosave per cell; no lost keystrokes on
 * navigation", which is really two requirements: coalesce typing into one
 * write, and guarantee that anything still waiting is written before the
 * component goes away.
 *
 * Kept free of React so the guarantees can be tested directly with fake timers
 * rather than through a rendered component.
 */
export interface AutosaveQueue {
  /** Record the latest value for a cell and (re)start its timer. */
  set: (key: string, value: string) => void;
  /** Write everything still waiting, now. Resolves once they have all settled. */
  flush: () => Promise<void>;
  hasPending: () => boolean;
  /** Drop timers without saving. For unmounting after an explicit flush. */
  cancel: () => void;
}

export function createAutosaveQueue({
  delay,
  save,
  onError,
}: {
  delay: number;
  save: (key: string, value: string) => Promise<void>;
  onError?: (error: unknown, key: string) => void;
}): AutosaveQueue {
  const pending = new Map<string, string>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  // The write currently in flight for each key. Writes to one cell are
  // chained rather than raced: without this, editing a cell while its own
  // save is still running lets the OLDER value land last and quietly revert
  // the newer keystroke.
  const running = new Map<string, Promise<void>>();

  function write(key: string): Promise<void> {
    const value = pending.get(key);
    if (value === undefined) return running.get(key) ?? Promise.resolve();

    // Clear before awaiting: an edit arriving while this save is in flight
    // must queue a NEW write rather than being wiped by this one finishing.
    pending.delete(key);
    const timer = timers.get(key);
    if (timer) {
      clearTimeout(timer);
      timers.delete(key);
    }

    const prior = running.get(key) ?? Promise.resolve();
    const promise = prior
      .then(() => save(key, value))
      .catch((error: unknown) => {
        onError?.(error, key);
      })
      .finally(() => {
        if (running.get(key) === promise) running.delete(key);
      });

    running.set(key, promise);
    return promise;
  }

  return {
    set(key, value) {
      pending.set(key, value);
      const existing = timers.get(key);
      if (existing) clearTimeout(existing);
      timers.set(
        key,
        setTimeout(() => {
          void write(key);
        }, delay),
      );
    },

    async flush() {
      // Settle in waves: a write chained behind another only starts once the
      // first finishes, and an edit may arrive while both are running.
      // eslint-disable-next-line no-constant-condition
      while (true) {
        for (const key of [...pending.keys()]) void write(key);
        if (running.size === 0) break;
        await Promise.allSettled([...running.values()]);
        if (pending.size === 0 && running.size === 0) break;
      }
    },

    hasPending() {
      return pending.size > 0 || running.size > 0;
    },

    cancel() {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
      pending.clear();
    },
  };
}
