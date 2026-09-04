import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAutosaveQueue } from './autosave';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function setup(delay = 500) {
  const saved: { key: string; value: string }[] = [];
  const save = vi.fn(async (key: string, value: string) => {
    saved.push({ key, value });
  });
  return { queue: createAutosaveQueue({ delay, save }), save, saved };
}

describe('createAutosaveQueue', () => {
  it('saves after the caller stops typing, not on every keystroke', async () => {
    const { queue, save } = setup();
    queue.set('a', 'h');
    queue.set('a', 'he');
    queue.set('a', 'hel');
    expect(save).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(500);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith('a', 'hel');
  });

  it('keeps separate cells separate', async () => {
    const { queue, saved } = setup();
    queue.set('a', 'one');
    queue.set('b', 'two');
    await vi.advanceTimersByTimeAsync(500);
    expect(saved).toEqual([
      { key: 'a', value: 'one' },
      { key: 'b', value: 'two' },
    ]);
  });

  /** The AC: navigating away must not drop what was typed a moment ago. */
  it('flushes everything still waiting, immediately', async () => {
    const { queue, saved } = setup();
    queue.set('a', 'typed just now');
    queue.set('b', 'and this');

    await queue.flush();

    expect(saved).toEqual([
      { key: 'a', value: 'typed just now' },
      { key: 'b', value: 'and this' },
    ]);
  });

  it('does not fire the timer again for something already flushed', async () => {
    const { queue, save } = setup();
    queue.set('a', 'x');
    await queue.flush();
    await vi.advanceTimersByTimeAsync(1000);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('flushing with nothing pending is harmless', async () => {
    const { queue, save } = setup();
    await queue.flush();
    expect(save).not.toHaveBeenCalled();
  });

  it('reports whether anything is waiting, so a page can warn before unload', async () => {
    const { queue } = setup();
    expect(queue.hasPending()).toBe(false);
    queue.set('a', 'x');
    expect(queue.hasPending()).toBe(true);
    await queue.flush();
    expect(queue.hasPending()).toBe(false);
  });

  /**
   * A cell edited again while its own save is in flight must end up with the
   * later value, not the earlier one — otherwise a slow request silently
   * reverts a keystroke.
   */
  it('does not let an in-flight save discard a newer edit', async () => {
    const saved: string[] = [];
    // A holder rather than a bare `let`: assigned only inside an async
    // callback, TypeScript narrows a plain variable to `never` at the call.
    const gate: { release?: () => void } = {};
    let calls = 0;
    const save = vi.fn(async (_key: string, value: string) => {
      calls += 1;
      // Only the first call hangs; blocking every call while `saved` is empty
      // would deadlock the second one behind a promise nobody resolves.
      if (calls === 1) {
        await new Promise<void>((resolve) => {
          gate.release = resolve;
        });
      }
      saved.push(value);
    });
    const queue = createAutosaveQueue({ delay: 500, save });

    queue.set('a', 'first');
    await vi.advanceTimersByTimeAsync(500); // starts the slow save
    queue.set('a', 'second');
    gate.release?.();
    await queue.flush();

    expect(saved).toEqual(['first', 'second']);
  });

  it('a failing save does not stop the other cells saving', async () => {
    const saved: string[] = [];
    const save = vi.fn(async (key: string, value: string) => {
      if (key === 'bad') throw new Error('nope');
      saved.push(value);
    });
    const queue = createAutosaveQueue({ delay: 500, save });

    queue.set('bad', 'x');
    queue.set('good', 'y');
    await queue.flush();

    expect(saved).toEqual(['y']);
  });

  it('surfaces a failure rather than swallowing it', async () => {
    const onError = vi.fn();
    const save = vi.fn(async () => {
      throw new Error('nope');
    });
    const queue = createAutosaveQueue({ delay: 500, save, onError });

    queue.set('a', 'x');
    await queue.flush();

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
  });
});
