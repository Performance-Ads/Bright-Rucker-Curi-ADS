import fs from 'node:fs';
const fresh=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const previous=JSON.parse(fs.readFileSync(process.argv[3],'utf8'));
if(fresh.account.id!==previous.account.id) throw new Error('Conta divergente');
const num=v=>v==null?null:Number(v);
function normalize(r){
  const actions=new Map((r.actions||[]).map(a=>[a.action_type,num(a.value)]));
  return {date:r.date_start,dateStop:r.date_stop,...Object.fromEntries(['campaign','adset','ad'].filter(k=>r[k+'_id']).map(k=>[k+'Id',r[k+'_id']])),spend:num(r.spend),impressions:num(r.impressions),reach:num(r.reach),clicks:num(r.clicks),linkClicks:num(r.inline_link_clicks),landingPageViews:actions.get('landing_page_view')??null,leads:actions.get('offsite_conversion.fb_pixel_lead')??actions.get('lead')??null};
}
const keys=['daily','campaignDaily','adsetDaily','adDaily'];
const evidence={...previous,extractedAt:fresh.extractedAt};
fresh.insights.forEach((q,i)=>{if(q.paging?.next)throw new Error('Paginação incompleta');if(i<4)evidence[keys[i]]=q.data.map(normalize);});
evidence.accountTotal=normalize(fresh.insights[4].data[0]);
evidence.campaignTotal=normalize(fresh.insights[5].data[0]);
evidence.ads=fresh.ads.map(ad=>({...previous.ads.find(a=>a.id===ad.id),...ad,deliveryStatus:evidence.adDaily.some(r=>r.adId===ad.id)?'delivered':'no_delivery'}));
for(const c of fresh.campaigns){const mapped={id:c.id,name:c.name,status:c.status,budget:num(c.lifetime_budget)/100,startTime:c.start_time,endTime:c.stop_time};evidence.campaigns=evidence.campaigns.map(old=>old.id===c.id?mapped:old);if(c.id===evidence.campaign.id)evidence.campaign=mapped;}
const sum=(rows,k)=>rows.reduce((s,r)=>s+(r[k]??0),0);
evidence.reconciliation=Object.fromEntries(keys.map(k=>[k,{spend:Math.round(sum(evidence[k],'spend')*100)/100,impressions:sum(evidence[k],'impressions'),linkClicks:sum(evidence[k],'linkClicks')} ]));
evidence.limitations=previous.limitations.filter(s=>!s.startsWith('Metadados dos anúncios'));
evidence.limitations.push('Status dos anúncios arquivados confirmado na atualização; status do conjunto histórico permanece não confirmado. Imagens vinculadas pelo image_hash da Meta.');
const base={object_id:fresh.account.id,fields:'date_start,date_stop,account_id,campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,impressions,reach,clicks,inline_link_clicks,actions',time_range:evidence.period,action_attribution_windows:evidence.attribution,limit:1000};
evidence.sourceRequests=[...['account','campaign','adset','ad'].map(level=>({tool:'METAADS_GET_INSIGHTS',arguments:{...base,level,time_increment:1},executedAt:fresh.extractedAt})),...['account','campaign'].map(level=>({tool:'METAADS_GET_INSIGHTS',arguments:{...base,level,object_id:level==='account'?fresh.account.id:evidence.campaign.id},executedAt:fresh.extractedAt})),{tool:'METAADS_GET_OBJECT',arguments:{object_id:fresh.account.id,fields:'id,name,currency,timezone_name,campaigns.limit(100){id,name,status,lifetime_budget,start_time,stop_time},ads.limit(100){id,name,campaign_id,adset_id,status,creative{id,image_url,thumbnail_url,object_story_spec}}'},executedAt:fresh.extractedAt},...evidence.ads.filter(a=>a.historical).map(a=>({tool:'METAADS_GET_OBJECT',arguments:{object_id:a.id,fields:'id,name,status,campaign_id,adset_id,creative{id,image_url,thumbnail_url,object_story_spec}'},executedAt:fresh.extractedAt})),{tool:'METAADS_GET_OBJECT',arguments:{object_id:fresh.account.id,fields:'id,adimages.limit(100){hash,name,url,width,height}'},executedAt:fresh.extractedAt}];
fs.writeFileSync(process.argv[4],JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify({extractedAt:evidence.extractedAt,reconciliation:evidence.reconciliation}));
