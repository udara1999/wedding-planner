import { useEffect, useMemo, useState } from 'react';
import { Check, HelpCircle, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useVendorAnswers, writeVendorAnswer, type VendorQuestion } from './api';
import { createAutosaveQueue } from './autosave';
import type { VendorOptionRow, VendorQuestionGroup } from '../../types/db';
import { Card, Skeleton, cn } from '../../components/ui';

/**
 * The group order IS the product (plan §4.4): money first, because a quote
 * you cannot compare is worthless; then what is included, then logistics, then
 * what could go wrong.
 */
const GROUP_ORDER: VendorQuestionGroup[] = ['money', 'included', 'logistics', 'risk'];

const GROUP_LABEL: Record<VendorQuestionGroup, string> = {
  money: 'Money',
  included: "What's included",
  logistics: 'Logistics',
  risk: 'Risk',
};

const GROUP_TONE: Record<VendorQuestionGroup, string> = {
  money: 'text-wine-800 bg-wine-50',
  included: 'text-emerald-800 bg-emerald-50',
  logistics: 'text-stone-700 bg-stone-100',
  risk: 'text-amber-800 bg-amber-50',
};

/**
 * Tickets 3.4 and 3.5. Questions as rows, options as columns, grouped and
 * ordered, with every cell autosaved.
 *
 * The grid scrolls horizontally inside its own container rather than widening
 * the page — the app has no page-level horizontal scroll, and letting a wide
 * table create one would drag the sidebar sideways with it. The question column
 * is sticky so a row stays readable however far right you scroll.
 *
 * Cells autosave 600ms after typing stops, and anything still waiting is
 * flushed when the component unmounts — which covers both navigating away and
 * switching category. Closing the tab is handled separately, since React never
 * sees it.
 */
export function ComparisonGrid({
  weddingId,
  options,
  questions,
  loading,
  canEdit,
}: {
  weddingId: string;
  options: VendorOptionRow[];
  questions: VendorQuestion[];
  loading: boolean;
  canEdit: boolean;
}) {
  const optionIds = useMemo(() => options.map((o) => o.id), [options]);
  const answers = useVendorAnswers(weddingId, optionIds);
  const qc = useQueryClient();

  // 3.5. One queue for the whole grid, living across renders.
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [failed, setFailed] = useState<Set<string>>(new Set());
  // Lazy initial state rather than a lazily-filled ref: the queue must be
  // created exactly once, and reading a ref during render is the thing that
  // makes that pattern fragile.
  const [queue] = useState(() =>
      createAutosaveQueue({
        delay: 600,
        save: async (key, value) => {
          const [optionId, questionId] = key.split(':');
          setSaving((s) => new Set(s).add(key));
          try {
            await writeVendorAnswer(weddingId, optionId, Number(questionId), value);
            setFailed((f) => {
              const next = new Set(f);
              next.delete(key);
              return next;
            });
          } finally {
            setSaving((s) => {
              const next = new Set(s);
              next.delete(key);
              return next;
            });
          }
        },
        onError: (_error, key) => setFailed((f) => new Set(f).add(key)),
      }),
  );

  // The AC's "no lost keystrokes on navigation". Unmounting covers navigating
  // away and switching category, both of which tear this component down.
  useEffect(() => {
    return () => {
      void queue.flush().then(() => {
        void qc.invalidateQueries({ queryKey: ['vendors', weddingId, 'answers'] });
      });
    };
  }, [queue, qc, weddingId]);

  // Closing the tab is the one exit React never sees.
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!queue.hasPending()) return;
      void queue.flush();
      e.preventDefault();
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [queue]);

  const grouped = useMemo(() => {
    const byGroup = new Map<VendorQuestionGroup, VendorQuestion[]>();
    for (const q of questions) {
      const g = (q.group ?? 'money') as VendorQuestionGroup;
      if (!byGroup.has(g)) byGroup.set(g, []);
      byGroup.get(g)!.push(q);
    }
    return GROUP_ORDER.filter((g) => byGroup.has(g)).map((g) => ({
      group: g,
      questions: byGroup.get(g)!,
    }));
  }, [questions]);

  if (loading) return <Skeleton className="h-96 rounded-xl" />;
  if (options.length === 0 || questions.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      <div className="scroll-subtle overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th
                className={cn(
                  'sticky left-0 z-20 w-72 min-w-72 border-b border-stone-200 bg-white',
                  'px-4 py-2.5 text-left text-[11px] font-semibold tracking-wider text-stone-500 uppercase',
                )}
              >
                Question
              </th>
              {options.map((o) => (
                <th
                  key={o.id}
                  className="min-w-56 border-b border-l border-stone-200 bg-white px-3 py-2.5 text-left align-bottom"
                >
                  <p className="text-[13px] font-semibold text-stone-900">{o.label}</p>
                  <p className="truncate text-xs text-stone-500">{o.vendor_name || 'No vendor yet'}</p>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {grouped.map(({ group, questions: qs }) => (
              <ChunkOfGroup
                key={group}
                group={group}
                questions={qs}
                options={options}
                columns={options.length + 1}
                answers={answers.data}
                canEdit={canEdit}
                saving={saving}
                failed={failed}
                onEdit={(optionId, questionId, answer) =>
                  queue.set(`${optionId}:${questionId}`, answer)
                }
              />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ChunkOfGroup({
  group,
  questions,
  options,
  columns,
  answers,
  canEdit,
  saving,
  failed,
  onEdit,
}: {
  group: VendorQuestionGroup;
  questions: VendorQuestion[];
  options: VendorOptionRow[];
  columns: number;
  answers: Map<string, { answer: string | null }> | undefined;
  canEdit: boolean;
  saving: Set<string>;
  failed: Set<string>;
  onEdit: (optionId: string, questionId: number, answer: string) => void;
}) {
  return (
    <>
      <tr>
        <td
          colSpan={columns}
          className={cn(
            'sticky left-0 px-4 py-1.5 text-[11px] font-semibold tracking-wider uppercase',
            GROUP_TONE[group],
          )}
        >
          {GROUP_LABEL[group]}
          <span className="ml-2 font-normal normal-case opacity-60">
            {questions.length} questions
          </span>
        </td>
      </tr>

      {questions.map((q) => (
        <tr key={q.id} className="group/row align-top">
          <th
            scope="row"
            className="sticky left-0 z-10 border-b border-stone-100 bg-white px-4 py-2 text-left font-normal group-hover/row:bg-stone-50"
          >
            <span className="block text-[13px] leading-snug text-stone-800">{q.question}</span>
            {q.why_it_matters && (
              <span className="mt-0.5 flex items-start gap-1 text-[11px] leading-snug text-stone-500">
                <HelpCircle className="mt-0.5 size-3 shrink-0" />
                {q.why_it_matters}
              </span>
            )}
          </th>

          {options.map((o) => {
            const key = `${o.id}:${q.id}`;
            const value = answers?.get(key)?.answer ?? '';
            return (
              <td
                key={o.id}
                className="relative border-b border-l border-stone-100 p-0 group-hover/row:bg-stone-50/60"
              >
                {saving.has(key) && (
                  <Loader2 className="absolute top-1 right-1 size-3 animate-spin text-stone-500" />
                )}
                {!saving.has(key) && failed.has(key) && (
                  <span
                    title="Could not save — it will retry when you edit the cell again"
                    className="absolute top-1 right-1 size-1.5 rounded-full bg-red-500"
                  />
                )}
                {!saving.has(key) && !failed.has(key) && value !== '' && (
                  <Check className="absolute top-1 right-1 size-3 text-emerald-400 opacity-0 transition-opacity group-hover/row:opacity-100" />
                )}
                {/* Uncontrolled with a key: React re-mounts the cell when the
                    stored answer changes, so a server update lands, but typing
                    is never interrupted by a re-render mid-keystroke. */}
                <textarea
                  key={`${key}:${value}`}
                  defaultValue={value}
                  disabled={!canEdit}
                  rows={2}
                  placeholder="—"
                  // Autosaved as you type; the blur is only a nudge for the
                  // last keystroke before leaving the cell.
                  onChange={(e) => {
                    if (q.id !== null) onEdit(o.id, q.id, e.target.value);
                  }}
                  onBlur={(e) => {
                    if (e.target.value !== value && q.id !== null) {
                      onEdit(o.id, q.id, e.target.value);
                    }
                  }}
                  className={cn(
                    'h-full w-full resize-none bg-transparent px-3 py-2 text-[13px] leading-snug',
                    'text-stone-800 placeholder:text-stone-500',
                    'focus:bg-white focus:ring-2 focus:ring-wine-500/25 focus:outline-none',
                    'disabled:cursor-not-allowed',
                  )}
                />
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
