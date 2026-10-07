import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {creativeGroups,metricLeaders} from '../src/content/dashboard/creative-metrics.mjs';
import {filterRows} from '../src/content/dashboard/metrics.mjs';
const snapshot=JSON.parse(fs.readFileSync(new URL('../src/data.json',import.meta.url)));
const {ads,campaign}=snapshot.meta;
const rows=snapshot.queries.meta_ad_daily.rows;
test('creative ranking preserves campaign separation and responds to scope',()=>{
 const all=creativeGroups(rows,ads,campaign.id);
 assert.equal(all.length,10);
 const best=metricLeaders(all,'linkClicks');
 assert.equal(all.find(r=>best.keys.includes(r.key)).label,'AD05 · histórico');
 const current=creativeGroups(filterRows(rows,'all','all',campaign.id),ads,campaign.id);
 const leader=metricLeaders(current,'linkClicks');
 assert.equal(current.find(r=>leader.keys.includes(r.key)).concept,'AD03');
 assert.equal(leader.value,2);
 assert.equal(current.find(r=>r.concept==='AD03').impressions,18);
 assert.equal(metricLeaders(current,'leads').state,'missing');
 assert.deepEqual(creativeGroups(filterRows(rows,'2026-10-08'),ads,campaign.id),[]);
});
test('ties, equal values, zero and absent values are distinguished',()=>{
 assert.deepEqual(metricLeaders([{key:'a',x:3},{key:'b',x:3},{key:'c',x:1}],'x').keys,['a','b']);
 assert.equal(metricLeaders([{key:'a',x:3},{key:'b',x:3}],'x').state,'equal');
 assert.equal(metricLeaders([{key:'a',x:0}],'x').state,'zero');
 assert.equal(metricLeaders([{key:'a',x:null}],'x').state,'missing');
 assert.equal(metricLeaders([{key:'a',x:2},{key:'b',x:null}],'x').partial,true);
});
test('each source creative resolves to a bundled image with no expiring URLs',()=>{
 for(const ad of ads)for(const m of ad.media){assert.ok(fs.existsSync(new URL(`../src/content/assets/creatives/${m.hash}.jpg`,import.meta.url)));}
 assert.ok(!JSON.stringify(snapshot).includes('fbcdn.net'));
});
