import { useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, Check, FileUp, Minus, Plus, RefreshCw } from 'lucide-react';
import { parseCsv } from '../../../lib/csv';
import {
  IMPORT_FIELDS,
  autoMapHeaders,
  buildImportPlan,
  type ImportField,
  type ImportPlan,
  type PlannedRow,
} from './plan';
import { useImportGuests, type ImportResult } from './api';
import { useGuestGroups, useGuests } from '../api';
import {
  Badge,
  Button,
  InlineError,
  Modal,
  Section,
  Select,
  Stat,
  cn,
} from '../../../components/ui';

type Step = 'choose' | 'map' | 'done';

/**
 * Ticket 4.2. Three screens, in the order the person's confidence builds:
 * pick a file, confirm what the columns mean, then read what will happen before
 * anything is written. The commit button says how many rows it will touch,
 * because "Import" alone is not a decision anyone can make.
 */
export function ImportGuestsModal({
  weddingId,
  decimals,
  open,
  onClose,
}: {
  weddingId: string;
  /** The wedding's currency decimals, for the gift columns. */
  decimals: number;
  open: boolean;
  onClose: () => void;
}) {
  const guests = useGuests(weddingId);
  const groups = useGuestGroups(weddingId);
  const importer = useImportGuests(weddingId);

  const [step, setStep] = useState<Step>('choose');
  const [fileName, setFileName] = useState('');
  const [grid, setGrid] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<(ImportField | null)[]>([]);
  const [readError, setReadError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStep('choose');
    setFileName('');
    setGrid([]);
    setMapping([]);
    setReadError(null);
    setResult(null);
    importer.reset();
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setReadError(null);
    try {
      const parsed = parseCsv(await file.text());
      if (parsed.length < 2) {
        setReadError('That file has no rows under its header.');
        return;
      }
      setFileName(file.name);
      setGrid(parsed);
      setMapping(autoMapHeaders(parsed[0]));
      setStep('map');
    } catch {
      setReadError('That file could not be read as CSV.');
    }
  }

  // Recomputed as the mapping changes, so correcting a column updates the
  // preview immediately rather than after a "re-check" button.
  const plan: ImportPlan | null = useMemo(() => {
    if (grid.length < 2) return null;
    return buildImportPlan({
      grid,
      mapping,
      existing: guests.data ?? [],
      groups: (groups.data ?? []).map((g) => ({ id: g.id, name: g.name })),
      decimals,
    });
  }, [grid, mapping, guests.data, groups.data, decimals]);

  const willWrite = plan ? plan.summary.create + plan.summary.update : 0;

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      size="full"
      title="Import guests from a spreadsheet"
      subtitle={fileName || 'A CSV exported from Excel, Numbers or Google Sheets'}
      badge={
        step === 'map' && plan ? (
          <Badge tone={plan.summary.error > 0 ? 'warn' : 'accent'}>
            {plan.rows.length} rows read
          </Badge>
        ) : undefined
      }
    >
      {step === 'choose' && (
        <ChooseFile inputRef={inputRef} error={readError} onPick={(f) => void onFile(f)} />
      )}

      {step === 'map' && plan && (
        <div className="space-y-6">
          <Section
            title="What each column means"
            description="Matched by header name where we could. Correct anything that looks wrong — nothing is written yet."
          >
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {grid[0].map((header, i) => (
                <div
                  key={`${header}-${i}`}
                  className="rounded-xl border border-stone-200 bg-white px-3 py-2"
                >
                  <p className="truncate text-xs font-medium text-stone-500" title={header}>
                    {header || `Column ${i + 1}`}
                  </p>
                  <Select
                    className="mt-1"
                    value={mapping[i] ?? ''}
                    onChange={(e) => {
                      const next = [...mapping];
                      next[i] = (e.target.value || null) as ImportField | null;
                      setMapping(next);
                    }}
                  >
                    <option value="">Do not import</option>
                    {IMPORT_FIELDS.map((f) => (
                      <option key={f.field} value={f.field}>
                        {f.label}
                      </option>
                    ))}
                  </Select>
                  <p className="mt-1 truncate text-xs sm:text-[11px] text-stone-500">
                    e.g. {grid[1]?.[i] || '—'}
                  </p>
                </div>
              ))}
            </div>
          </Section>

          {plan.fatal ? (
            <p className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <AlertTriangle className="size-4 shrink-0" />
              {plan.fatal}
            </p>
          ) : (
            <Preview plan={plan} />
          )}

          <div className="sticky bottom-0 -mx-6 flex items-center justify-between gap-3 border-t border-stone-100 bg-white/95 px-6 py-3 backdrop-blur">
            <Button variant="ghost" onClick={reset}>
              <ArrowLeft className="size-4" />
              Choose a different file
            </Button>
            <div className="flex items-center gap-3">
              {importer.error && <InlineError error={importer.error} />}
              <Button
                disabled={willWrite === 0 || !!plan.fatal}
                loading={importer.isPending}
                onClick={() =>
                  importer.mutate(plan, {
                    onSuccess: (r) => {
                      setResult(r);
                      setStep('done');
                    },
                  })
                }
              >
                {willWrite === 0
                  ? 'Nothing to import'
                  : `Import ${willWrite} ${willWrite === 1 ? 'row' : 'rows'}`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === 'done' && result && (
        <div className="space-y-4 py-8 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <Check className="size-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-stone-900">Import finished</h3>
            <p className="mt-1 text-sm text-stone-500">
              {result.created} added, {result.updated} updated
              {result.groupsCreated > 0 && `, ${result.groupsCreated} new groups`}.
            </p>
          </div>
          <div className="flex justify-center gap-2">
            <Button variant="secondary" onClick={reset}>
              <RefreshCw className="size-4" />
              Import another file
            </Button>
            <Button
              onClick={() => {
                reset();
                onClose();
              }}
            >
              Back to the guest list
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function ChooseFile({
  inputRef,
  error,
  onPick,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  error: string | null;
  onPick: (file: File | undefined) => void;
}) {
  const [dragging, setDragging] = useState(false);

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          onPick(e.dataTransfer.files[0]);
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors',
          dragging ? 'border-wine-400 bg-wine-50/60' : 'border-stone-200 bg-stone-50/60',
        )}
        onClick={() => inputRef.current?.click()}
      >
        <div className="flex size-11 items-center justify-center rounded-2xl bg-white text-wine-700 shadow-card">
          <FileUp className="size-5" />
        </div>
        <div>
          <p className="text-sm font-medium text-stone-800">Drop a CSV here, or click to choose</p>
          <p className="mt-1 text-sm text-stone-500">
            Nothing is saved until you have seen what it will do.
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv,text/plain"
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0])}
        />
      </div>

      {error && (
        <p className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="size-4 shrink-0" />
          {error}
        </p>
      )}

      <Section
        title="What the file needs"
        description="One row per household, the way the guest list is counted everywhere else in the app."
      >
        <ul className="space-y-1.5 text-sm text-stone-600">
          <li>
            <span className="font-medium text-stone-800">A household name column</span> — the only
            one that is required. Anything else is optional.
          </li>
          <li>
            Common headers are recognised automatically: name, adults, children, phone, email, side,
            city, group, VIP.
          </li>
          <li>
            <span className="font-medium text-stone-800">A blank cell changes nothing.</span> A file
            of names and phone numbers will not clear anything else.
          </li>
          <li>
            Rows matching a household already on the list are updated, not duplicated — so the same
            file can be imported twice safely.
          </li>
        </ul>
      </Section>
    </div>
  );
}

const ACTION_TONE = {
  create: 'good',
  update: 'accent',
  skip: 'neutral',
  error: 'stop',
} as const;

const ACTION_LABEL = {
  create: 'add',
  update: 'update',
  skip: 'no change',
  error: 'problem',
} as const;

function Preview({ plan }: { plan: ImportPlan }) {
  const [filter, setFilter] = useState<PlannedRow['action'] | 'all'>('all');
  const rows = plan.rows.filter((r) => filter === 'all' || r.action === filter);

  return (
    <Section
      title="What will happen"
      description="Every row, before anything is written. Rows with a problem are left alone; the rest still import."
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <button type="button" onClick={() => setFilter(filter === 'create' ? 'all' : 'create')}>
          <Stat label="To add" value={String(plan.summary.create)} icon={<Plus />} />
        </button>
        <button type="button" onClick={() => setFilter(filter === 'update' ? 'all' : 'update')}>
          <Stat label="To update" value={String(plan.summary.update)} icon={<RefreshCw />} />
        </button>
        <button type="button" onClick={() => setFilter(filter === 'skip' ? 'all' : 'skip')}>
          <Stat label="Unchanged" value={String(plan.summary.skip)} icon={<Minus />} />
        </button>
        <button type="button" onClick={() => setFilter(filter === 'error' ? 'all' : 'error')}>
          <Stat
            label="Problems"
            value={String(plan.summary.error)}
            icon={<AlertTriangle />}
            tone={plan.summary.error > 0 ? 'bad' : undefined}
          />
        </button>
      </div>

      {plan.groupsToCreate.length > 0 && (
        <p className="mt-3 text-sm text-stone-500">
          New groups will be created: {plan.groupsToCreate.join(', ')}.
        </p>
      )}

      {filter !== 'all' && (
        <button
          type="button"
          onClick={() => setFilter('all')}
          className="mt-3 text-sm text-wine-700 underline underline-offset-2"
        >
          Showing {ACTION_LABEL[filter]} rows only — show everything
        </button>
      )}

      <div className="scroll-subtle mt-3 max-h-80 overflow-y-auto rounded-xl border border-stone-200">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-stone-50 text-left text-xs text-stone-500">
            <tr>
              <th className="px-3 py-2 font-medium">Line</th>
              <th className="px-3 py-2 font-medium">Household</th>
              <th className="px-3 py-2 font-medium">Action</th>
              <th className="px-3 py-2 font-medium">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map((row) => (
              <tr key={row.lineNumber} className={cn(row.action === 'error' && 'bg-red-50/40')}>
                <td className="tabular px-3 py-2 text-stone-500">{row.lineNumber}</td>
                <td className="px-3 py-2 font-medium text-stone-800">
                  {row.values.household_name || <span className="text-stone-500">—</span>}
                </td>
                <td className="px-3 py-2">
                  <Badge tone={ACTION_TONE[row.action]}>{ACTION_LABEL[row.action]}</Badge>
                </td>
                <td className="px-3 py-2 text-stone-500">
                  {row.errors.length > 0 && (
                    <span className="text-red-700">{row.errors.join(' · ')}</span>
                  )}
                  {row.changes.length > 0 &&
                    row.changes.map((c) => (
                      <span key={c.label} className="mr-2 whitespace-nowrap">
                        {c.label}: <span className="text-stone-500 line-through">{c.from}</span>{' '}
                        {c.to}
                      </span>
                    ))}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-stone-500">
                  No rows of that kind.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
