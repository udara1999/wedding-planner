import { describe, expect, it } from 'vitest';
import { autoMapHeaders, buildImportPlan, type ExistingGuest, type ImportField } from './plan';

function guest(over: Partial<ExistingGuest> & { household_name: string }): ExistingGuest {
  return {
    id: over.household_name,
    code: null,
    relationship: null,
    side: null,
    category: null,
    vip: false,
    adults_invited: 0,
    children_invited: 0,
    phone: null,
    whatsapp: null,
    email: null,
    city: null,
    district: null,
    country: null,
    invitation_type: null,
    notes: null,
    group_id: null,
    expected_gift_minor: 0,
    gift_received_minor: 0,
    gift_description: null,
    ...over,
    household_name: over.household_name,
  };
}

const plan = (headers: string[], rows: string[][], existing: ExistingGuest[] = []) =>
  buildImportPlan({
    grid: [headers, ...rows],
    mapping: autoMapHeaders(headers),
    existing,
    groups: [],
  });

describe('autoMapHeaders', () => {
  it('matches the obvious names', () => {
    expect(autoMapHeaders(['Household Name', 'Adults', 'Children', 'Phone'])).toEqual([
      'household_name',
      'adults_invited',
      'children_invited',
      'phone',
    ]);
  });

  it('ignores case, spacing and punctuation', () => {
    expect(autoMapHeaders(['  HOUSEHOLD_NAME  ', 'e-mail', 'No. of Adults'])).toEqual([
      'household_name',
      'email',
      'adults_invited',
    ]);
  });

  it('accepts the wordings a real guest list uses', () => {
    expect(autoMapHeaders(['Name', 'Family', 'Side', 'Mobile', 'Town'])).toEqual([
      'household_name',
      'group',
      'side',
      'phone',
      'city',
    ]);
  });

  it('leaves a column it does not recognise unmapped', () => {
    expect(autoMapHeaders(['Household', 'Favourite colour'])).toEqual(['household_name', null]);
  });

  it('never maps two columns to the same field', () => {
    // 'Name' and 'Household Name' both look like the name. The first wins and
    // the second is left for the person to map, rather than being silently
    // overwritten by whichever column happened to come last.
    const mapped = autoMapHeaders(['Household Name', 'Name']);
    expect(mapped[0]).toBe('household_name');
    expect(mapped[1]).toBeNull();
  });
});

describe('buildImportPlan — creating', () => {
  it('plans a create for a household that does not exist', () => {
    const result = plan(['Household Name', 'Adults', 'Children'], [['Nayana nanda', '4', '2']]);
    expect(result.summary).toMatchObject({ create: 1, update: 0, skip: 0, error: 0 });
    expect(result.rows[0]).toMatchObject({
      action: 'create',
      lineNumber: 2,
      values: { household_name: 'Nayana nanda', adults_invited: 4, children_invited: 2 },
    });
  });

  it('reads side, vip and counts in the wordings people actually type', () => {
    const result = plan(
      ['Name', 'Side', 'VIP', 'Adults'],
      [
        ['A', "Bride's side", 'Yes', '2'],
        ['B', 'GROOM', 'no', '0'],
        ['C', 'both', 'TRUE', '1'],
      ],
    );
    expect(result.rows.map((r) => r.values.side)).toEqual(['bride', 'groom', 'both']);
    expect(result.rows.map((r) => r.values.vip)).toEqual([true, false, true]);
    expect(result.summary.error).toBe(0);
  });

  it('strips grouping from a count', () => {
    const result = plan(['Name', 'Adults'], [['A', '1,200']]);
    expect(result.rows[0].values.adults_invited).toBe(1200);
  });

  it('leaves a blank count unset rather than forcing a zero', () => {
    // The column defaults to 0 in the database. Sending an explicit 0 would
    // overwrite a count someone had already entered by hand.
    const result = plan(['Name', 'Adults'], [['A', '']]);
    expect('adults_invited' in result.rows[0].values).toBe(false);
  });
});

describe('buildImportPlan — money', () => {
  it('reads a gift amount into minor units', () => {
    const result = plan(['Name', 'Expected cash gift'], [['A', '10000']]);
    expect(result.rows[0].values.expected_gift_minor).toBe(1000000);
  });

  it('strips grouping and reads decimals', () => {
    const result = plan(['Name', 'Expected cash gift'], [['A', '1,250.50']]);
    expect(result.rows[0].values.expected_gift_minor).toBe(125050);
  });

  it('honours the currency\u2019s decimals', () => {
    // LKR has two; a zero-decimal currency must not multiply by a hundred.
    const result = buildImportPlan({
      grid: [
        ['Name', 'Expected cash gift'],
        ['A', '10000'],
      ],
      mapping: ['household_name', 'expected_gift_minor'] as (ImportField | null)[],
      existing: [],
      groups: [],
      decimals: 0,
    });
    expect(result.rows[0].values.expected_gift_minor).toBe(10000);
  });

  it('rejects an amount that is not a number', () => {
    const result = plan(['Name', 'Expected cash gift'], [['A', 'lots']]);
    expect(result.rows[0].action).toBe('error');
    expect(result.rows[0].errors[0]).toMatch(/amount/i);
  });

  it('rejects a negative amount', () => {
    expect(plan(['Name', 'Expected cash gift'], [['A', '-5']]).rows[0].action).toBe('error');
  });

  it('maps the workbook\u2019s own gift headers', () => {
    expect(
      autoMapHeaders(['Expected cash gift', 'Cash gift received', 'Gift description']),
    ).toEqual(['expected_gift_minor', 'gift_received_minor', 'gift_description']);
  });
});

describe('buildImportPlan — rejecting', () => {
  it('rejects a row with no household name', () => {
    const result = plan(['Name', 'Phone'], [['', '0771234567']]);
    expect(result.rows[0].action).toBe('error');
    expect(result.rows[0].errors[0]).toMatch(/name/i);
    expect(result.summary.error).toBe(1);
  });

  it('rejects a count that is not a whole number', () => {
    const result = plan(['Name', 'Adults'], [['A', 'two']]);
    expect(result.rows[0].action).toBe('error');
    expect(result.rows[0].errors[0]).toMatch(/whole number/i);
  });

  it('rejects a negative count', () => {
    expect(plan(['Name', 'Adults'], [['A', '-1']]).rows[0].action).toBe('error');
  });

  it('rejects a side it cannot interpret', () => {
    const result = plan(['Name', 'Side'], [['A', 'cousin']]);
    expect(result.rows[0].errors[0]).toMatch(/bride/i);
  });

  it('rejects an address that is not an email', () => {
    expect(plan(['Name', 'Email'], [['A', 'not-an-email']]).rows[0].action).toBe('error');
  });

  it('reports every problem in a row at once', () => {
    const result = plan(['Name', 'Adults', 'Side'], [['', 'x', 'y']]);
    expect(result.rows[0].errors).toHaveLength(3);
  });

  it('skips a completely blank line without calling it an error', () => {
    const result = plan(
      ['Name', 'Phone'],
      [
        ['', ''],
        ['A', ''],
      ],
    );
    expect(result.rows[0].action).toBe('skip');
    expect(result.summary).toMatchObject({ error: 0, create: 1, skip: 1 });
  });

  it('rejects the file when no column is mapped to the household name', () => {
    const result = buildImportPlan({
      grid: [['Phone'], ['0771234567']],
      mapping: [null],
      existing: [],
      groups: [],
    });
    expect(result.fatal).toMatch(/household name/i);
    expect(result.rows).toHaveLength(0);
  });
});

describe('buildImportPlan — matching what is already there', () => {
  it('updates by code when the file carries one', () => {
    const existing = [guest({ id: 'g1', code: 'H001', household_name: 'Old name' })];
    const result = plan(['Code', 'Name', 'Phone'], [['H001', 'New name', '077']], existing);
    expect(result.rows[0]).toMatchObject({ action: 'update', existingId: 'g1' });
    expect(result.rows[0].values.household_name).toBe('New name');
  });

  it('falls back to matching the household name, ignoring case and spacing', () => {
    const existing = [guest({ id: 'g1', household_name: 'Nayana  nanda' })];
    const result = plan(['Name', 'Phone'], [['  nayana nanda ', '077']], existing);
    expect(result.rows[0]).toMatchObject({ action: 'update', existingId: 'g1' });
  });

  it('lists what an update would change, so the preview is reviewable', () => {
    const existing = [guest({ id: 'g1', household_name: 'A', phone: '011', adults_invited: 2 })];
    const result = plan(['Name', 'Phone', 'Adults'], [['A', '077', '2']], existing);
    expect(result.rows[0].changes).toEqual([{ label: 'Phone', from: '011', to: '077' }]);
  });

  it('calls an update that changes nothing a skip', () => {
    const existing = [guest({ id: 'g1', household_name: 'A', phone: '077' })];
    const result = plan(['Name', 'Phone'], [['A', '077']], existing);
    expect(result.rows[0].action).toBe('skip');
    expect(result.summary).toMatchObject({ update: 0, skip: 1 });
  });

  it('never clears a value that the file leaves blank', () => {
    // Importing a two-column list of names and phones must not wipe the
    // addresses someone spent an evening typing in.
    const existing = [guest({ id: 'g1', household_name: 'A', city: 'Kandy' })];
    const result = plan(['Name', 'City'], [['A', '']], existing);
    expect(result.rows[0].action).toBe('skip');
    expect('city' in result.rows[0].values).toBe(false);
  });

  it('rejects the second row that names the same household twice', () => {
    const result = plan(['Name'], [['A'], ['a']]);
    expect(result.rows[0].action).toBe('create');
    expect(result.rows[1].action).toBe('error');
    expect(result.rows[1].errors[0]).toMatch(/line 2/i);
  });
});

describe('buildImportPlan — groups', () => {
  it('resolves a group that already exists', () => {
    const result = buildImportPlan({
      grid: [
        ['Name', 'Group'],
        ['A', 'Office'],
      ],
      mapping: ['household_name', 'group'] as (ImportField | null)[],
      existing: [],
      groups: [{ id: 'grp1', name: 'Office' }],
    });
    expect(result.rows[0].values.group_id).toBe('grp1');
    expect(result.groupsToCreate).toEqual([]);
  });

  it('collects group names that would have to be created', () => {
    const result = buildImportPlan({
      grid: [
        ['Name', 'Group'],
        ['A', 'Office'],
        ['B', 'office'],
        ['C', 'School'],
      ],
      mapping: ['household_name', 'group'] as (ImportField | null)[],
      existing: [],
      groups: [],
    });
    expect(result.groupsToCreate).toEqual(['Office', 'School']);
    expect(result.rows[0].groupName).toBe('Office');
  });
});
