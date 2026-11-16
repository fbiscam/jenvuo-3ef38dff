import { it } from 'node:test';
import assert from 'node:assert/strict';
import { cn } from './utils';
it('numeric class input returns text, never a number', () => { assert.equal(cn(42), '42'); assert.equal(cn('p-2', [17, 'p-4']), '17 p-4'); });