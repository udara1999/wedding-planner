import { PackagePlus, RefreshCw } from 'lucide-react';
import { PENDING_SOURCES, pendingTotal, useSeedWedding, useTemplatePending } from './api';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  InlineError,
  cn,
} from '../../components/ui';

/**
 * Plan risk R4, finally built: "later add an opt-in 'pull new items' diff
 * screen".
 *
 * seed_wedding runs once, when a wedding is created, and only ever inserts.
 * Every improvement to the template after that reached new weddings and no
 * existing one — which is how a couple ends up looking at fourteen empty
 * checklist screens while the content sits in the database.
 *
 * Re-running it has always been safe: every insert is ON CONFLICT DO NOTHING
 * on (wedding_id, source_template_id), so it adds only what is new and cannot
 * touch anything already edited. What was missing was any way to know there was
 * something to pull, and a button to pull it. Both are here, and the button
 * says the number so it is not a leap of faith.
 */
export function TemplateUpdateCard({
  weddingId,
  canEdit,
}: {
  weddingId: string;
  canEdit: boolean;
}) {
  const pending = useTemplatePending(weddingId);
  const seed = useSeedWedding();

  const row = pending.data;
  const total = pendingTotal(row);
  const behind =
    row?.available_version != null &&
    row?.seeded_version != null &&
    Number(row.available_version) > Number(row.seeded_version);

  if (pending.isLoading) return null;

  // The counting view failing must never read as "nothing to do". It did
  // exactly that when authenticated lacked USAGE on schema template: the query
  // errored, the count came out zero, and this card said "up to date" while
  // fourteen modules sat empty.
  const countUnknown = pending.isError;

  return (
    <Card className={cn(total > 0 && 'border-wine-300 ring-1 ring-wine-100')}>
      <CardHeader className="flex-wrap">
        <CardTitle>Template content</CardTitle>
        {countUnknown ? (
          <Badge tone="warn">count unavailable</Badge>
        ) : total > 0 ? (
          <Badge tone="accent">{total} to add</Badge>
        ) : (
          <Badge tone="good">up to date</Badge>
        )}
        {behind && (
          <span className="text-xs text-stone-500">
            seeded at v{row?.seeded_version} · v{row?.available_version} available
          </span>
        )}
      </CardHeader>

      <CardBody className="space-y-3">
        {countUnknown ? (
          <>
            <p className="text-sm text-stone-600">
              We could not work out what this wedding is missing. Adding template content is still
              safe to try — it only ever inserts what is not already here.
            </p>
            <InlineError error={pending.error} />
          </>
        ) : total === 0 ? (
          <p className="text-sm text-stone-600">
            This wedding has everything the {row?.locale ?? 'poruwa'} template offers. Anything
            added to the template later will show up here.
          </p>
        ) : (
          <>
            <p className="text-sm text-stone-600">
              The template has gained content since this wedding was set up. Adding it brings in the
              rows below and{' '}
              <span className="font-medium text-stone-800">
                changes nothing you have already entered
              </span>{' '}
              — anything you have edited, renamed or switched off stays exactly as it is.
            </p>

            <ul className="grid gap-1 sm:grid-cols-2">
              {PENDING_SOURCES.filter((s) => Number(row?.[s.key] ?? 0) > 0).map((s) => (
                <li key={String(s.key)} className="flex items-center gap-2 text-sm">
                  <PackagePlus className="size-3.5 shrink-0 text-wine-600" />
                  <span className="min-w-0 flex-1 truncate text-stone-700">{s.label}</span>
                  <span className="tabular shrink-0 text-xs text-stone-500">
                    {Number(row?.[s.key] ?? 0)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Always offered, never gated on the count. Re-seeding is idempotent,
            so the worst case is that it adds nothing — whereas hiding the
            button behind a number leaves somebody stuck the moment the number
            is wrong, which is precisely what happened. */}
        {canEdit && (
          <div className="flex flex-wrap items-center gap-3 border-t border-stone-100 pt-3">
            <Button
              variant={total > 0 || countUnknown ? 'primary' : 'secondary'}
              icon={<RefreshCw className="size-4" />}
              loading={seed.isPending}
              onClick={() => seed.mutate(weddingId, { onSuccess: () => void pending.refetch() })}
            >
              {total > 0
                ? `Add ${total} ${total === 1 ? 'item' : 'items'}`
                : 'Check for template content'}
            </Button>
            {seed.isSuccess && (
              <span className="text-sm text-emerald-700">
                Added {seed.data} {seed.data === 1 ? 'row' : 'rows'}.
              </span>
            )}
            <InlineError error={seed.error} />
          </div>
        )}

        {!canEdit && (
          <p className="border-t border-stone-100 pt-3 text-xs text-stone-500">
            Only an owner can bring in new template content.
          </p>
        )}
      </CardBody>
    </Card>
  );
}
