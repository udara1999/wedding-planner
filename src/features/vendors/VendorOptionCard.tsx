import { Award, Check, Pencil, Phone, Star, Store, User } from 'lucide-react';
import type { VendorOptionInput } from './api';
import { formatMinorAsMajor } from '../../lib/units';
import type { VendorOptionRow } from '../../types/db';
import { Badge, Button, Card, CardBody, cn } from '../../components/ui';

/**
 * One shortlisted option, as something you can read at a glance.
 *
 * This was a full edit form — nine inputs, three of them money side by side —
 * rendered at a third of the page width. Every field was legible only because
 * it was empty. Three columns of comparison is the right layout for comparing;
 * it is the wrong container for typing into.
 *
 * So the tile shows the figures and the form moved to a modal, which is what
 * every other record in the app does. What stays here are the one-click
 * judgements — met, rating, chosen — because those are made while looking
 * across options rather than while filling anything in.
 */
export function VendorOptionCard({
  option,
  currency,
  decimals,
  canEdit,
  chosen,
  recorded,
  deciding,
  onSave,
  onEdit,
  onChoose,
  onRecord,
}: {
  option: VendorOptionRow;
  currency: string;
  decimals: number;
  canEdit: boolean;
  chosen: boolean;
  recorded: boolean;
  deciding: boolean;
  onSave: (patch: VendorOptionInput) => void;
  onEdit: () => void;
  onChoose: () => void;
  onRecord: () => void;
}) {
  // What this option would actually cost. A negotiated price supersedes the
  // quote, the same precedence the budget line uses, so the number on the tile
  // is the one worth comparing across options.
  const effective = option.negotiated_minor || option.quoted_minor;
  const negotiatedDown = option.negotiated_minor > 0 && option.quoted_minor > 0;

  return (
    <Card
      className={cn(
        'flex flex-col transition-shadow hover:shadow-raised',
        chosen && 'border-wine-400 ring-1 ring-wine-200',
      )}
    >
      <CardBody className="flex-1 space-y-4 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-stone-900">
              {option.vendor_name || option.label}
            </p>
            <p className="truncate text-xs text-stone-400">
              {option.vendor_name ? option.label : 'no vendor named yet'}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {chosen && (
              <Badge tone="accent">
                <Award className="size-3" />
                chosen
              </Badge>
            )}
            {recorded && (
              <Badge tone="good">
                <Store className="size-3" />
                in vendors
              </Badge>
            )}
          </div>
        </div>

        {/* The comparison figure, given room to be read. */}
        <div className="rounded-xl bg-stone-50 px-3 py-2.5">
          <p className="text-[11px] font-medium tracking-wide text-stone-400 uppercase">
            {option.negotiated_minor > 0 ? 'Negotiated' : 'Quoted'}
          </p>
          <p className="tabular mt-0.5 text-lg font-semibold text-stone-900">
            <span className="mr-1 text-xs font-normal text-stone-400">{currency}</span>
            {effective > 0 ? formatMinorAsMajor(effective, decimals) : '—'}
          </p>
          <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-stone-400">
            {negotiatedDown && (
              <span>
                quoted{' '}
                <span className="tabular line-through">
                  {formatMinorAsMajor(option.quoted_minor, decimals)}
                </span>
              </span>
            )}
            {option.deposit_minor > 0 && (
              <span>
                deposit{' '}
                <span className="tabular">
                  {formatMinorAsMajor(option.deposit_minor, decimals)}
                </span>
              </span>
            )}
          </div>
        </div>

        <dl className="space-y-1.5 text-xs">
          {option.package && (
            <div className="flex gap-2">
              <dt className="w-14 shrink-0 text-stone-400">Package</dt>
              <dd className="min-w-0 flex-1 text-stone-700">{option.package}</dd>
            </div>
          )}
          {option.contact_name && (
            <div className="flex items-center gap-2">
              <dt className="w-14 shrink-0 text-stone-400">
                <User className="inline size-3" /> Contact
              </dt>
              <dd className="min-w-0 flex-1 truncate text-stone-700">{option.contact_name}</dd>
            </div>
          )}
          {option.phone && (
            <div className="flex items-center gap-2">
              <dt className="w-14 shrink-0 text-stone-400">
                <Phone className="inline size-3" /> Phone
              </dt>
              <dd className="min-w-0 flex-1 truncate">
                <a href={`tel:${option.phone}`} className="text-wine-700 hover:underline">
                  {option.phone}
                </a>
              </dd>
            </div>
          )}
        </dl>

        {/* One-click judgements. Made while looking across options, so they stay
            on the tile rather than moving into the form. */}
        <div className="flex items-center justify-between gap-2 border-t border-stone-100 pt-3">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                disabled={!canEdit}
                aria-label={`Rate ${n} out of 5`}
                onClick={() => onSave({ rating: option.rating === n ? null : n })}
                className="focus-ring rounded p-0.5"
              >
                <Star
                  className={cn(
                    'size-4',
                    (option.rating ?? 0) >= n
                      ? 'fill-gold-400 text-gold-400'
                      : 'text-stone-300 hover:text-stone-400',
                  )}
                />
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={!canEdit}
            title={option.met_or_visited ? 'Met or visited' : 'Not met yet'}
            onClick={() => onSave({ met_or_visited: !option.met_or_visited })}
            className={cn(
              'focus-ring flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium',
              option.met_or_visited
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-stone-100 text-stone-500 hover:bg-stone-200',
            )}
          >
            <Check className="size-3" />
            {option.met_or_visited ? 'met' : 'not met'}
          </button>
        </div>
      </CardBody>

      {canEdit && (
        <div className="flex items-center gap-2 border-t border-stone-100 px-5 py-3">
          <Button
            size="sm"
            variant="secondary"
            icon={<Pencil className="size-3.5" />}
            onClick={onEdit}
          >
            Details
          </Button>
          <Button
            size="sm"
            variant={chosen ? 'subtle' : 'secondary'}
            className="flex-1"
            disabled={deciding}
            icon={<Award className="size-3.5" />}
            onClick={onChoose}
          >
            {chosen ? 'Chosen' : 'Choose'}
          </Button>
          {chosen && !recorded && (
            <Button
              size="sm"
              loading={deciding}
              icon={<Store className="size-3.5" />}
              onClick={onRecord}
            >
              Record
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
