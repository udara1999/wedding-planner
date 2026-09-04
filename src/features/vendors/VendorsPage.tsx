import { useMemo, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { Filter, Phone, Plus, Store } from 'lucide-react';
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
           the only field worth seeing for every vendor at once. */
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {columns.map((column) => (
            <div key={column.status} className="min-w-0">
              <div className="mb-2 flex items-baseline justify-between px-1">
                <span className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase">
                  {column.label}
                </span>
                <span className="tabular text-[11px] text-stone-400">{column.vendors.length}</span>
              </div>

              <div className="space-y-2">
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
                  <div className="rounded-xl border border-dashed border-stone-200 px-3 py-6 text-center text-[11px] text-stone-400">
                    Nothing here
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
            <p className="mb-2 text-[11px] font-semibold tracking-wider text-stone-400 uppercase">
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
  return (
    <Card className="p-3 transition-shadow hover:shadow-raised">
      <button
        type="button"
        onClick={onOpen}
        className="focus-ring block w-full rounded-lg text-left"
      >
        <p className="truncate text-[13px] font-medium text-stone-900">{vendor.name}</p>
        <p className="truncate text-[11px] text-stone-400">{vendor.category}</p>
        {price > 0 && (
          <p className="tabular mt-1 text-xs text-stone-700">
            {formatMoney(price, decimals)} {currency}
            {lineCount > 0 && paid > 0 && (
              <span className="text-stone-400"> · {formatMoney(paid, decimals)} paid</span>
            )}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {vendor.contract_signed && <Badge tone="good">signed</Badge>}
          {lineCount > 0 && <Badge tone="neutral">{lineCount} budget lines</Badge>}
          {Number(money?.overpaid_minor ?? 0) > 0 && <Badge tone="stop">overpaid</Badge>}
          {vendor.phone && (
            <span className="flex items-center gap-1 text-[11px] text-stone-400">
              <Phone className="size-3" />
              {vendor.phone}
            </span>
          )}
        </div>
      </button>

      {canEdit && (
        /* Status changes from the card itself: it is the only field worth
           editing without opening anything. */
        <select
          value={vendor.status}
          onChange={(e) => onStatus(e.target.value as VendorStatus)}
          className={cn(
            'focus-ring mt-2 w-full rounded-md border border-stone-200 bg-white px-1.5 py-1 text-[11px] text-stone-600',
          )}
        >
          {PIPELINE.map((s) => (
            <option key={s.status} value={s.status}>
              {s.label}
            </option>
          ))}
          <option value="cancelled">Cancelled</option>
        </select>
      )}
    </Card>
  );
}

export { TONE as VENDOR_STATUS_TONE };
