import { test } from 'node:test';
import assert from 'node:assert/strict';
import { articleDay, dailyCapReached, chooseKeyword, parseKeywordRows, matchingProperties, articleQuality } from './daily-article';
test('one daily article is the cap, without a manual bypass', () => {
  assert.equal(dailyCapReached(0), false); assert.equal(dailyCapReached(1), true); assert.equal(dailyCapReached(2), true);
});
test('daily key uses UTC and remains stable within the day', () => {
  assert.equal(articleDay(new Date('2026-11-22T23:59:59Z')), '2026-11-22');
  assert.equal(articleDay(new Date('2026-11-23T00:00:00Z')), '2026-11-23');
});
test('Semrush missing values remain unknown and used keywords are excluded', () => {
  const rows = parseKeywordRows({columnNames: ['Keyword','Search Volume','Keyword Difficulty Index'],rows: [['gold', '1000', ''], ['gold strategies', '260','9'], ['how to trade gold','1900','31']]});
  assert.equal(rows[0]?.difficulty, null);
  assert.equal(chooseKeyword(rows, ['gold strategies'])?.keyword, 'how to trade gold');
});
test('Search Console excludes unverified properties and preserves every matching choice', () => {
  assert.deepEqual(matchingProperties([{siteUrl:'https://jenvu.com/'},{siteUrl:'sc-domain:jenvu.com'},{siteUrl:'https://blogs.jenvu.com/',permissionLevel:'siteUnverifiedUser'}], 'https://blogs.jenvu.com/'), ['sc-domain:jenvu.com']);
});
test('publication fails without source evidence and meaningful content', () => {
  assert.ok(articleQuality('# gold\n\ngold', 'gold', []).includes('At least two researched sources must be cited.'));
});
test('keyword research rejects unrelated gold teaching strategies', () => {
  assert.equal(chooseKeyword([{keyword:'gold strategies',volume:260,difficulty:9},{keyword:'how to trade gold',volume:1900,difficulty:31}],[])?.keyword,'how to trade gold');
});