import { useMemo, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { Clock, FileCheck, Filter, Phone, Plus, Store, Wallet } from 'lucide-react';
import {
  useCreateVendor,
  useDeleteVendor,
  useUpdateVendor,
  useVendorFinancials,
  useVendors,
  type VendorFinancials,
} from './vendorsApi';
import { VendorDetail } from './VendorDetail';
import { currencyDecimals, formatMoney } from '../../lib/units';
import type { MyWedding, VendorRow, VendorStatus } from '../../types/db';
import {
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  ErrorState,
  InlineError,
  Modal,
  Page,
  PageHeader,
  Skeleton,
  Stat,
  cn,
} from '../../components/ui';

/** Researching → Confirmed, in the order the workbook's VendorStatus lists them. */
const PIPELINE: { status: VendorStatus; label: string }[] = [
  { status: 'researching', label: 'Researching' },
  { status: 'shortlisted', label: 'Shortlisted' },
  { status: 'negotiating', label: 'Negotiating' },
  { status: 'tentatively_booked', label: 'Tentative' },
  { status: 'confirmed', label: 'Confirmed' },
  { status: 'completed', label: 'Completed' },
];

const TONE: Record<VendorStatus, 'neutral' | 'good' | 'warn' | 'stop' | 'gold' | 'accent'> = {
  researching: 'neutral',
  shortlisted: 'neutral',
  negotiating: 'warn',
  tentatively_booked: 'gold',
  confirmed: 'good',
  completed: 'good',
  cancelled: 'stop',
};

/**
 * The vendor questions the alerts panel asks, each keyed by the query
 * parameter v_alerts uses for it.
 */
const FOCUSES: {
  param: string;
  value: string;
  label: string;
  matches: (v: VendorRow) => boolean;
}[] = [
  {
    param: 'status',
    value: 'researching',
    label: 'not yet confirmed',
    matches: (v) => v.status !== 'confirmed' && v.status !== 'cancelled',
  },
  {
    param: 'contract',
    value: 'missing',
    label: 'with no signed contract',
    matches: (v) => !v.contract_signed,
  },
  {
    param: 'phone',
    value: 'missing',
    label: 'with no phone number',
    matches: (v) => (v.phone ?? '').trim() === '',
  },
  {
    param: 'arrival',
    value: 'missing',
    label: 'with no arrival time set',
    matches: (v) => v.arrival_time === null,
  },
];

export function VendorsPage() {
  const { wedding } = useOutletContext<{ wedding: MyWedding }>();
  const currency = wedding.currency ?? 'LKR';
  const decimals = currencyDecimals(currency);
  const canEdit = wedding.role === 'owner' || wedding.role === 'partner';

  const vendors = useVendors(wedding.id);
  const create = useCreateVendor(wedding.id);
  const update = useUpdateVendor(wedding.id);
  const remove = useDeleteVendor(wedding.id);
  const financials = useVendorFinancials(wedding.id);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Ticket 7.5. Four of the 23 alerts are about vendors, and each asks a
  // different question: not confirmed, no contract, no phone, no arrival time.
  // This screen is a pipeline board rather than a list, so a deep link narrows
  // what the board shows instead of setting a dropdown — and says so, because
  // a board silently missing two thirds of its cards is alarming.
  const [params, setParams] = useSearchParams();
  const focus = FOCUSES.find((f) => params.get(f.param) === f.value) ?? null;

  const columns = useMemo(() => {
    const rows = (vendors.data ?? []).filter((v) => (focus ? focus.matches(v) : true));
    return PIPELINE.map((stage) => ({
      ...stage,
      vendors: rows.filter((v) => v.status === stage.status),
    }));
  }, [vendors.data, focus]);

  const focusCount = columns.reduce((sum, c) => sum + c.vendors.length, 0);

  const cancelled = (vendors.data ?? []).filter((v) => v.status === 'cancelled');

  // The page had no summary at all: six columns of small cards and nothing
  // telling you where the whole thing stands.
  const summary = useMemo(() => {
    const live = (vendors.data ?? []).filter((v) => v.status !== 'cancelled');
    let forecast = 0;
    let paid = 0;
    let noPhone = 0;
    let unsigned = 0;
    for (const v of live) {
      const m = financials.data?.get(v.id);
      const lines = Number(m?.budget_line_count ?? 0);
      forecast += lines > 0 ? Number(m?.forecast_minor ?? 0) : v.negotiated_minor || v.quoted_minor;
      paid += Number(m?.paid_minor ?? 0);
      if ((v.phone ?? '').trim() === '') noPhone += 1;
      if (!v.contract_signed) unsigned += 1;
    }
    return {
      total: live.length,
      confirmed: live.filter((v) => v.status === 'confirmed' || v.status === 'completed').length,
      forecast,
      paid,
      noPhone,
      unsigned,
    };
  }, [vendors.data, financials.data]);
  const selected = (vendors.data ?? []).find((v) => v.id === selectedId) ?? null;

  if (vendors.isLoading) {
    return (
      <Page width="wide">
        <PageHeader title="Vendors" />
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </Page>
    );
  }
  if (vendors.error) {
    return (
      <Page width="wide">
        <PageHeader title="Vendors" />
        <ErrorState error={vendors.error} onRetry={() => void vendors.refetch()} />
      </Page>
    );
  }

  return (
    <Page width="wide">
      <PageHeader
        title="Vendors"
        description="Everyone you are hiring, from first enquiry to signed and done. Move a card along as things firm up."
        actions={
          canEdit && (
            <Button
              icon={<Plus className="size-4" />}
              loading={create.isPending}
              onClick={() =>
                create.mutate(
                  { name: 'New vendor', category: 'Other', status: 'researching' },
                  { onSuccess: (row) => setSelectedId(row.id) },
                )
              }
            >
              Add vendor
            </Button>
          )
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Vendors"
          value={summary.total}
          icon={<Store className="size-3.5" />}
          hint={`${summary.confirmed} confirmed`}
        />
        <Stat
          label={`Committed (${currency})`}
          value={formatMoney(summary.forecast, decimals)}
          icon={<Wallet className="size-3.5" />}
          hint="negotiated, or what their lines forecast"
        />
        <Stat
          label={`Paid (${currency})`}
          value={formatMoney(summary.paid, decimals)}
          tone={summary.forecast > 0 && summary.paid >= summary.forecast ? 'good' : undefined}
          hint={`${formatMoney(Math.max(summary.forecast - summary.paid, 0), decimals)} still to pay`}
        />
        <Stat
          label="Loose ends"
          value={summary.unsigned + summary.noPhone}
          tone={summary.unsigned + summary.noPhone > 0 ? 'bad' : 'good'}
          hint={`${summary.unsigned} unsigned · ${summary.noPhone} with no number`}
        />
      </div>

      {/* Where the whole list stands, in one strip. The board answers this by
          making you count six columns. */}
      {summary.total > 0 && (
        <div className="mb-5">
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-stone-100">
            {columns.map((c) => (
              <div
                key={c.status}
                title={`${c.label}: ${c.vendors.length}`}
                style={{ width: `${(c.vendors.length / summary.total) * 100}%` }}
                className={cn(
                  c.status === 'confirmed'
                    ? 'bg-emerald-500'
                    : c.status === 'completed'
                      ? 'bg-emerald-700'
                      : c.status === 'tentatively_booked'
                        ? 'bg-wine-500'
                        : c.status === 'negotiating'
                          ? 'bg-wine-300'
                          : c.status === 'shortlisted'
                            ? 'bg-gold-300'
                            : 'bg-stone-300',
                )}
              />
            ))}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs sm:text-[11px] text-stone-500">
            {columns
              .filter((c) => c.vendors.length > 0)
              .map((c) => (
                <span key={c.status}>
                  {c.label} {c.vendors.length}
                </span>
              ))}
          </div>
        </div>
      )}

      <InlineError error={create.error ?? update.error ?? remove.error} />

      {/* Says what it is showing and offers the way out. A board quietly
          missing two thirds of its cards is worse than no filter at all. */}
      {focus && (
        <p className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-wine-50 px-4 py-2.5 text-sm text-wine-900">
          <Filter className="size-4 shrink-0" />
          <span className="flex-1">
            Showing the {focusCount} {focusCount === 1 ? 'vendor' : 'vendors'} {focus.label}.
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const next = new URLSearchParams(params);
              next.delete(focus.param);
              setParams(next, { replace: true });
            }}
          >
            Show all vendors
          </Button>
        </p>
      )}

      {(vendors.data ?? []).length === 0 ? (
        <EmptyState
          icon={<Store className="size-5" />}
          title="No vendors yet"
          description="Add one here, or choose an option on the comparison screen and record it as a vendor in one click."
        />
      ) : (
        /* A board rather than a table: the pipeline is the point, and status is
           the only field worth seeing for every vendor at once.
           auto-fill with a 17rem floor rather than six fixed columns — at six
           across, every card was an 11px strip and the whole screen read as
           noise. Now the columns wrap and each card has room to be legible. */
        <div className="grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-4">
          {columns.map((column) => (
            <div key={column.status} className="min-w-0">
              <div className="mb-2 flex items-center gap-2 border-b border-stone-200 px-1 pb-1.5">
                <span
                  className={cn(
                    'size-1.5 shrink-0 rounded-full',
                    column.status === 'confirmed'
                      ? 'bg-emerald-500'
                      : column.status === 'completed'
                        ? 'bg-stone-400'
                        : 'bg-wine-400',
                  )}
                />
                <span className="min-w-0 flex-1 truncate text-xs font-semibold tracking-wide text-stone-600 uppercase">
                  {column.label}
                </span>
                <span className="tabular shrink-0 text-xs text-stone-500">
                  {column.vendors.length}
                </span>
              </div>

              <div className="space-y-2.5">
                {column.vendors.map((vendor) => (
                  <VendorCard
                    key={vendor.id}
                    vendor={vendor}
                    currency={currency}
                    decimals={decimals}
                    canEdit={canEdit}
                    money={financials.data?.get(vendor.id)}
                    onOpen={() => setSelectedId(vendor.id)}
                    onStatus={(status) => update.mutate({ id: vendor.id, patch: { status } })}
                  />
                ))}
                {column.vendors.length === 0 && (
                  <div className="rounded-xl border border-dashed border-stone-200 px-3 py-8 text-center text-xs text-stone-500">
                    Nothing at this stage
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {cancelled.length > 0 && (
        <Card className="mt-5">
          <CardBody className="pt-4">
            <p className="mb-2 text-xs sm:text-[11px] font-semibold tracking-wider text-stone-500 uppercase">
              Cancelled
            </p>
            <div className="flex flex-wrap gap-2">
              {cancelled.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedId(v.id)}
                  className="focus-ring rounded-lg bg-stone-100 px-2.5 py-1 text-xs text-stone-500 line-through hover:bg-stone-200"
                >
                  {v.name}
                </button>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        title={selected?.name ?? ''}
        subtitle={selected?.category ?? undefined}
        badge={
          selected && (
            <Badge tone={TONE[selected.status]}>
              {PIPELINE.find((p) => p.status === selected.status)?.label ?? selected.status}
            </Badge>
          )
        }
      >
        {selected && (
          <VendorDetail
            vendor={selected}
            weddingId={wedding.id}
            currency={currency}
            decimals={decimals}
            canEdit={canEdit}
            onSave={(patch) => update.mutate({ id: selected.id, patch })}
            saving={update.isPending}
            onDelete={() => {
              remove.mutate(selected.id);
              setSelectedId(null);
            }}
          />
        )}
      </Modal>
    </Page>
  );
}

function VendorCard({
  vendor,
  currency,
  decimals,
  canEdit,
  money,
  onOpen,
  onStatus,
}: {
  vendor: VendorRow;
  currency: string;
  decimals: number;
  canEdit: boolean;
  money?: VendorFinancials;
  onOpen: () => void;
  onStatus: (status: VendorStatus) => void;
}) {
  // Prefer what the linked budget lines forecast over the figure typed on the
  // vendor: the lines are where payments actually land.
  const lineCount = Number(money?.budget_line_count ?? 0);
  const forecast = Number(money?.forecast_minor ?? 0);
  const paid = Number(money?.paid_minor ?? 0);
  const price = lineCount > 0 ? forecast : vendor.negotiated_minor || vendor.quoted_minor;
  const overpaid = Number(money?.overpaid_minor ?? 0) > 0;
  const progress = price > 0 ? Math.min(paid / price, 1) : 0;

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-raised">
      <button
        type="button"
        onClick={onOpen}
        className="focus-ring block w-full px-3.5 pt-3.5 pb-3 text-left"
      >
        <div className="flex items-start gap-2.5">
          {/* Two letters of the trade. A board of thirty cards needs something
              to scan by that is not another line of grey text. */}
          <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-wine-50 text-[11px] sm:text-[10px] font-semibold tracking-wide text-wine-700 ring-1 ring-wine-100"
          >
            {(vendor.category ?? '?').slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-stone-900">{vendor.name}</p>
            <p className="truncate text-xs text-stone-500">{vendor.category}</p>
          </div>
          {vendor.contract_signed && (
            <FileCheck
              className="mt-0.5 size-3.5 shrink-0 text-emerald-600"
              aria-label="Contract signed"
            />
          )}
        </div>

        {/* The money, given room. This is the number people are comparing
            across the board, and at 11px in a run of grey text it was
            unreadable. */}
        {price > 0 && (
          <div className="mt-3">
            <p className="tabular text-base leading-none font-semibold text-stone-900">
              <span className="mr-1 text-[11px] sm:text-[10px] font-normal text-stone-500">
                {currency}
              </span>
              {formatMoney(price, decimals)}
            </p>
            {paid > 0 && (
              <>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      overpaid ? 'bg-red-500' : progress >= 1 ? 'bg-emerald-500' : 'bg-wine-500',
                    )}
                    style={{ width: `${Math.round(progress * 100)}%` }}
                  />
                </div>
                <p className="tabular mt-1 text-xs sm:text-[11px] text-stone-500">
                  {formatMoney(paid, decimals)} paid
                  {overpaid ? ' · over' : progress >= 1 ? ' · settled' : ''}
                </p>
              </>
            )}
          </div>
        )}

        <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs sm:text-[11px] text-stone-500">
          {vendor.phone ? (
            <span className="flex items-center gap-1">
              <Phone className="size-3" />
              {vendor.phone}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-700">
              <Phone className="size-3" />
              no number
            </span>
          )}
          {lineCount > 0 && (
            <span className="flex items-center gap-1">
              <Wallet className="size-3" />
              {lineCount} {lineCount === 1 ? 'line' : 'lines'}
            </span>
          )}
          {vendor.arrival_time && (
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {String(vendor.arrival_time).slice(0, 5)}
            </span>
          )}
        </div>
      </button>

      {canEdit && (
        /* Status changes from the card itself: it is the only field worth
           editing without opening anything. On its own strip now, so it reads
           as a control rather than as one more line of the card. */
        <div className="border-t border-stone-100 bg-stone-50/70 px-2 py-1.5">
          <select
            aria-label={`Stage for ${vendor.name}`}
            value={vendor.status}
            onChange={(e) => onStatus(e.target.value as VendorStatus)}
            className="focus-ring w-full rounded-md border-0 bg-transparent px-1 py-0.5 text-xs font-medium text-stone-600"
          >
            {PIPELINE.map((st) => (
              <option key={st.status} value={st.status}>
                {st.label}
              </option>
            ))}
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      )}
    </Card>
  );
}

export { TONE as VENDOR_STATUS_TONE };
