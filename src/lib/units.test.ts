import { describe, expect, it } from 'vitest';
import {
  currencyDecimals,
  formatMinorAsMajor,
  formatRateAsPercent,
  parseMajorToMinor,
  parsePercentAsRate,
} from './units';

describe('parseMajorToMinor', () => {
  it('converts a whole amount to minor units', () => {
    expect(parseMajorToMinor('7318000', 2)).toBe(731800000);
  });

  it('accepts the grouping separators people actually type', () => {
    expect(parseMajorToMinor('7,318,000', 2)).toBe(731800000);
    expect(parseMajorToMinor(' 7 318 000 ', 2)).toBe(731800000);
  });

  it('keeps both decimal places', () => {
    expect(parseMajorToMinor('1234.56', 2)).toBe(123456);
  });

  it('pads a short decimal rather than misreading it', () => {
    expect(parseMajorToMinor('1234.5', 2)).toBe(123450);
  });

  /**
   * The float route (Math.round(1.005 * 100)) yields 100, because 1.005 is not
   * representable in binary. Plan R5 forbids float money, so this is the case
   * that proves the parse is decimal, not floating point.
   */
  it('does not lose a half-cent to binary floating point', () => {
    expect(parseMajorToMinor('1.005', 2)).toBe(101);
  });

  it('rounds half away from zero at the cent boundary', () => {
    expect(parseMajorToMinor('0.014', 2)).toBe(1);
    expect(parseMajorToMinor('0.015', 2)).toBe(2);
  });

  it('treats blank as absent rather than zero', () => {
    expect(parseMajorToMinor('', 2)).toBeNull();
    expect(parseMajorToMinor('   ', 2)).toBeNull();
  });

  it('rejects text that is not a number', () => {
    expect(() => parseMajorToMinor('abc', 2)).toThrow(/number/i);
    expect(() => parseMajorToMinor('1.2.3', 2)).toThrow(/number/i);
  });

  it('rejects a negative budget, which the column forbids anyway', () => {
    expect(() => parseMajorToMinor('-5', 2)).toThrow(/negative/i);
  });

  it('handles a zero-decimal currency', () => {
    expect(parseMajorToMinor('1500', 0)).toBe(1500);
  });
});

describe('formatMinorAsMajor', () => {
  it('round-trips through parseMajorToMinor', () => {
    expect(formatMinorAsMajor(731800000, 2)).toBe('7318000.00');
    expect(parseMajorToMinor(formatMinorAsMajor(731800000, 2), 2)).toBe(731800000);
  });

  it('does not group, because the value goes into a number input', () => {
    expect(formatMinorAsMajor(123456, 2)).toBe('1234.56');
  });

  it('shows an absent amount as empty, not as 0.00', () => {
    expect(formatMinorAsMajor(null, 2)).toBe('');
  });

  it('formats a zero-decimal currency without a point', () => {
    expect(formatMinorAsMajor(1500, 0)).toBe('1500');
  });
});

describe('currencyDecimals', () => {
  it('knows the launch currency', () => {
    expect(currencyDecimals('LKR')).toBe(2);
  });

  it('knows a zero-decimal currency', () => {
    expect(currencyDecimals('JPY')).toBe(0);
  });

  it('assumes two places for anything unlisted', () => {
    expect(currencyDecimals('ZZZ')).toBe(2);
  });
});

describe('percent rates', () => {
  it('stores a typed percentage as the fraction the column holds', () => {
    expect(parsePercentAsRate('7')).toBe(0.07);
    expect(parsePercentAsRate('7.5')).toBe(0.075);
  });

  it('displays the stored fraction as a percentage', () => {
    expect(formatRateAsPercent(0.07)).toBe('7');
    expect(formatRateAsPercent(0.075)).toBe('7.5');
    expect(formatRateAsPercent(null)).toBe('');
  });

  it('rejects a rate above the 50% the check constraint allows', () => {
    expect(() => parsePercentAsRate('60')).toThrow(/between/i);
  });

  it('rejects a negative rate', () => {
    expect(() => parsePercentAsRate('-1')).toThrow(/between/i);
  });

  it('treats blank as absent', () => {
    expect(parsePercentAsRate('')).toBeNull();
  });

  /** numeric(5,4) cannot hold more than four decimal places. */
  it('rounds to the four decimal places the column stores', () => {
    expect(parsePercentAsRate('7.12345')).toBe(0.0712);
  });
});
