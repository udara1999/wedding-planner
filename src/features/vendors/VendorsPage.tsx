import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Phone, Plus, Store } from 'lucide-react';
import {
  useCreateVendor,
  useDeleteVendor,
  useUpdateVendor,
  useVendors,
} from './vendorsApi';
import { VendorDetail } from './VendorDetail';
import { currencyDecimals, formatMinorAsMajor } from '../../lib/units';
import type { MyWedding, VendorRow, VendorStatus } from '../../types/db';
import {
  Badge,
  Button,
  Card,
  CardBody,
  Drawer,
  EmptyState,
  ErrorState,
  InlineError,
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

export function VendorsPage() {
  const { wedding } = useOutletContext<{ wedding: MyWedding }>();
  const currency = wedding.currency ?? 'LKR';
  const decimals = currencyDecimals(currency);
  const canEdit = wedding.role === 'owner' || wedding.role === 'partner';

  const vendors = useVendors(wedding.id);
  const create = useCreateVendor(wedding.id);
  const update = useUpdateVendor(wedding.id);
  const remove = useDeleteVendor(wedding.id);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const columns = useMemo(() => {
    const rows = vendors.data ?? [];
    return PIPELINE.map((stage) => ({
      ...stage,
      vendors: rows.filter((v) => v.status === stage.status),
    }));
  }, [vendors.data]);

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
                <span className="tabular text-[11px] text-stone-400">
                  {column.vendors.length}
                </span>
              </div>

              <div className="space-y-2">
                {column.vendors.map((vendor) => (
                  <VendorCard
                    key={vendor.id}
                    vendor={vendor}
                    currency={currency}
                    decimals={decimals}
                    canEdit={canEdit}
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

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        title={selected?.name ?? ''}
        subtitle={selected?.category ?? undefined}
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
      </Drawer>
    </Page>
  );
}

function VendorCard({
  vendor,
  currency,
  decimals,
  canEdit,
  onOpen,
  onStatus,
}: {
  vendor: VendorRow;
  currency: string;
  decimals: number;
  canEdit: boolean;
  onOpen: () => void;
  onStatus: (status: VendorStatus) => void;
}) {
  const price = vendor.negotiated_minor || vendor.quoted_minor;
  return (
    <Card className="p-3 transition-shadow hover:shadow-raised">
      <button type="button" onClick={onOpen} className="focus-ring block w-full rounded-lg text-left">
        <p className="truncate text-[13px] font-medium text-stone-900">{vendor.name}</p>
        <p className="truncate text-[11px] text-stone-400">{vendor.category}</p>
        {price > 0 && (
          <p className="tabular mt-1 text-xs text-stone-700">
            {formatMinorAsMajor(price, decimals)} {currency}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {vendor.contract_signed && <Badge tone="good">signed</Badge>}
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
