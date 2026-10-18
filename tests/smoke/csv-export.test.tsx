import { describe, expect, it } from 'vitest';
import { csvCell, toCsv } from '@/lib/csv';
import { isSafeHttpsUrl } from '@/lib/safe-redirect';

describe('csv export', () => {
  it('keeps a name containing a comma in a single column', () => {
    expect(toCsv([['Porcelain Tile, 60x60', 12, 3400]])).toBe('"Porcelain Tile, 60x60",12,3400');
  });

  it('doubles inner quotes and quotes line breaks', () => {
    expect(csvCell('12" pipe')).toBe('"12"" pipe"');
    expect(csvCell('line one\nline two')).toBe('"line one\nline two"');
  });

  it('neutralises spreadsheet formulas in text but leaves real numbers alone', () => {
    expect(csvCell('=HYPERLINK("http://evil.example","x")')).toBe('"\'=HYPERLINK(""http://evil.example"",""x"")"');
    expect(csvCell('+1234')).toBe("'+1234");
    expect(csvCell('-cmd')).toBe("'-cmd");
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(csvCell(-250.5)).toBe('-250.5');
  });

  it('writes empty cells for null, undefined and non-finite numbers', () => {
    expect(toCsv([[null, undefined, Number.NaN, 'ok']])).toBe(',,,ok');
  });

  it('uses CRLF row separators', () => {
    expect(toCsv([['a'], ['b']])).toBe('a\r\nb');
  });
});

describe('payment redirect guard', () => {
  it('accepts only https URLs', () => {
    expect(isSafeHttpsUrl('https://checkout.example.com/pay?id=1')).toBe(true);
    expect(isSafeHttpsUrl('http://checkout.example.com')).toBe(false);
    expect(isSafeHttpsUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeHttpsUrl('data:text/html,<script>1</script>')).toBe(false);
    expect(isSafeHttpsUrl('not a url')).toBe(false);
    expect(isSafeHttpsUrl(null)).toBe(false);
  });
});
