import { expect, it } from 'vitest';
import { withOpacity } from './colorConversion';

it('converts hex to rgba', () => {
  expect(withOpacity('#FFD600', 0.5)).toBe('rgba(255, 214, 0, 0.5)');
});
