import type { Applicability, TaskStatus } from '../../types/db';
import type { Database } from '../../types/database.types';

export type ChecklistTable = keyof Database['public']['Tables'];

/**
 * The shared shape from plan §2, with the module-specific columns reachable
 * through an index signature.
 *
 * The index signature is the price of one component instead of seventeen. It is
 * confined to this type and read only through the column definitions below, so
 * a typo in a column key shows up as an empty cell rather than as a runtime
 * error — which is why every config is checked against the generated types by
 * the test beside this file.
 */
export interface ChecklistRow {
  id: string;
  wedding_id: string;
  applicability: Applicability;
  name: string;
  owner: string | null;
  vendor_id: string | null;
  cost_minor: number;
  status: TaskStatus;
  notes: string | null;
  sort_order: number;
  updated_at: string;
  [column: string]: unknown;
}

export type FieldKind =
  'text' | 'textarea' | 'number' | 'money' | 'date' | 'time' | 'boolean' | 'owner' | 'select';

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  /** For `select`. */
  options?: readonly string[];
  hint?: string;
  /** Shown in the list row as well as in the record. Keep this to three or four. */
  inList?: boolean;
}

/** Which sidebar group a module appears under. */
export type ModuleGroup = 'Details' | 'Logistics' | 'Ceremony' | 'After the day';

/** The order the groups appear in the sidebar. */
export const MODULE_GROUPS: readonly ModuleGroup[] = [
  'Ceremony',
  'Details',
  'Logistics',
  'After the day',
];

export interface ModuleConfig {
  /** Route segment: /w/:weddingId/m/:slug */
  slug: string;
  /**
   * The sidebar group. Declared here rather than in the layout so a new module
   * cannot be added and left unreachable — the nav is generated from this list,
   * and config.test.ts checks every module has a group.
   */
  group: ModuleGroup;
  table: ChecklistTable;
  title: string;
  description: string;
  /** What the shared `name` column means here. */
  nameLabel: string;
  /** Module-specific column to section the list by. */
  groupBy?: string;
  /** Whether the shared money, owner and vendor columns are meaningful here. */
  showCost?: boolean;
  showOwner?: boolean;
  showVendor?: boolean;
  /** An extra panel above the list, for the modules that have one. */
  summary?: 'jewellery' | 'ceremony' | 'catering';
  fields: readonly FieldDef[];
}

const SUBJECTS = ['Bride', 'Groom', 'Bride’s mother', 'Groom’s mother', 'Both', 'Other'] as const;

/**
 * Tickets 6.2 to 6.5. Seventeen modules, one component.
 *
 * Every `key` is a real column on the module's table — that is what makes this
 * config rather than a schema. Anything a module needs that is not a column
 * would have to become one.
 */
export const CHECKLIST_MODULES: readonly ModuleConfig[] = [
  {
    slug: 'attire',
    group: 'Details',
    table: 'attire_items',
    title: 'Attire',
    description: 'Every outfit, its fittings, and when it has to be collected.',
    nameLabel: 'Item',
    groupBy: 'subject',
    showCost: true,
    showVendor: true,
    fields: [
      { key: 'subject', label: 'Who it is for', kind: 'select', options: SUBJECTS, inList: true },
      { key: 'fitting_1_on', label: 'First fitting', kind: 'date' },
      { key: 'fitting_2_on', label: 'Second fitting', kind: 'date' },
      { key: 'final_fitting_on', label: 'Final fitting', kind: 'date', inList: true },
      { key: 'alterations', label: 'Alterations needed', kind: 'text' },
      {
        key: 'collect_by',
        label: 'Collect by',
        kind: 'date',
        inList: true,
        hint: 'The date that actually matters — a finished outfit in the shop is no use.',
      },
      { key: 'paid_minor', label: 'Paid so far', kind: 'money' },
    ],
  },
  {
    slug: 'jewellery',
    group: 'Details',
    table: 'jewellery_items',
    title: 'Jewellery',
    description:
      'A custody register, not a shopping list. Who has each piece, and when the rented ones go back.',
    nameLabel: 'Piece',
    groupBy: 'subject',
    summary: 'jewellery',
    showCost: true,
    showVendor: true,
    fields: [
      { key: 'subject', label: 'Who wears it', kind: 'select', options: SUBJECTS, inList: true },
      {
        key: 'ownership',
        label: 'Owned or rented',
        kind: 'select',
        options: ['owned', 'gifted', 'rented', 'borrowed'],
        inList: true,
        hint: 'Rented and borrowed pieces have to come back, which is what the register is for.',
      },
      { key: 'value_minor', label: 'Value', kind: 'money', inList: true },
      { key: 'deposit_minor', label: 'Deposit paid', kind: 'money' },
      {
        key: 'custodian',
        label: 'Who has it',
        kind: 'text',
        hint: 'A name. “Groom’s family” cannot be asked where the necklace is.',
      },
      { key: 'collect_on', label: 'Collected on', kind: 'date' },
      { key: 'return_by', label: 'Return by', kind: 'date' },
      { key: 'returned_on', label: 'Returned on', kind: 'date' },
      { key: 'insured', label: 'Insured', kind: 'boolean' },
    ],
  },
  {
    slug: 'beauty',
    group: 'Details',
    table: 'beauty_appointments',
    title: 'Beauty & grooming',
    description: 'Appointments in the run-up, and the ones on the morning itself.',
    nameLabel: 'Treatment',
    groupBy: 'subject',
    showCost: true,
    showVendor: true,
    fields: [
      { key: 'subject', label: 'Who for', kind: 'select', options: SUBJECTS, inList: true },
      { key: 'provider', label: 'Provider', kind: 'text' },
      { key: 'on_date', label: 'Date', kind: 'date', inList: true },
      { key: 'at_time', label: 'Time', kind: 'time', inList: true },
      { key: 'location', label: 'Where', kind: 'text' },
      { key: 'duration_minutes', label: 'How long (minutes)', kind: 'number' },
      { key: 'paid_minor', label: 'Paid so far', kind: 'money' },
    ],
  },
  {
    slug: 'ceremony',
    group: 'Ceremony',
    table: 'ceremony_steps',
    title: 'Ceremony',
    description:
      'The poruwa ceremony in order. Switch a component off and it stops counting towards the running time.',
    nameLabel: 'Component',
    summary: 'ceremony',
    showVendor: true,
    fields: [
      { key: 'at_time', label: 'Time', kind: 'time', inList: true },
      {
        key: 'duration_minutes',
        label: 'Duration (minutes)',
        kind: 'number',
        inList: true,
        hint: 'Summed for the components that still apply.',
      },
      { key: 'leads', label: 'Who leads it', kind: 'text', inList: true },
      { key: 'location', label: 'Where', kind: 'text' },
      { key: 'items_needed', label: 'Items needed', kind: 'textarea' },
    ],
  },
  {
    slug: 'legal',
    group: 'Ceremony',
    table: 'legal_requirements',
    title: 'Registration & legal',
    description:
      'What the registrar needs. Every line is something to confirm with the authority, never advice from this app.',
    nameLabel: 'Requirement',
    groupBy: 'jurisdiction',
    fields: [
      {
        key: 'verify_status',
        label: 'Checked with the authority',
        kind: 'select',
        options: ['to_verify', 'verified', 'not_applicable'],
        inList: true,
      },
      { key: 'authority', label: 'Which authority', kind: 'text', inList: true },
      { key: 'jurisdiction', label: 'Jurisdiction', kind: 'text' },
      { key: 'due_date', label: 'Needed by', kind: 'date', inList: true },
      { key: 'verified_on', label: 'Confirmed on', kind: 'date' },
      { key: 'document_held', label: 'Document in hand', kind: 'boolean' },
      { key: 'reference_url', label: 'Reference', kind: 'text' },
    ],
  },
  {
    slug: 'decor',
    group: 'Details',
    table: 'decor_items',
    title: 'Decor',
    description: 'By area, so the setup crew can be walked through it room by room.',
    nameLabel: 'Item',
    groupBy: 'area',
    showCost: true,
    showVendor: true,
    fields: [
      { key: 'area', label: 'Area', kind: 'text', inList: true },
      { key: 'qty', label: 'How many', kind: 'number', inList: true },
      { key: 'setup_by', label: 'Set up by', kind: 'text' },
      { key: 'remove_after', label: 'Removed after', kind: 'text' },
      { key: 'checked_on_day', label: 'Checked on the day', kind: 'boolean', inList: true },
    ],
  },
  {
    slug: 'menu',
    group: 'Details',
    table: 'menu_items',
    title: 'Food & drink',
    description: 'The menu, and the headcount to quote the caterer.',
    nameLabel: 'Dish',
    groupBy: 'course',
    summary: 'catering',
    showCost: true,
    showVendor: true,
    fields: [
      { key: 'course', label: 'Course', kind: 'text', inList: true },
      { key: 'qty', label: 'How many', kind: 'number' },
      {
        key: 'per_head',
        label: 'Priced per head',
        kind: 'boolean',
        inList: true,
        hint: 'Per-head dishes move with the headcount; a whole cake does not.',
      },
      { key: 'dietary', label: 'Dietary notes', kind: 'text' },
    ],
  },
  {
    slug: 'cake',
    group: 'Details',
    table: 'cake_items',
    title: 'Cake',
    description: 'Tiers, flavours, and when it arrives.',
    nameLabel: 'Cake',
    showCost: true,
    showVendor: true,
    fields: [
      { key: 'tiers', label: 'Tiers', kind: 'number', inList: true },
      { key: 'flavour', label: 'Flavour', kind: 'text', inList: true },
      { key: 'servings', label: 'Servings', kind: 'number', inList: true },
      { key: 'delivery_at', label: 'Delivered at', kind: 'time' },
    ],
  },
  {
    slug: 'transport',
    group: 'Logistics',
    table: 'transport_legs',
    title: 'Transport',
    description: 'Every journey, with a driver and a phone number against it.',
    nameLabel: 'Journey',
    showCost: true,
    showVendor: true,
    fields: [
      { key: 'vehicle', label: 'Vehicle', kind: 'text', inList: true },
      { key: 'driver', label: 'Driver', kind: 'text', inList: true },
      { key: 'driver_phone', label: 'Driver’s phone', kind: 'text' },
      { key: 'passengers', label: 'Who is in it', kind: 'text' },
      { key: 'pickup_from', label: 'Pick up from', kind: 'text' },
      { key: 'pickup_at', label: 'Pick up at', kind: 'time', inList: true },
      { key: 'destination', label: 'Going to', kind: 'text' },
      { key: 'arrive_by', label: 'Arrive by', kind: 'time' },
      { key: 'return_trip', label: 'Return trip needed', kind: 'boolean' },
    ],
  },
  {
    slug: 'accommodation',
    group: 'Logistics',
    table: 'accommodations',
    title: 'Accommodation',
    description: 'Rooms for the people who need them.',
    nameLabel: 'Booking',
    groupBy: 'hotel',
    showCost: true,
    fields: [
      { key: 'hotel', label: 'Hotel', kind: 'text', inList: true },
      { key: 'room_type', label: 'Room', kind: 'text' },
      { key: 'check_in', label: 'Check in', kind: 'date', inList: true },
      { key: 'check_out', label: 'Check out', kind: 'date' },
      { key: 'nights', label: 'Nights', kind: 'number' },
      { key: 'confirmation_ref', label: 'Confirmation', kind: 'text', inList: true },
    ],
  },
  {
    slug: 'shots',
    group: 'Details',
    table: 'shot_list_items',
    title: 'Shot list',
    description: 'What the photographer must not miss, ticked off as it happens.',
    nameLabel: 'Shot',
    groupBy: 'section',
    showVendor: true,
    fields: [
      { key: 'section', label: 'Part of the day', kind: 'text', inList: true },
      {
        key: 'priority',
        label: 'Priority',
        kind: 'select',
        options: ['Must', 'Should', 'Nice to have'],
        inList: true,
      },
      { key: 'people_needed', label: 'Who needs to be there', kind: 'text' },
      { key: 'location', label: 'Where', kind: 'text' },
      { key: 'planned_at', label: 'Planned time', kind: 'time' },
      { key: 'captured', label: 'Got it', kind: 'boolean', inList: true },
    ],
  },
  {
    slug: 'procurement',
    group: 'Logistics',
    table: 'procurement_items',
    title: 'Procurement & packing',
    description: 'Buy it, pack it, load it. Three separate questions on the day.',
    nameLabel: 'Item',
    groupBy: 'container',
    showCost: true,
    fields: [
      { key: 'container', label: 'Bag or box', kind: 'text', inList: true },
      { key: 'category', label: 'Category', kind: 'text' },
      { key: 'qty', label: 'How many', kind: 'number' },
      { key: 'where_to_buy', label: 'Where to buy', kind: 'text' },
      { key: 'actual_minor', label: 'Actually cost', kind: 'money' },
      { key: 'bought', label: 'Bought', kind: 'boolean', inList: true },
      { key: 'bought_on', label: 'Bought on', kind: 'date' },
      { key: 'stored_where', label: 'Stored where', kind: 'text' },
      { key: 'needed_on_day', label: 'Needed on the day', kind: 'boolean' },
      { key: 'packed', label: 'Packed', kind: 'boolean', inList: true },
      { key: 'loaded', label: 'Loaded', kind: 'boolean', inList: true },
    ],
  },
  {
    slug: 'party',
    group: 'Logistics',
    table: 'wedding_party',
    title: 'Wedding party',
    description: 'Who is standing with you, what they are wearing, and when they need to be there.',
    nameLabel: 'Name',
    groupBy: 'side',
    fields: [
      { key: 'role', label: 'Role', kind: 'text', inList: true },
      {
        key: 'side',
        label: 'Side',
        kind: 'select',
        options: ['bride', 'groom', 'both'],
        inList: true,
      },
      { key: 'phone', label: 'Phone', kind: 'text', inList: true },
      { key: 'whatsapp', label: 'WhatsApp', kind: 'text' },
      { key: 'outfit', label: 'What they wear', kind: 'text' },
      { key: 'outfit_ready', label: 'Outfit ready', kind: 'boolean' },
      { key: 'accessories', label: 'Accessories', kind: 'text' },
      { key: 'duties', label: 'What they do on the day', kind: 'textarea' },
      { key: 'arrive_by', label: 'At the venue by', kind: 'time' },
      { key: 'transport', label: 'How they get there', kind: 'text' },
      { key: 'room_needed', label: 'Needs a room', kind: 'boolean' },
      { key: 'gift_given', label: 'Thank-you gift given', kind: 'boolean' },
    ],
  },
  {
    slug: 'music',
    group: 'Details',
    table: 'music_cues',
    title: 'Music',
    description: 'What plays when, and who presses play.',
    nameLabel: 'Cue',
    groupBy: 'moment',
    showVendor: true,
    fields: [
      { key: 'moment', label: 'Moment', kind: 'text', inList: true },
      { key: 'track', label: 'Track', kind: 'text', inList: true },
      { key: 'artist', label: 'Artist', kind: 'text' },
      { key: 'cue_at', label: 'Cue at', kind: 'time', inList: true },
      { key: 'source', label: 'Played from', kind: 'text' },
    ],
  },
  {
    slug: 'contacts',
    group: 'Logistics',
    table: 'contacts',
    title: 'Contact sheet',
    description: 'Everyone worth phoning on the day, in one place.',
    nameLabel: 'Name',
    groupBy: 'group_label',
    fields: [
      { key: 'group_label', label: 'Group', kind: 'text', inList: true },
      { key: 'role', label: 'Role', kind: 'text', inList: true },
      { key: 'phone', label: 'Phone', kind: 'text', inList: true },
      { key: 'backup_phone', label: 'Backup phone', kind: 'text' },
      { key: 'whatsapp', label: 'WhatsApp', kind: 'text' },
    ],
  },
  {
    slug: 'closure',
    group: 'After the day',
    table: 'closure_tasks',
    title: 'After the wedding',
    description: 'The week after, which nobody plans for and everybody needs.',
    nameLabel: 'Task',
    groupBy: 'window_label',
    fields: [
      { key: 'window_label', label: 'When', kind: 'text', inList: true },
      { key: 'target_date', label: 'Target date', kind: 'date', inList: true },
      { key: 'done_on', label: 'Done on', kind: 'date' },
      { key: 'amount_minor', label: 'Amount involved', kind: 'money', inList: true },
    ],
  },
  {
    slug: 'lessons',
    group: 'After the day',
    table: 'lessons',
    title: 'What we learned',
    description: 'Worth writing down while it is fresh, for the next family wedding.',
    nameLabel: 'Lesson',
    groupBy: 'category',
    fields: [
      { key: 'category', label: 'Category', kind: 'text', inList: true },
      {
        key: 'verdict',
        label: 'Verdict',
        kind: 'select',
        options: ['Worth it', 'Would skip', 'Would do differently'],
        inList: true,
      },
    ],
  },
];

export function findModule(slug: string | undefined): ModuleConfig | null {
  return CHECKLIST_MODULES.find((m) => m.slug === slug) ?? null;
}
