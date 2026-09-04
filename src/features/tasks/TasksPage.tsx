import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarClock,
  Check,
  ChevronDown,
  ListChecks,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import {
  useCreateTask,
  useDeleteTask,
  useReadiness,
  useSetTaskStatus,
  useTasks,
  useUpdateTask,
  type TaskInput,
  type TaskRow,
} from './api';
import { TASK_VIEWS, countByView, describeDue, matchesView, type TaskView } from './views';
import { useOwnerOptions } from '../weddings/lookups';
import { useFilterParam } from '../../lib/filterParam';
import type { MyWedding, TaskStatus } from '../../types/db';
import {
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  ErrorState,
  Field,
  InlineError,
  Input,
  Modal,
  Page,
  PageHeader,
  Section,
  Select,
  SkeletonRows,
  Stat,
  Textarea,
  cn,
} from '../../components/ui';

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'not_started', label: 'Not started' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'waiting', label: 'Waiting on someone' },
  { value: 'completed', label: 'Done' },
  { value: 'cancelled', label: 'Not doing it' },
];

const PRIORITY_TONE: Record<string, 'neutral' | 'good' | 'warn' | 'stop' | 'gold'> = {
  critical: 'stop',
  high: 'warn',
  medium: 'neutral',
  low: 'neutral',
};

type GroupBy = 'area' | 'owner' | 'none';

/** Today as an ISO date, which is what the `date` columns hold. */
function todayIso(): string {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
}

/**
 * Tickets 5.1, 5.2 and 5.3.
 *
 * Ninety-three seeded tasks is more than anyone reads. So the screen opens on
 * "Still to do" rather than on everything, the view picker carries its own
 * counts so you can see there are four overdue without switching to find out,
 * and the list is sectioned by area with each section showing how far along it
 * is — which is 5.3's readiness, put where the work is rather than on a
 * dashboard you have to go and look at.
 */
export function TasksPage() {
  const { wedding } = useOutletContext<{ wedding: MyWedding }>();
  const canEdit = wedding.role === 'owner' || wedding.role === 'partner';

  const tasks = useTasks(wedding.id);
  const readiness = useReadiness(wedding.id);
  const owners = useOwnerOptions(wedding.id);
  const create = useCreateTask(wedding.id);
  const update = useUpdateTask(wedding.id);
  const setStatus = useSetTaskStatus(wedding.id);
  const remove = useDeleteTask(wedding.id);

  // Ticket 7.5. The view and the owner filter are what alerts link to.
  const [view, setView] = useFilterParam<TaskView>('view', 'open');
  const [groupBy, setGroupBy] = useState<GroupBy>('area');
  const [ownerFilter, setOwnerFilter] = useFilterParam<string>('owner', 'all');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Read once per render rather than inside the filters, so every row in a
  // pass is measured against the same day.
  const today = todayIso();
  // Memoised so it is a stable dependency for the passes below; `?? []`
  // alone hands out a fresh array whenever the query has no data yet.
  const rows = useMemo(() => tasks.data ?? [], [tasks.data]);

  const counts = useMemo(() => countByView(rows, today), [rows, today]);

  const areas = useMemo(
    () => [...new Set(rows.map((t) => t.category).filter(Boolean))].sort() as string[],
    [rows],
  );
  const ownerList = useMemo(() => {
    // The seeded owners plus anything already on a task, so a value typed
    // before it was a list still filters.
    const used = rows.map((t) => t.owner).filter(Boolean) as string[];
    return [...new Set([...(owners.data ?? []), ...used])].sort();
  }, [rows, owners.data]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((t) => {
      if (!matchesView(t, view, today)) return false;
      // 'nobody' is the alert's question: work with no owner gets done by
      // whoever remembers, which is nobody.
      if (ownerFilter === 'nobody' && (t.owner ?? '').trim() !== '') return false;
      if (ownerFilter !== 'all' && ownerFilter !== 'nobody' && (t.owner ?? '') !== ownerFilter) {
        return false;
      }
      if (areaFilter !== 'all' && (t.category ?? '') !== areaFilter) return false;
      if (needle) {
        const hay = [t.task, t.category, t.owner, t.notes].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [rows, view, ownerFilter, areaFilter, search, today]);

  const sections = useMemo(() => {
    if (groupBy === 'none') {
      return visible.length === 0 ? [] : [{ key: 'all', label: 'All tasks', tasks: visible }];
    }
    const buckets = new Map<string, TaskRow[]>();
    const leftovers: TaskRow[] = [];
    for (const t of visible) {
      const key = (groupBy === 'area' ? t.category : t.owner)?.trim();
      if (!key) {
        leftovers.push(t);
        continue;
      }
      const list = buckets.get(key);
      if (list) list.push(t);
      else buckets.set(key, [t]);
    }
    const out = [...buckets.keys()]
      .sort((a, b) => a.localeCompare(b))
      .map((key) => ({ key, label: key, tasks: buckets.get(key)! }));
    if (leftovers.length > 0) {
      out.push({
        key: 'unassigned',
        label: groupBy === 'area' ? 'Everything else' : 'Nobody assigned',
        tasks: leftovers,
      });
    }
    return out;
  }, [visible, groupBy]);

  const readinessByArea = useMemo(
    () => new Map((readiness.data ?? []).map((r) => [r.area as string, r])),
    [readiness.data],
  );

  const overall = useMemo(() => {
    let completed = 0;
    let relevant = 0;
    for (const r of readiness.data ?? []) {
      completed += Number(r.completed ?? 0);
      relevant += Number(r.task_count ?? 0) - Number(r.cancelled ?? 0);
    }
    return { completed, relevant, ratio: relevant === 0 ? 0 : completed / relevant };
  }, [readiness.data]);

  const editing = rows.find((t) => t.id === editingId) ?? null;

  if (tasks.isError) {
    return (
      <Page width="wide">
        <PageHeader title="Tasks" />
        <ErrorState error={tasks.error} onRetry={() => void tasks.refetch()} />
      </Page>
    );
  }

  return (
    <Page width="wide">
      <PageHeader
        title="Tasks"
        description="Seeded from the workbook and re-dated whenever the wedding date moves. Ninety-odd of them, so start with what is overdue."
        actions={
          canEdit && (
            <Button
              icon={<Plus className="size-4" />}
              loading={create.isPending}
              onClick={() =>
                create.mutate(
                  { task: 'New task', status: 'not_started' },
                  { onSuccess: (row) => setEditingId(row.id) },
                )
              }
            >
              Add task
            </Button>
          )
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Overdue"
          value={counts.overdue}
          icon={<AlertTriangle className="size-3.5" />}
          tone={counts.overdue > 0 ? 'bad' : 'good'}
          hint={counts.overdue > 0 ? 'past its date and not done' : 'nothing is late'}
        />
        <Stat
          label="This week"
          value={counts.this_week}
          icon={<CalendarClock className="size-3.5" />}
          hint="including anything already late"
        />
        <Stat
          label="Still to do"
          value={counts.open}
          icon={<ListChecks className="size-3.5" />}
          hint={`${counts.unscheduled} with no date`}
        />
        <Stat
          label="Readiness"
          value={`${Math.round(overall.ratio * 100)}%`}
          tone={overall.ratio >= 1 ? 'good' : undefined}
          hint={`${overall.completed} of ${overall.relevant} done`}
        />
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-stone-100 px-4 py-3">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-500" />
            <Input
              className="pl-9"
              placeholder="Search a task, area or owner"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Counts in the picker: the point of a view is to tell you whether
              it is worth switching to, and a bare label cannot. */}
          <Select
            className="w-44"
            aria-label="Which tasks"
            value={view}
            onChange={(e) => setView(e.target.value as TaskView)}
          >
            {TASK_VIEWS.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label} ({counts[v.value]})
              </option>
            ))}
          </Select>

          <Select
            className="w-36"
            aria-label="Owner"
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
          >
            <option value="all">Anyone</option>
            <option value="nobody">Nobody assigned</option>
            {ownerList.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </Select>

          <Select
            className="w-40"
            aria-label="Area"
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
          >
            <option value="all">Every area</option>
            {areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>

          <Select
            className="w-36"
            aria-label="Group by"
            value={groupBy}
            onChange={(e) => {
              setGroupBy(e.target.value as GroupBy);
              setCollapsed(new Set());
            }}
          >
            <option value="area">By area</option>
            <option value="owner">By owner</option>
            <option value="none">One flat list</option>
          </Select>
        </div>

        <CardBody className="px-0 pb-0">
          {tasks.isLoading ? (
            <div className="px-4 py-2">
              <SkeletonRows rows={10} />
            </div>
          ) : sections.length === 0 ? (
            <div className="px-4 py-6">
              <EmptyState
                icon={<ListChecks className="size-5" />}
                title={rows.length === 0 ? 'No tasks yet' : 'Nothing in this view'}
                description={
                  rows.length === 0
                    ? 'Seeding the wedding brings in the workbook’s task list.'
                    : 'Try a wider view, or clear the owner and area filters.'
                }
              />
            </div>
          ) : (
            <div>
              {sections.map((sec) => {
                const isCollapsed = collapsed.has(sec.key);
                const ready = groupBy === 'area' ? readinessByArea.get(sec.label) : undefined;
                const ratio = ready?.ratio === null ? null : Number(ready?.ratio ?? 0);
                return (
                  <section key={sec.key}>
                    {groupBy !== 'none' && (
                      <button
                        type="button"
                        onClick={() =>
                          setCollapsed((prev) => {
                            const next = new Set(prev);
                            if (next.has(sec.key)) next.delete(sec.key);
                            else next.add(sec.key);
                            return next;
                          })
                        }
                        className="focus-ring sticky top-0 z-10 flex w-full items-center gap-3 border-y border-stone-100 bg-stone-50/95 px-4 py-2 text-left backdrop-blur"
                      >
                        <ChevronDown
                          className={cn(
                            'size-3.5 shrink-0 text-stone-500 transition-transform',
                            isCollapsed && '-rotate-90',
                          )}
                        />
                        <span className="min-w-0 flex-1 truncate text-xs font-semibold tracking-wide text-stone-600 uppercase">
                          {sec.label}
                        </span>
                        {/* 5.3, where the work is. A bar on a dashboard is a
                            number you have to go and look for. */}
                        {ready && ratio !== null && (
                          <span className="flex shrink-0 items-center gap-2">
                            <span className="h-1.5 w-20 overflow-hidden rounded-full bg-stone-200">
                              <span
                                className={cn(
                                  'block h-full rounded-full',
                                  ratio >= 1 ? 'bg-emerald-500' : 'bg-wine-500',
                                )}
                                style={{ width: `${Math.round(ratio * 100)}%` }}
                              />
                            </span>
                            <span className="tabular w-8 text-right text-[11px] text-stone-500">
                              {Math.round(ratio * 100)}%
                            </span>
                          </span>
                        )}
                        {ready && Number(ready.overdue ?? 0) > 0 && (
                          <Badge tone="stop">{ready.overdue} late</Badge>
                        )}
                        <span className="tabular shrink-0 text-[11px] text-stone-500">
                          {sec.tasks.length}
                        </span>
                      </button>
                    )}
                    {!isCollapsed && (
                      <ul className="divide-y divide-stone-100">
                        {sec.tasks.map((t) => (
                          <TaskRowItem
                            key={t.id}
                            task={t}
                            today={today}
                            canEdit={canEdit}
                            showArea={groupBy !== 'area'}
                            onOpen={() => setEditingId(t.id)}
                            onToggle={() =>
                              setStatus.mutate({
                                id: t.id,
                                status: t.status === 'completed' ? 'not_started' : 'completed',
                              })
                            }
                          />
                        ))}
                      </ul>
                    )}
                  </section>
                );
              })}
            </div>
          )}
          <div className="px-4 py-3">
            <InlineError error={create.error ?? update.error ?? setStatus.error ?? remove.error} />
          </div>
        </CardBody>
      </Card>

      {editing && (
        <TaskModal
          task={editing}
          areas={areas}
          owners={ownerList}
          canEdit={canEdit}
          saving={update.isPending}
          removing={remove.isPending}
          onSave={(patch) => update.mutate({ id: editing.id, patch })}
          onRemove={() => remove.mutate(editing.id, { onSuccess: () => setEditingId(null) })}
          onClose={() => setEditingId(null)}
        />
      )}
    </Page>
  );
}

function TaskRowItem({
  task,
  today,
  canEdit,
  showArea,
  onOpen,
  onToggle,
}: {
  task: TaskRow;
  today: string;
  canEdit: boolean;
  showArea: boolean;
  onOpen: () => void;
  onToggle: () => void;
}) {
  const done = task.status === 'completed';
  const dropped = task.status === 'cancelled';
  const relative = describeDue(task.due_date, today);
  const late = !done && !dropped && task.due_date !== null && task.due_date < today;

  return (
    <li
      onClick={onOpen}
      className="flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-stone-50/70"
    >
      {/* The one-click action, kept out of the row's own click so ticking
          something off never opens a modal on top of it. */}
      <button
        type="button"
        aria-label={done ? `Mark "${task.task}" not done` : `Mark "${task.task}" done`}
        disabled={!canEdit}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={cn(
          'focus-ring flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors',
          done
            ? 'border-emerald-500 bg-emerald-500 text-white'
            : 'border-stone-300 hover:border-emerald-500',
        )}
      >
        {done && <Check className="size-3" />}
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'truncate text-sm',
            done || dropped ? 'text-stone-500 line-through decoration-stone-300' : 'text-stone-900',
          )}
        >
          {task.task}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-stone-500">
          {showArea && task.category && <span>{task.category}</span>}
          {task.owner && <span>· {task.owner}</span>}
          {task.priority && task.priority !== 'medium' && task.priority !== 'low' && (
            <Badge tone={PRIORITY_TONE[task.priority]}>{task.priority}</Badge>
          )}
          {task.status === 'waiting' && <Badge tone="warn">waiting</Badge>}
          {task.status === 'in_progress' && <Badge tone="accent">in progress</Badge>}
          {task.due_date_overridden && (
            <span title="This date was set by hand and will not move with the wedding date">
              · pinned
            </span>
          )}
        </p>
      </div>

      <div className="shrink-0 text-right">
        {relative ? (
          <>
            <p className={cn('text-xs', late ? 'font-medium text-red-700' : 'text-stone-500')}>
              {relative}
            </p>
            <p className="tabular text-[11px] text-stone-500">{task.due_date}</p>
          </>
        ) : (
          <p className="text-[11px] text-stone-500">no date</p>
        )}
      </div>
    </li>
  );
}

function TaskModal({
  task,
  areas,
  owners,
  canEdit,
  saving,
  removing,
  onSave,
  onRemove,
  onClose,
}: {
  task: TaskRow;
  areas: string[];
  owners: string[];
  canEdit: boolean;
  saving: boolean;
  removing: boolean;
  onSave: (patch: TaskInput) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={task.task}
      subtitle={task.category ?? 'No area set'}
      badge={
        task.status === 'completed' ? (
          <Badge tone="good">done</Badge>
        ) : task.status === 'cancelled' ? (
          <Badge tone="neutral">not doing it</Badge>
        ) : undefined
      }
    >
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <Section title="The task">
            <Field label="What needs doing">
              <Textarea
                key={`task-${task.id}-${task.updated_at}`}
                rows={2}
                disabled={!canEdit}
                defaultValue={task.task}
                onBlur={(e) => {
                  const next = e.target.value.trim();
                  if (next && next !== task.task) onSave({ task: next });
                }}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Area">
                <Select
                  disabled={!canEdit}
                  value={task.category ?? ''}
                  onChange={(e) => onSave({ category: e.target.value || null })}
                >
                  <option value="">Not set</option>
                  {areas.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Owner">
                <Select
                  disabled={!canEdit}
                  value={task.owner ?? ''}
                  onChange={(e) => onSave({ owner: e.target.value || null })}
                >
                  <option value="">Nobody yet</option>
                  {owners.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Status">
              <Select
                disabled={!canEdit}
                value={task.status}
                onChange={(e) => onSave({ status: e.target.value as TaskStatus })}
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
          </Section>

          <Section title="Notes">
            <Textarea
              key={`notes-${task.id}-${task.updated_at}`}
              rows={4}
              disabled={!canEdit}
              defaultValue={task.notes ?? ''}
              onBlur={(e) => {
                const next = e.target.value.trim() || null;
                if (next !== (task.notes ?? null)) onSave({ notes: next });
              }}
            />
          </Section>
        </div>

        <div className="space-y-4">
          <Section
            title="When"
            description="Seeded dates move with the wedding date. Setting one by hand pins it, and the re-dating engine leaves it alone from then on."
          >
            <Field label="Due date">
              <Input
                type="date"
                disabled={!canEdit}
                value={task.due_date ?? ''}
                onChange={(e) =>
                  onSave({
                    due_date: e.target.value || null,
                    // Ticket 1.7 / risk R9: a hand-set date must survive the
                    // wedding date moving, so writing one sets the flag that
                    // tells the engine to skip this row.
                    due_date_overridden: Boolean(e.target.value),
                  })
                }
              />
            </Field>

            {task.offset_days !== null && (
              <p className="text-xs text-stone-500">
                From the template:{' '}
                {task.offset_days === 0
                  ? 'on the wedding day'
                  : task.offset_days < 0
                    ? `${Math.abs(task.offset_days)} days before the wedding`
                    : `${task.offset_days} days after the wedding`}
                .
              </p>
            )}

            {task.due_date_overridden && canEdit && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onSave({ due_date_overridden: false })}
              >
                Let it move with the wedding date again
              </Button>
            )}
          </Section>

          {canEdit && (
            <Section title="Remove">
              {confirming ? (
                <div className="flex items-center gap-2">
                  <Button variant="danger" loading={removing} onClick={onRemove}>
                    Delete this task
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirming(false)}>
                    Keep it
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    icon={<Trash2 className="size-4" />}
                    onClick={() => setConfirming(true)}
                  >
                    Delete
                  </Button>
                  <p className="text-xs text-stone-500">
                    If you are simply not doing it, set the status to “Not doing it” instead — that
                    keeps it out of the readiness figure without losing the record.
                  </p>
                </div>
              )}
            </Section>
          )}
        </div>
      </div>

      {saving && <p className="mt-4 text-xs text-stone-500">Saving…</p>}
    </Modal>
  );
}
