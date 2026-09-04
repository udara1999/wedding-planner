import { describe, expect, it } from 'vitest';
import { CHECKLIST_MODULES, MODULE_GROUPS, findModule } from './config';
// Read as text so the generated types can be checked at runtime. They are
// types, so they do not otherwise exist when the test runs.
import generated from '../../types/database.types.ts?raw';

/**
 * Every field key in the config must be a real column.
 *
 * This is the check that makes ticket 6.1's one-component-many-configs design
 * safe. `ChecklistRow` has an index signature — that is what lets one component
 * render seventeen different tables — and the cost is that `subjcet` compiles
 * perfectly and renders an empty cell forever. Nothing else in the stack
 * catches it: not tsc, not the linter, not a smoke test of one module.
 *
 * So the generated types are parsed and the config is checked against them. It
 * is an unusual test, and it is the only way to get the guarantee without
 * writing seventeen components.
 */
function columnsOf(table: string): Set<string> {
  // Each table appears once as `      <name>: {` followed by `        Row: {`.
  const start = generated.indexOf(`      ${table}: {`);
  if (start === -1) return new Set();
  const rowStart = generated.indexOf('        Row: {', start);
  const rowEnd = generated.indexOf('\n        }', rowStart);
  if (rowStart === -1 || rowEnd === -1) return new Set();
  const body = generated.slice(rowStart, rowEnd);
  return new Set([...body.matchAll(/^\s{10}([a-z_0-9]+)\??:/gm)].map((m) => m[1]));
}

/** The shared shape from plan §2, present on every module table. */
const SHARED = [
  'id',
  'wedding_id',
  'applicability',
  'name',
  'owner',
  'vendor_id',
  'cost_minor',
  'status',
  'notes',
  'sort_order',
  'updated_at',
];

describe('the generated types can be read at all', () => {
  it('finds columns for a known table', () => {
    // If this fails the parsing above has drifted from the generator's output
    // and every assertion below would pass vacuously.
    const cols = columnsOf('attire_items');
    expect(cols.size).toBeGreaterThan(10);
    expect(cols.has('subject')).toBe(true);
  });
});

describe.each(CHECKLIST_MODULES.map((m) => [m.title, m] as const))('%s', (_title, module) => {
  const columns = columnsOf(module.table);

  it('has a table that exists', () => {
    expect(columns.size).toBeGreaterThan(0);
  });

  it('has every column of the shared shape', () => {
    for (const shared of SHARED) {
      expect(columns.has(shared), `${module.table} is missing ${shared}`).toBe(true);
    }
  });

  it('names only real columns in its fields', () => {
    for (const field of module.fields) {
      expect(columns.has(field.key), `${module.table} has no column ${field.key}`).toBe(true);
    }
  });

  it('groups by a real column, if it groups', () => {
    if (module.groupBy) {
      expect(columns.has(module.groupBy), `${module.table} has no column ${module.groupBy}`).toBe(
        true,
      );
    }
  });

  it('does not redeclare a shared column as a field', () => {
    // The component renders the shared columns itself. Declaring one again
    // would put two controls on the same value.
    for (const field of module.fields) {
      expect(SHARED).not.toContain(field.key);
    }
  });

  it('gives select fields their options', () => {
    for (const field of module.fields) {
      if (field.kind === 'select') {
        expect(field.options?.length ?? 0).toBeGreaterThan(1);
      }
    }
  });

  it('keeps the list row readable', () => {
    // Four module columns plus name, status and cost is already a wide row on
    // a laptop. More than that and the name starts truncating.
    const inList = module.fields.filter((f) => f.inList).length;
    expect(inList).toBeLessThanOrEqual(4);
  });
});

describe('the registry as a whole', () => {
  it('has a unique slug per module', () => {
    const slugs = CHECKLIST_MODULES.map((m) => m.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('has a unique table per module', () => {
    const tables = CHECKLIST_MODULES.map((m) => m.table);
    expect(new Set(tables).size).toBe(tables.length);
  });

  it('covers the fourteen simple modules of 6.2 plus 6.3, 6.4 and 6.5', () => {
    expect(CHECKLIST_MODULES).toHaveLength(17);
  });

  it('gives every module a sidebar group', () => {
    // The nav is generated from this, so a module without a group is a module
    // with no way to reach it.
    for (const module of CHECKLIST_MODULES) {
      expect(MODULE_GROUPS).toContain(module.group);
    }
  });

  it('leaves no sidebar group empty', () => {
    for (const group of MODULE_GROUPS) {
      expect(
        CHECKLIST_MODULES.some((m) => m.group === group),
        `nothing is in the ${group} group`,
      ).toBe(true);
    }
  });

  it('finds a module by slug and nothing by a wrong one', () => {
    expect(findModule('attire')?.table).toBe('attire_items');
    expect(findModule('nope')).toBeNull();
    expect(findModule(undefined)).toBeNull();
  });
});
