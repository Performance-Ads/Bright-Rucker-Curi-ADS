import {aggregate} from './metrics.mjs';

export function creativeGroups(rows, ads, currentCampaignId) {
  const registry=new Map(ads.map(a=>[String(a.id),a]));
  const groups=new Map();
  for(const row of rows){
    const ad=registry.get(String(row.adId));
    const concept=ad?.concept || row.adId;
    const key=`${row.campaignId}:${concept}:${(ad?.media||[]).map(m=>m.hash).join(',')}`;
    if(!groups.has(key))groups.set(key,{key,concept,campaignId:row.campaignId,current:String(row.campaignId)===String(currentCampaignId),media:ad?.media||[],records:[]});
    groups.get(key).records.push(row);
  }
  return [...groups.values()].map(({records,...group})=>({...group,...aggregate(records),label:`${group.concept} · ${group.current?'atual':'histórico'}`}));
}

export function metricLeaders(rows, field){
  const reported=rows.filter(r=>Number.isFinite(r[field]));
  if(!reported.length)return {state:'missing',value:null,keys:[],partial:false};
  const value=Math.max(...reported.map(r=>r[field]));
  const partial=reported.length<rows.length || reported.some(r=>r.partial?.[field]);
  if(value<=0)return {state:'zero',value,keys:[],partial};
  const keys=reported.filter(r=>r[field]===value).map(r=>r.key);
  return {state:keys.length===rows.length&&rows.length>1?'equal':'leaders',value,keys,partial};
}
