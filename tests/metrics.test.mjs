import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregate, filterRows, resolveScope, isFullScope, sumReported, csvText } from '../src/content/dashboard/metrics.mjs';

test('weighted rates use aggregate denominators and reach is never summed', () => {
  const value = aggregate([{spend: 10, impressions: 100, linkClicks: 10, leads: 1, reach: 80}, {spend: 90, impressions: 900, linkClicks: 30, leads: 3, reach: 700}]);
  assert.equal(value.linkCtr, .04); assert.equal(value.linkCpc, 2.5); assert.equal(value.cpl, 25); assert.equal('reach' in value, false);
});
test('missing lead actions remain null rather than becoming zero', () => {
  const value = aggregate([{spend: 15, leads: null}, {spend: 10}]);
  assert.equal(value.leads, null); assert.equal(value.cpl, null);
  assert.equal(aggregate([{spend: 10, leads: 0}]).cpl, null);
});
test('partially reported landing views retain value and flag incompleteness', () => {
  const value = aggregate([{landingPageViews: 6, linkClicks: 10}, {landingPageViews: null, linkClicks: 20}]);
  assert.equal(value.landingPageViews, 6); assert.equal(value.partial.landingPageViews, true); assert.equal(value.pageViewRate, null);
  assert.deepEqual(sumReported([], 'landingPageViews'), {value: null, partial:false, reportedRows:0, totalRows:0});
});
test('partial lead reporting does not produce misleading CPL', () => {
  const value = aggregate([{spend: 20, leads: 1}, {spend: 20, leads: null}]);
  assert.equal(value.leads, 1); assert.equal(value.partial.leads, true); assert.equal(value.cpl, null);
});
test('date and audience filters intersect, are inclusive and can reset', () => {
  const rows = [{date:'2026-10-06',adsetId:'a'}, {date:'2026-10-07',adsetId:'a'}, {date:'2026-10-07',adsetId:'b'}];
  assert.deepEqual(filterRows(rows, '2026-10-07..2026-10-07', 'a'), [rows[1]]);
  assert.deepEqual(filterRows(rows, '2026-10-07..2026-10-06', 'a'), rows.slice(0,2));
  assert.deepEqual(filterRows(rows, 'all', 'all'), rows);
  assert.deepEqual(filterRows(rows, '2026-10-08..2026-10-09', 'all'), []);
});
test('scope switches source grain and keeps detail and chart rows synchronized', () => {
  const queries = {meta_daily:{rows:[{date:'2026-10-07',spend:30}]},meta_adset_daily:{rows:[{date:'2026-10-07',adsetId:'a',spend:10},{date:'2026-10-07',adsetId:'b',spend:20}]},meta_ad_daily:{rows:[{date:'2026-10-07',adsetId:'a',adId:'x',spend:10}]}};
  const scope = resolveScope(queries, '2026-10-07', 'a');
  assert.equal(scope.queryId,'meta_adset_daily'); assert.equal(scope.totals.spend,10); assert.equal(scope.daily[0].spend,10); assert.equal(scope.ads.length,1);
  assert.equal(resolveScope(queries,'all','all').totals.spend,30);
});
test('reach is available only for the complete reporting period and audience', () => {
  const period = {since:'2026-10-06',until:'2026-10-07'};
  assert.equal(isFullScope('all','all',period),true); assert.equal(isFullScope('2026-10-07','all',period),false); assert.equal(isFullScope('all','a',period),false);
});
test('CSV preserves missing values and escapes reviewed names', () => {
  assert.equal(csvText([{name:'A "B"',leads:null}], ['name','leads']), '\uFEFF"name";"leads"\r\n"A ""B""";""');
});
