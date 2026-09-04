/**
 * Ticket 4.2 — the dry run.
 *
 * Plan §8 D4 settled the scope: guests only. This is the one import in the
 * product, and it is the one place where a careless file can destroy work the
 * couple did by hand. Two rules follow from that, and everything below is an
 * expression of them:
 *
 *   1. A blank cell means "not mentioned", never "set this to empty". An import
 *      of names and phone numbers must not clear the addresses.
 *   2. Nothing is written until the person has seen, row by row, what will
 *      happen. This module produces that preview and nothing else — it does no
 *      I/O, so the preview and the commit cannot disagree about what a row
 *      means.
 */

import { parseMajorToMinor } from '../../../lib/units';
import type { Tables } from '../../../types/database.types';

type GuestRow = Tables<'guests'>;

/** The columns a file may carry. Everything else in `guests` is app state. */
export type ImportField =
  | 'code'
  | 'household_name'
  | 'relationship'
  | 'side'
  | 'category'
  | 'vip'
  | 'adults_invited'
  | 'children_invited'
  | 'phone'
  | 'whatsapp'
  | 'email'
  | 'city'
  | 'district'
  | 'country'
  | 'invitation_type'
  | 'notes'
  | 'group'
  | 'expected_gift_minor'
  | 'gift_received_minor'
  | 'gift_description';

type Kind = 'text' | 'count' | 'money' | 'side' | 'boolean' | 'email' | 'group';

interface FieldSpec {
  field: ImportField;
  label: string;
  kind: Kind;
  /** Matched after normalising: lowercase, punctuation and spacing removed. */
  aliases: string[];
}

/**
 * Aliases are the wordings a real guest list uses, not a thesaurus. Anything
 * unrecognised is left for the person to map by hand, which is safer than a
 * loose match putting a phone number in the notes.
 */
export const IMPORT_FIELDS: FieldSpec[] = [
  {
    field: 'household_name',
    label: 'Household name',
    kind: 'text',
    aliases: ['householdname', 'household', 'name', 'guestname', 'guest', 'family name', 'invitee'],
  },
  { field: 'code', label: 'Code', kind: 'text', aliases: ['code', 'ref', 'reference', 'id', 'no'] },
  {
    field: 'group',
    label: 'Group',
    kind: 'group',
    aliases: ['group', 'family', 'guestgroup', 'circle'],
  },
  {
    field: 'relationship',
    label: 'Relationship',
    kind: 'text',
    aliases: ['relationship', 'relation', 'relationtocouple'],
  },
  { field: 'side', label: 'Side', kind: 'side', aliases: ['side', 'whoseside', 'brideorgroom'] },
  {
    field: 'category',
    label: 'Category',
    kind: 'text',
    aliases: ['category', 'type', 'guesttype', 'tier'],
  },
  { field: 'vip', label: 'VIP', kind: 'boolean', aliases: ['vip', 'important', 'priority'] },
  {
    field: 'adults_invited',
    label: 'Adults',
    kind: 'count',
    aliases: ['adults', 'adultsinvited', 'noofadults', 'numberofadults', 'pax', 'seats'],
  },
  {
    field: 'children_invited',
    label: 'Children',
    kind: 'count',
    aliases: ['children', 'childreninvited', 'kids', 'noofchildren', 'numberofchildren'],
  },
  {
    field: 'phone',
    label: 'Phone',
    kind: 'text',
    aliases: ['phone', 'mobile', 'telephone', 'tel', 'contact', 'contactnumber', 'phonenumber'],
  },
  { field: 'whatsapp', label: 'WhatsApp', kind: 'text', aliases: ['whatsapp', 'wa'] },
  { field: 'email', label: 'Email', kind: 'email', aliases: ['email', 'emailaddress', 'mail'] },
  { field: 'city', label: 'City', kind: 'text', aliases: ['city', 'town', 'area'] },
  { field: 'district', label: 'District', kind: 'text', aliases: ['district'] },
  { field: 'country', label: 'Country', kind: 'text', aliases: ['country'] },
  {
    field: 'invitation_type',
    label: 'Invitation type',
    kind: 'text',
    aliases: ['invitationtype', 'invitation', 'invitetype', 'invite'],
  },
  {
    field: 'notes',
    label: 'Notes',
    kind: 'text',
    aliases: ['notes', 'note', 'comments', 'remarks'],
  },
  // The workbook's own headers, so its 09 Guests sheet imports without
  // anyone remapping three columns by hand.
  {
    field: 'expected_gift_minor',
    label: 'Expected gift',
    kind: 'money',
    aliases: ['expectedcashgift', 'expectedgift', 'giftexpected', 'expected'],
  },
  {
    field: 'gift_received_minor',
    label: 'Gift received',
    kind: 'money',
    aliases: ['cashgiftreceived', 'giftreceived', 'received', 'giftamount'],
  },
  {
    field: 'gift_description',
    label: 'Gift description',
    kind: 'text',
    aliases: ['giftdescription', 'whatthegiftwas', 'gift'],
  },
];

const SPEC = new Map(IMPORT_FIELDS.map((f) => [f.field, f]));

function normaliseHeader(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Guesses which column is which. The order of IMPORT_FIELDS decides ties, and a
 * field already taken is not offered again — with both 'Household Name' and
 * 'Name' present, the first match wins and the other is left unmapped rather
 * than one silently overwriting the other.
 */
export function autoMapHeaders(headers: string[]): (ImportField | null)[] {
  const taken = new Set<ImportField>();
  return headers.map((header) => {
    const key = normaliseHeader(header);
    if (key === '') return null;
    for (const spec of IMPORT_FIELDS) {
      if (taken.has(spec.field)) continue;
      if (spec.aliases.some((a) => normaliseHeader(a) === key)) {
        taken.add(spec.field);
        return spec.field;
      }
    }
    return null;
  });
}

/* ==========================================================================
   Cell parsing
   ========================================================================== */

const SIDE_WORDS: Record<string, 'bride' | 'groom' | 'both'> = {
  bride: 'bride',
  brides: 'bride',
  bridesside: 'bride',
  brideside: 'bride',
  b: 'bride',
  groom: 'groom',
  grooms: 'groom',
  groomsside: 'groom',
  groomside: 'groom',
  g: 'groom',
  both: 'both',
  shared: 'both',
  mutual: 'both',
  common: 'both',
};

const TRUE_WORDS = new Set(['yes', 'y', 'true', '1', 'x', '✓']);
const FALSE_WORDS = new Set(['no', 'n', 'false', '0', '']);

type ParsedValue = string | number | boolean | null;

function parseCell(
  spec: FieldSpec,
  raw: string,
  decimals: number,
): { value: ParsedValue } | { error: string } {
  const text = raw.trim();

  switch (spec.kind) {
    case 'money': {
      // The same decimal-string parse the forms use (plan R5: never float),
      // so an imported amount and a typed one cannot land a cent apart.
      try {
        return { value: parseMajorToMinor(text, decimals) ?? 0 };
      } catch (e) {
        const why = e instanceof Error ? e.message : 'not a number';
        return { error: `${spec.label} is not a valid amount: ${why}` };
      }
    }
    case 'count': {
      // Grouping separators survive a copy out of a spreadsheet.
      const cleaned = text.replace(/[\s,_]/g, '');
      if (!/^\d+$/.test(cleaned)) {
        return { error: `${spec.label} must be a whole number, not “${text}”` };
      }
      return { value: Number(cleaned) };
    }
    case 'side': {
      const word = SIDE_WORDS[normaliseHeader(text)];
      if (!word) return { error: `${spec.label} must be bride, groom or both, not “${text}”` };
      return { value: word };
    }
    case 'boolean': {
      const key = text.toLowerCase();
      if (TRUE_WORDS.has(key)) return { value: true };
      if (FALSE_WORDS.has(key)) return { value: false };
      return { error: `${spec.label} must be yes or no, not “${text}”` };
    }
    case 'email': {
      // Deliberately loose: the only thing worth rejecting here is a value that
      // is plainly not an address, such as a phone number in the wrong column.
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
        return { error: `“${text}” is not an email address` };
      }
      return { value: text };
    }
    default:
      return { value: text };
  }
}

/* ==========================================================================
   The plan
   ========================================================================== */

export type ExistingGuest = Pick<
  GuestRow,
  | 'id'
  | 'code'
  | 'household_name'
  | 'relationship'
  | 'side'
  | 'category'
  | 'vip'
  | 'adults_invited'
  | 'children_invited'
  | 'phone'
  | 'whatsapp'
  | 'email'
  | 'city'
  | 'district'
  | 'country'
  | 'invitation_type'
  | 'notes'
  | 'group_id'
  | 'expected_gift_minor'
  | 'gift_received_minor'
  | 'gift_description'
>;

export type ImportValues = Partial<Omit<ExistingGuest, 'id'>>;

export interface FieldChange {
  label: string;
  from: string;
  to: string;
}

export interface PlannedRow {
  /** 1-based line in the file, header included, so it matches the spreadsheet. */
  lineNumber: number;
  action: 'create' | 'update' | 'skip' | 'error';
  values: ImportValues;
  /** Set when the row matched a guest already in the wedding. */
  existingId?: string;
  /** Present when a group column named a group that does not exist yet. */
  groupName?: string;
  changes: FieldChange[];
  errors: string[];
}

export interface ImportPlan {
  rows: PlannedRow[];
  summary: { create: number; update: number; skip: number; error: number };
  groupsToCreate: string[];
  /** Set when the file cannot be imported at all; `rows` is then empty. */
  fatal?: string;
}

export function buildImportPlan(input: {
  grid: string[][];
  mapping: (ImportField | null)[];
  existing: ExistingGuest[];
  groups: { id: string; name: string }[];
  /** Minor units per major unit for the wedding's currency. LKR is 2. */
  decimals?: number;
}): ImportPlan {
  const { grid, mapping, existing, groups, decimals = 2 } = input;
  const empty: ImportPlan = {
    rows: [],
    summary: { create: 0, update: 0, skip: 0, error: 0 },
    groupsToCreate: [],
  };

  if (!mapping.includes('household_name')) {
    return { ...empty, fatal: 'Map one column to the household name before importing.' };
  }
  if (grid.length < 2) {
    return { ...empty, fatal: 'This file has a header but no rows.' };
  }

  const byCode = new Map(
    existing.filter((g) => g.code).map((g) => [g.code!.trim().toLowerCase(), g]),
  );
  const byName = new Map(existing.map((g) => [matchKey(g.household_name), g]));
  const groupByName = new Map(groups.map((g) => [g.name.trim().toLowerCase(), g]));

  // Two households in one file with the same name is a mistake in the file, not
  // an instruction to import one and then overwrite it with the other.
  const seen = new Map<string, number>();
  const newGroups = new Map<string, string>();
  const rows: PlannedRow[] = [];

  for (let i = 1; i < grid.length; i++) {
    const cells = grid[i];
    const lineNumber = i + 1;
    const values: ImportValues = {};
    const errors: string[] = [];
    let groupName: string | undefined;

    if (cells.every((c) => c.trim() === '')) {
      rows.push({ lineNumber, action: 'skip', values, changes: [], errors: [] });
      continue;
    }

    for (let c = 0; c < mapping.length; c++) {
      const field = mapping[c];
      if (!field) continue;
      const spec = SPEC.get(field);
      if (!spec) continue;

      const raw = (cells[c] ?? '').trim();
      // Rule 1: a blank cell says nothing about the field, so the field is left
      // out of the payload entirely rather than being set to null.
      if (raw === '') continue;

      const parsed = parseCell(spec, raw, decimals);
      if ('error' in parsed) {
        errors.push(parsed.error);
        continue;
      }
      if (field === 'group') {
        groupName = raw;
        continue;
      }
      Object.assign(values, { [field]: parsed.value });
    }

    if (!values.household_name) {
      errors.push('Household name is required');
    }

    if (groupName) {
      const known = groupByName.get(groupName.toLowerCase());
      if (known) {
        values.group_id = known.id;
      } else if (!newGroups.has(groupName.toLowerCase())) {
        // First spelling wins, so 'Office' and 'office' become one group.
        newGroups.set(groupName.toLowerCase(), groupName);
      }
    }

    const key = values.household_name ? matchKey(values.household_name) : '';
    if (key && seen.has(key)) {
      errors.push(`The same household appears on line ${seen.get(key)}`);
    } else if (key) {
      seen.set(key, lineNumber);
    }

    if (errors.length > 0) {
      rows.push({ lineNumber, action: 'error', values, groupName, changes: [], errors });
      continue;
    }

    const codeInFile = values.code?.trim().toLowerCase();
    const match = (codeInFile && byCode.get(codeInFile)) || byName.get(key);

    if (!match) {
      rows.push({ lineNumber, action: 'create', values, groupName, changes: [], errors: [] });
      continue;
    }

    const changes = diff(values, match, groupName, groupByName);
    rows.push({
      lineNumber,
      // An update that would change nothing is a skip: telling someone 200 rows
      // will be updated when 3 will actually change makes the preview useless.
      action: changes.length > 0 ? 'update' : 'skip',
      values,
      existingId: match.id,
      groupName,
      changes,
      errors: [],
    });
  }

  return {
    rows,
    summary: {
      create: rows.filter((r) => r.action === 'create').length,
      update: rows.filter((r) => r.action === 'update').length,
      skip: rows.filter((r) => r.action === 'skip').length,
      error: rows.filter((r) => r.action === 'error').length,
    },
    groupsToCreate: [...newGroups.values()],
  };
}

/** Names match on their words, so spacing and capitalisation cannot split a household. */
function matchKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function diff(
  values: ImportValues,
  existing: ExistingGuest,
  groupName: string | undefined,
  groupByName: Map<string, { id: string; name: string }>,
): FieldChange[] {
  const changes: FieldChange[] = [];
  for (const [field, next] of Object.entries(values)) {
    if (field === 'group_id') continue;
    const spec = IMPORT_FIELDS.find((f) => f.field === field);
    const before = existing[field as keyof ExistingGuest];
    if (String(before ?? '') === String(next ?? '')) continue;
    changes.push({
      label: spec?.label ?? field,
      from: before === null || before === undefined || before === '' ? '—' : String(before),
      to: String(next),
    });
  }
  // A group that does not exist yet always counts as a change, since the row
  // has to be written once the group is created.
  if (groupName) {
    const known = groupByName.get(groupName.toLowerCase());
    if (!known || known.id !== existing.group_id) {
      changes.push({ label: 'Group', from: existing.group_id ? '—' : '—', to: groupName });
    }
  }
  return changes;
}
