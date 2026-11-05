import { describe, expect, it } from 'vitest';
import { computeYearColor, interpolateOklab, parseHexColor } from './colorScales';

describe('interpolateOklab', () => {
  it('returns the endpoints exactly', () => {
    expect(interpolateOklab('#FFD600', '#4A4A4A', 0)).toBe('#FFD600');
    expect(interpolateOklab('#FFD600', '#4A4A4A', 1)).toBe('#4A4A4A');
  });
  it('clamps the fraction', () => {
    expect(interpolateOklab('#000000', '#FFFFFF', -3)).toBe('#000000');
    expect(interpolateOklab('#000000', '#FFFFFF', 5)).toBe('#FFFFFF');
  });
  it('goes through perceptually even steps: the midpoint of black and white is a mid gray', () => {
    const { red, green, blue } = parseHexColor(interpolateOklab('#000000', '#FFFFFF', 0.5));
    expect([red, green, blue].every((channel) => channel === red)).toBe(true);
    // L = 0.5 in OKLab is about 99 in sRGB: darker than the plain sRGB average (127), which is the point.
    expect(red).toBeGreaterThan(90);
    expect(red).toBeLessThan(110);
  });
  it('rejects malformed colors', () => {
    expect(() => parseHexColor('red')).toThrow();
  });
});

describe('computeYearColor', () => {
  const scale = {
    oldestYear: 2019,
    newestYear: 2026,
    oldestColor: '#4A4A4A',
    newestColor: '#FFD600',
  };
  it('maps newest to the bright color and oldest to the dark one', () => {
    expect(computeYearColor(2026, scale)).toBe('#FFD600');
    expect(computeYearColor(2019, scale)).toBe('#4A4A4A');
  });
  it('is monotonic in lightness between the endpoints', () => {
    const lightness = (year: number) => {
      const { red, green } = parseHexColor(computeYearColor(year, scale));
      return red + green;
    };
    for (let year = 2019; year < 2026; year++)
      expect(lightness(year + 1)).toBeGreaterThanOrEqual(lightness(year));
  });
  it('treats a single year as the newest', () => {
    expect(computeYearColor(2024, { ...scale, oldestYear: 2024, newestYear: 2024 })).toBe(
      '#FFD600',
    );
  });
});
