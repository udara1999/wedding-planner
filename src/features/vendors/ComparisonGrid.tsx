import { useMemo } from 'react';
import { HelpCircle } from 'lucide-react';
import { useSaveVendorAnswer, useVendorAnswers, type VendorQuestion } from './api';
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
 * Ticket 3.4. Questions as rows, options as columns, grouped and ordered.
 *
 * The grid scrolls horizontally inside its own container rather than widening
 * the page — the app has no page-level horizontal scroll, and letting a wide
 * table create one would drag the sidebar sideways with it. The question column
 * is sticky so a row stays readable however far right you scroll.
 *
 * Cells save on blur. Ticket 3.5 replaces that with debounced autosave and the
 * flush-on-navigate guarantee its AC asks for.
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
  const save = useSaveVendorAnswer(weddingId);

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
                  'px-4 py-2.5 text-left text-[11px] font-semibold tracking-wider text-stone-400 uppercase',
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
                onSave={(optionId, questionId, answer) =>
                  save.mutate({ optionId, questionId, answer })
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
  onSave,
}: {
  group: VendorQuestionGroup;
  questions: VendorQuestion[];
  options: VendorOptionRow[];
  columns: number;
  answers: Map<string, { answer: string | null }> | undefined;
  canEdit: boolean;
  onSave: (optionId: string, questionId: number, answer: string) => void;
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
              <span className="mt-0.5 flex items-start gap-1 text-[11px] leading-snug text-stone-400">
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
                className="border-b border-l border-stone-100 p-0 group-hover/row:bg-stone-50/60"
              >
                {/* Uncontrolled with a key: React re-mounts the cell when the
                    stored answer changes, so a server update lands, but typing
                    is never interrupted by a re-render mid-keystroke. */}
                <textarea
                  key={`${key}:${value}`}
                  defaultValue={value}
                  disabled={!canEdit}
                  rows={2}
                  placeholder="—"
                  onBlur={(e) => {
                    if (e.target.value !== value && q.id !== null) {
                      onSave(o.id, q.id, e.target.value);
                    }
                  }}
                  className={cn(
                    'h-full w-full resize-none bg-transparent px-3 py-2 text-[13px] leading-snug',
                    'text-stone-800 placeholder:text-stone-300',
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
