import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const input = process.argv[2];
if (!input) throw new Error('Informe o caminho da extração Meta Ads revisada.');
const evidence = JSON.parse(fs.readFileSync(input, 'utf8').replace(/^\uFEFF/, ''));
if (!String(evidence.account?.id).endsWith('2489051944900337')) throw new Error('Conta diferente da autorizada.');
if (!evidence.extractedAt || !evidence.period?.since || !evidence.period?.until) throw new Error('Extração sem data ou cobertura.');
for (const key of ['daily','campaignDaily','adsetDaily','adDaily']) {
  if (!Array.isArray(evidence[key])) throw new Error(`Dataset ausente: ${key}`);
}
const target = path.join(project,'src','data.json');
const existing = JSON.parse(fs.readFileSync(target,'utf8'));
const definitions = [
  {label:'Investimento',definition:'Valor gasto no Meta Ads, em reais, somado dentro do período e dos filtros selecionados.'},
  {label:'Leads no site',definition:'Evento de lead atribuído pelo Meta. Tipos equivalentes não são somados entre si. Ação ausente preservada como não reportada.'},
  {label:'Custo por lead',definition:'Investimento dividido pelos leads reportados. Indisponível quando o número de leads é ausente ou zero.'},
  {label:'CTR do link',definition:'Cliques no link divididos pelas impressões; recalculado após os filtros.'},
  {label:'CPC do link',definition:'Investimento dividido pelos cliques no link; recalculado após os filtros.'},
  {label:'Alcance',definition:'Valor único retornado diretamente pelo Meta para o escopo consultado. Nunca somado entre dias, campanhas ou públicos.'},
];
const source = (description, grain) => ({
  provider:'Meta Ads MCP',type:'api',description,grain,currency:'BRL',timezone:evidence.timezone,
  executedAt:evidence.extractedAt,coverage:{start:evidence.period.since,end:evidence.period.until},
  metricDefinitions:definitions,
  evidenceFlow:(evidence.sourceRequests ?? []).map(request=>({title:request.tool ?? 'Meta Ads',detail:JSON.stringify(request)})),
  notes:(evidence.limitations ?? []).join(' '),
});
const query = (rows,description,grain) => ({rows,source:source(description,grain),methods:[{language:'text',code:'Dados normalizados da API. Agregar somente medidas aditivas; preservar null; recalcular taxas por razão de somas; aplicar interseção de data, campanha e conjunto. Alcance exige consulta direta no mesmo escopo.'}]});
const {daily,campaignDaily,adsetDaily,adDaily,...meta}=evidence;
const snapshot={...existing,title:'Rücker Curi · Bright Performance',surface:'dashboard',status:'reviewed',buildStatus:'creating',generatedAt:evidence.extractedAt,meta,
  filters:[
    {id:'date',label:'Período',field:'date',mode:'range',defaultValue:`${evidence.period.since}..${evidence.period.until}`,queryIds:['meta_daily','meta_campaign_daily','meta_adset_daily','meta_ad_daily']},
    {id:'campaignId',label:'Campanha',field:'campaignId',defaultValue:'all',queryIds:['meta_campaign_daily','meta_adset_daily','meta_ad_daily']},
    {id:'adsetId',label:'Público',field:'adsetId',defaultValue:'all',queryIds:['meta_adset_daily','meta_ad_daily']},
  ],
  queries:{
    meta_daily:query(daily,'Entrega diária da conta selecionada. Inclui o histórico arquivado.','conta × dia'),
    meta_campaign_daily:query(campaignDaily,'Resultados diários de cada campanha, inclusive o histórico arquivado.','campanha × dia'),
    meta_adset_daily:query(adsetDaily,'Resultados diários por conjunto de anúncios.','conjunto × dia'),
    meta_ad_daily:query(adDaily,'Resultados diários por anúncio.','anúncio × dia'),
    meta_campaign_total:query([{...evidence.campaignTotal,budget:evidence.campaign.budget,campaignId:evidence.campaign.id,startTime:evidence.campaign.startTime,endTime:evidence.campaign.endTime}],'Orçamento e resultados acumulados da campanha atual, independentes dos filtros do painel.','campanha atual × período consultado'),
  }
};
fs.writeFileSync(target,JSON.stringify(snapshot,null,2)+'\n');
console.log(JSON.stringify({id:snapshot.id,generatedAt:snapshot.generatedAt,rows:Object.fromEntries(Object.entries(snapshot.queries).map(([key,q])=>[key,q.rows.length]))}));
