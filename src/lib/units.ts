/**
 * Conversions between what a person types and what the columns hold.
 *
 * Money is stored in integer MINOR units (plan R5: never float). The parse here
 * is therefore done on the decimal string, not via `Number(x) * 100` — 1.005
 * is not representable in binary, so the float route silently loses a cent.
 *
 * Percentages are stored as `numeric(5,4)` fractions: 7% is 0.0700.
 */

/** Currencies whose minor unit is not 1/100. Anything unlisted is assumed to be. */
const NON_CENTESIMAL: Record<string, number> = {
  JPY: 0,
  KRW: 0,
  VND: 0,
  ISK: 0,
  CLP: 0,
  BHD: 3,
  KWD: 3,
  OMR: 3,
  TND: 3,
};

export function currencyDecimals(currency: string | null | undefined): number {
  if (!currency) return 2;
  return NON_CENTESIMAL[currency.toUpperCase()] ?? 2;
}

/**
 * '1,234.5' with 2 decimals -> 123450n. Blank -> null.
 * Rounds half away from zero at the last stored place. Throws on non-numeric.
 */
function toScaledInteger(raw: string, decimals: number): bigint | null {
  const cleaned = raw.replace(/[\s,_]/g, '');
  if (cleaned === '') return null;

  if (!/^-?(\d+(\.\d*)?|\.\d+)$/.test(cleaned)) {
    throw new Error('Enter a number');
  }

  const negative = cleaned.startsWith('-');
  const [intPart = '0', fracPart = ''] = cleaned.replace(/^-/, '').split('.');

  // One extra digit decides the rounding; the rest cannot change it.
  const padded = (fracPart + '0'.repeat(decimals + 1)).slice(0, decimals + 1);
  const kept = padded.slice(0, decimals);
  const decider = padded.slice(decimals, decimals + 1);

  let scaled = BigInt(intPart || '0') * 10n ** BigInt(decimals) + BigInt(kept === '' ? '0' : kept);
  if (Number(decider) >= 5) scaled += 1n;

  return negative ? -scaled : scaled;
}

/** What a person typed -> integer minor units, or null when they typed nothing. */
export function parseMajorToMinor(raw: string, decimals: number): number | null {
  const scaled = toScaledInteger(raw, decimals);
  if (scaled === null) return null;
  if (scaled < 0n) throw new Error('Amount must not be negative');
  return Number(scaled);
}

/** Integer minor units -> a plain string for a number input (no grouping). */
export function formatMinorAsMajor(minor: number | null | undefined, decimals: number): string {
  if (minor === null || minor === undefined) return '';
  const negative = minor < 0;
  const digits = Math.abs(Math.trunc(minor)).toString();
  let out: string;
  if (decimals === 0) {
    out = digits;
  } else {
    const padded = digits.padStart(decimals + 1, '0');
    out = `${padded.slice(0, -decimals)}.${padded.slice(-decimals)}`;
  }
  return negative ? `-${out}` : out;
}

/**
 * Money for a person to read: 1,000.00 rather than 1000.00.
 *
 * A SEPARATE function from formatMinorAsMajor on purpose, and the distinction
 * is load-bearing. That one produces a machine-readable string — it feeds
 * `formatMinorForInput`, where a grouped value in a number field is wrong, and
 * the XLSX export, where `Number('260,000.00')` is NaN. This one is for
 * display only.
 *
 * Grouping is applied to the integer part by hand rather than through
 * Intl.NumberFormat. Intl would also localise the decimal separator, and in a
 * locale that uses a comma for it the result reads as 1.000,00 — which is
 * correct for that locale and wrong for a Sri Lankan wedding budget, where the
 * workbook this replaces writes 1,000.00.
 */
export function formatMoney(minor: number | null | undefined, decimals: number): string {
  const plain = formatMinorAsMajor(minor, decimals);
  if (plain === '') return '';

  const negative = plain.startsWith('-');
  const body = negative ? plain.slice(1) : plain;
  const [whole, fraction] = body.split('.');

  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const out = fraction === undefined ? grouped : `${grouped}.${fraction}`;
  return negative ? `-${out}` : out;
}

/** numeric(5,4), and the column's own check constraint, allow 0 to 0.5. */
const RATE_DECIMALS = 4;
const MAX_RATE_SCALED = 5000n; // 0.5000

/** '7.5' -> 0.075. Blank -> null. */
export function parsePercentAsRate(raw: string): number | null {
  // A percentage with two decimals is a rate with four, so the same scaled
  // integer serves both: 7.5% -> 750 -> 0.0750.
  const scaled = toScaledInteger(raw, 2);
  if (scaled === null) return null;
  if (scaled < 0n || scaled > MAX_RATE_SCALED) {
    throw new Error('Enter a percentage between 0 and 50');
  }
  return Number(scaled) / 10 ** RATE_DECIMALS;
}

/** 0.075 -> '7.5'. Trailing zeros are dropped so the field reads naturally. */
export function formatRateAsPercent(rate: number | null | undefined): string {
  if (rate === null || rate === undefined) return '';
  const scaled = Math.round(rate * 10 ** RATE_DECIMALS); // 0.075 -> 750
  const withDecimals = formatMinorAsMajor(scaled, 2); // '7.50'
  return withDecimals.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
}

/* ==========================================================================
   Values for an input field
   ==========================================================================
   These columns are NOT NULL with a default of zero, so "zero" and "nothing
   entered yet" are the same state. Rendering that as "0.00" makes someone
   clear the field before typing, every single time. An input shows nothing,
   and a placeholder carries the format instead.
   ========================================================================== */

export function formatMinorForInput(minor: number | null | undefined, decimals: number): string {
  if (minor === null || minor === undefined || minor === 0) return '';
  return formatMinorAsMajor(minor, decimals);
}

export function formatRateForInput(rate: number | null | undefined): string {
  if (!rate) return '';
  return formatRateAsPercent(rate);
}

export function formatCountForInput(value: number | null | undefined): string {
  if (!value) return '';
  return String(value);
}
