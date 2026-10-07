import React from 'react';
import { DataComponent, DataTable, EvidenceChart, Filters, DateRangePicker, Dropdown, SortableItem, SortableRegion, useDataApp } from '../../data-app-public.jsx';
import { aggregate, groupMetrics, resolveScope, csvText } from './metrics.mjs';
import '../assets/fonts.css';
import './dashboard.css';

const money = value => Number.isFinite(value) ? new Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL'}).format(value) : '—';
const number = value => Number.isFinite(value) ? new Intl.NumberFormat('pt-BR').format(value) : '—';
const percent = value => Number.isFinite(value) ? new Intl.NumberFormat('pt-BR',{style:'percent',maximumFractionDigits:2}).format(value) : '—';
const day = value => value ? new Date(`${value.slice(0,10)}T12:00:00Z`).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',timeZone:'UTC'}) : '—';
const status = value => ({ACTIVE:'Ativo',PAUSED:'Pausado',ARCHIVED:'Arquivado',DELETED:'Excluído',CAMPAIGN_PAUSED:'Campanha pausada',ADSET_PAUSED:'Conjunto pausado',IN_PROCESS:'Em processamento',PENDING_REVIEW:'Em análise',DISAPPROVED:'Reprovado',UNKNOWN:'Não confirmado'}[value] || value || 'Histórico');
const metricNote = (totals, field, fallback) => totals.partial[field] ? 'Soma parcial dos valores reportados' : fallback;
const spendSpec = {type:'bar',x:'date',y:'spend',currency:'BRL',valueDecimals:2,stackable:false,colors:{spend:'var(--chart-1)'},legend:{labels:{spend:'Investimento'}}};
const audienceSpec = {type:'horizontalBar',x:'audience',y:'spend',currency:'BRL',valueDecimals:2,stackable:false,colors:{spend:'var(--chart-1)'},legend:{labels:{spend:'Investimento'}}};

function Kpi({id,title,value,note,queryId,sourceRows,displayRows,featured=false}) {
  return <DataComponent id={id} title={title} kind="metric" queryId={queryId} sourceRows={sourceRows} displayRows={displayRows} variant="card" className={`rc-kpi ${featured ? 'rc-kpi-featured' : ''}`}>
    <div className={`rc-kpi-value ${String(value).length > 20 ? 'rc-kpi-text' : ''}`} data-reviewed-rows>{value}</div>
    <p className="rc-kpi-note">{note}</p>
  </DataComponent>;
}

function exportAds(rows) {
  const blob = new Blob([csvText(rows,['adId','name','campaign','audience','status','spend','impressions','linkClicks','landingPageViews','leads','linkCtr','linkCpc'])],{type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href=url; link.download='rucker-curi-anuncios-filtrados.csv'; link.click(); URL.revokeObjectURL(url);
}

export function DashboardContent() {
  const {snapshot,queries,filters,setFilter} = useDataApp();
  const meta = snapshot.meta || {};
  const campaign = meta.campaign || {};
  const campaigns = meta.campaigns?.length ? meta.campaigns : campaign.id ? [campaign] : [];
  const campaignId = filters.campaignId || 'all';
  const adsetId = filters.adsetId || 'all';
  const dateRange = filters.date || 'all';
  const scope = resolveScope(queries,dateRange,adsetId,campaignId);
  const totals = scope.totals;
  const adsets = meta.adsets || [];
  const ads = meta.ads || [];
  const audienceLabel = item => `${item?.regionLabel || item?.name || 'Público'}${item?.historical ? ' · histórico' : ''}`;
  const adsetMap = new Map(adsets.map(item => [String(item.id),item]));
  const campaignMap = new Map(campaigns.map(item => [String(item.id),item]));
  const dates = [...new Set((queries.meta_daily?.rows || []).map(row=>row.date))].sort();
  const availableAdsets = adsets.filter(item => campaignId === 'all' || String(item.campaignId) === campaignId);
  const audiences = groupMetrics(scope.audiences,'adsetId').map(row=>({...row,audience:audienceLabel(adsetMap.get(String(row.adsetId)))}));
  const campaignEvidence = adsetId !== 'all' ? scope.sourceRows : scope.campaigns;
  const campaignRows = groupMetrics(campaignEvidence,'campaignId').map(row=>({...row,name:String(row.campaignId)===String(campaign.id)?'Bloqueio de WhatsApp · atual':'Bloqueio de WhatsApp · histórico',status:status(campaignMap.get(String(row.campaignId))?.status)}));
  const adTotals = new Map(groupMetrics(scope.ads,'adId').map(row=>[String(row.adId),row]));
  const scopedAds = ads.filter(item => (campaignId === 'all' || String(item.campaignId || adsetMap.get(String(item.adsetId))?.campaignId) === campaignId) && (adsetId === 'all' || String(item.adsetId) === adsetId));
  const adRows = scopedAds.map(item=>({...aggregate([]),...adTotals.get(String(item.id)),adId:item.id,name:item.name,audience:adsetMap.get(String(item.adsetId))?.regionLabel || adsetMap.get(String(item.adsetId))?.name || item.adsetId,campaign:campaignMap.get(String(item.campaignId || adsetMap.get(String(item.adsetId))?.campaignId))?.name || '—',status:status(item.status),concept:item.concept || item.name,destination:item.destination}));
  const creativeSource = scope.ads.map(row=>({...row,concept:ads.find(item=>String(item.id)===String(row.adId))?.concept || ads.find(item=>String(item.id)===String(row.adId))?.name || row.adId}));
  const creativeRows = groupMetrics(creativeSource.map(row=>({...row,concept:campaignId==='all'?`${row.concept} · ${String(row.campaignId)===String(campaign.id)?'atual':'histórico'}`:row.concept})),'concept').sort((a,b)=>(b.spend||0)-(a.spend||0));
  const totalBudget = typeof campaign.budget === 'object' ? campaign.budget.amount : campaign.budget;
  const budget = Number.isFinite(totalBudget) ? totalBudget : null;
  const campaignSpend = meta.campaignTotal?.spend;
  const budgetUsed = budget > 0 && Number.isFinite(campaignSpend) ? campaignSpend/budget : null;
  const budgetRows = queries.meta_campaign_total?.rows || [];
  const extracted = meta.extractedAt ? new Date(meta.extractedAt).toLocaleString('pt-BR',{timeZone:meta.timezone || 'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'}) : 'Horário não informado';
  const selectedLabel = campaignId === 'all' ? 'Conta completa' : campaignMap.get(campaignId)?.name || 'Campanha selecionada';
  const metricsRows = scope.sourceRows.length ? [totals] : [];
  const stages = [{stage:'Impressões',value:totals.impressions,note:'Exibições dos anúncios'}, {stage:'Cliques no link',value:totals.linkClicks,note:`CTR de link ${percent(totals.linkCtr)}`}, {stage:'Visualizações da página',value:totals.landingPageViews,note:totals.partial.landingPageViews?'Valor parcialmente reportado':'Carregamentos reportados'}, {stage:'Leads',value:totals.leads,note:totals.leads == null?'Nenhum lead reportado':'Eventos de lead reportados'}];
  const tableColumns = [{field:'name',label:'Anúncio',presentation:'identity',secondaryField:'adId'},{field:'audience',label:'Público'},{field:'status',label:'Status'},{field:'spend',label:'Investimento',renderCell:money},{field:'impressions',label:'Impressões',renderCell:number},{field:'linkClicks',label:'Cliques no link',renderCell:number},{field:'landingPageViews',label:'Visitas à página',renderCell:(value,row)=><span>{number(value)}{row.partial?.landingPageViews?' *':''}</span>},{field:'leads',label:'Leads',renderCell:value=>value==null?'Não reportado':number(value)},{field:'linkCtr',label:'CTR de link',renderCell:percent},{field:'linkCpc',label:'CPC de link',renderCell:money}];

  return <article className="rc-dashboard">
    <div className="rc-brand-row">
      <div className="rc-brand"><span>Bright</span><small>Performance</small></div>
      <p className="rc-extraction">Meta Ads · BRL <span>Extraído em {extracted} · {meta.timezone || 'America/Sao_Paulo'}</span></p>
    </div>
    <div className="rc-context"><div><p className="rc-eyebrow">Meta Ads · Bloqueio de WhatsApp</p><h2>Rücker <em>Curi</em></h2></div><span className="rc-pill">Leitura inicial</span></div>
    <p className="rc-intro">Acompanhe o investimento, o tráfego e os leads reportados pela Meta. Os resultados ainda têm pouco volume para comparar a eficiência dos anúncios.</p>
    <Filters ariaLabel="Filtros de desempenho" showClear={false} filters={[]} queries={queries} values={filters} onChange={setFilter}>
      <DateRangePicker label="Período" choices={dates} value={dateRange} onChange={value=>setFilter('date',value)} formatChoice={value=>value==='all'?'Todo o período':value.split('..').map(day).join(' – ')} />
      <Dropdown showLabel allLabel="Todas" label="Campanha" value={campaignId} choices={['all',...campaigns.map(item=>String(item.id))]} choiceLabels={{all:'Todas as campanhas',...Object.fromEntries(campaigns.map(item=>[String(item.id),item.id===campaign.id?'Campanha atual':'Histórico · rascunho 1']))}} onChange={value=>{setFilter('campaignId',value);setFilter('adsetId','all');}} />
      <Dropdown showLabel allLabel="Todos" label="Público" value={adsetId} choices={['all',...availableAdsets.map(item=>String(item.id))]} choiceLabels={{all:'Todos os públicos',...Object.fromEntries(availableAdsets.map(item=>[String(item.id),audienceLabel(item)]))}} onChange={value=>setFilter('adsetId',value)} />
      <button className="rc-text-button" onClick={()=>{setFilter('date','all');setFilter('campaignId','all');setFilter('adsetId','all');}}>Restaurar visão geral</button>
    </Filters>
    <div className="rc-scope"><span>{selectedLabel} · {scope.sourceRows.length ? `${scope.daily.length} dia(s) com dados` : 'Sem dados neste recorte'}</span><span>{day(meta.period?.until)} é parcial · dados até a extração</span></div>

    <SortableRegion id="rc:performance" variant="canvas" columns={12} spacing="standard" label="Painel de desempenho" rows={[
      {id:'rc:kpis',kind:'metrics',items:['rc-spend','rc-leads','rc-cpl','rc-lpviews']},
      {id:'rc:delivery',items:['rc-daily-spend','rc-audiences']},
      {id:'rc:journey',items:['rc-stages']},
      {id:'rc:campaigns',items:['rc-campaign-history','rc-budget']},
      {id:'rc:creatives',items:['rc-creatives']},
      {id:'rc:ads',items:['rc-ad-details']}
    ]}>
      <SortableItem id="rc-spend" kind="metric" span={3} label="Investimento"><Kpi id="rc-spend" title="Investimento" value={money(totals.spend)} note="Valor gasto no recorte selecionado" featured queryId={scope.queryId} sourceRows={scope.sourceRows} displayRows={metricsRows}/></SortableItem>
      <SortableItem id="rc-leads" kind="metric" span={3} label="Leads"><Kpi id="rc-leads" title="Leads no site" value={totals.leads==null?'Nenhum lead reportado':number(totals.leads)} note={metricNote(totals,'leads','Eventos atribuídos pela Meta')} queryId={scope.queryId} sourceRows={scope.sourceRows} displayRows={metricsRows}/></SortableItem>
      <SortableItem id="rc-cpl" kind="metric" span={3} label="Custo por lead"><Kpi id="rc-cpl" title="Custo por lead" value={money(totals.cpl)} note={totals.cpl==null?'Aguardando leads reportados':'Investimento ÷ leads reportados'} queryId={scope.queryId} sourceRows={scope.sourceRows} displayRows={metricsRows}/></SortableItem>
      <SortableItem id="rc-lpviews" kind="metric" span={3} label="Visualizações da página"><Kpi id="rc-lpviews" title="Visualizações da página" value={number(totals.landingPageViews)} note={metricNote(totals,'landingPageViews',totals.landingPageViews==null?'Ação não reportada neste recorte':'Carregamentos da página de destino')} queryId={scope.queryId} sourceRows={scope.sourceRows} displayRows={metricsRows}/></SortableItem>

      <SortableItem id="rc-daily-spend" kind="chart" span={7} label="Investimento por dia"><EvidenceChart id="rc-daily-spend" title="Investimento por dia" queryId={scope.queryId} spec={spendSpec} rows={scope.daily} sourceRows={scope.sourceRows} height={260} variant="card"><p className="rc-caption">Cada barra representa um dia reportado. O último dia ainda está em andamento; a diferença entre dias não indica uma tendência.</p></EvidenceChart></SortableItem>
      <SortableItem id="rc-audiences" kind="chart" span={5} label="Distribuição por público"><EvidenceChart id="rc-audiences" title="Distribuição por público" queryId="meta_adset_daily" spec={audienceSpec} rows={audiences} sourceRows={scope.audiences} height={260} variant="card"><p className="rc-caption">Investimento por conjunto de anúncios. A distribuição inicial não determina um público vencedor.</p></EvidenceChart></SortableItem>

      <SortableItem id="rc-stages" kind="custom" span={12} label="Da exposição ao lead"><DataComponent id="rc-stages" title="Da exposição ao lead" kind="custom" queryId={scope.queryId} sourceRows={scope.sourceRows} displayRows={stages} variant="card"><div className="rc-stages" data-reviewed-rows>{stages.map((stage,index)=><div className="rc-stage" key={stage.stage}><span className="rc-step">0{index+1}</span><p>{stage.stage}</p><strong>{number(stage.value)}</strong><small>{stage.note}</small></div>)}</div><p className="rc-caption">Contagens de eventos em etapas diferentes. Não representam as mesmas pessoas acompanhadas em um funil. Cliques no link podem não gerar carregamento de página.</p></DataComponent></SortableItem>

      <SortableItem id="rc-campaign-history" kind="table" span={7} label="Campanhas no período"><DataComponent id="rc-campaign-history" title="Campanhas no período" kind="table" queryId={adsetId!=='all'?scope.queryId:'meta_campaign_daily'} sourceRows={campaignEvidence} displayRows={campaignRows} variant="card"><DataTable rows={campaignRows} columns={[{field:'name',label:'Campanha'},{field:'status',label:'Status'},{field:'spend',label:'Investimento',renderCell:money},{field:'linkClicks',label:'Cliques no link',renderCell:number}]} searchable={false} caption="Campanhas no recorte selecionado"/><p className="rc-caption">O histórico e a campanha atual aparecem separados. O total da conta pode incluir campanhas anteriores.</p></DataComponent></SortableItem>
      <SortableItem id="rc-budget" kind="custom" span={5} label="Orçamento da campanha atual"><DataComponent id="rc-budget" title="Orçamento da campanha atual" kind="custom" queryId="meta_campaign_total" sourceRows={budgetRows} displayRows={budgetRows} variant="card" className="rc-budget"><p className="rc-eyebrow">Campanha inteira · independente dos filtros</p><div className="rc-budget-amount" data-reviewed-rows>{money(budget)}</div><div className="rc-budget-track" role="progressbar" aria-label="Orçamento consumido da campanha atual" aria-valuemin={0} aria-valuemax={100} aria-valuenow={budgetUsed==null?undefined:Math.min(100,budgetUsed*100)}><span style={{width:`${budgetUsed==null?0:Math.min(100,budgetUsed*100)}%`}}/></div><div className="rc-budget-stats" data-reviewed-rows><span>{money(campaignSpend)} utilizados</span><span>{budgetUsed > 0 && budgetUsed < .0001 ? '< 0,01%' : percent(budgetUsed)}</span></div><p className="rc-caption">Vigência: {day(campaign.startTime || '2026-10-06')} a {day(campaign.endTime || '2026-11-06')}. Saldo de planejamento: {budget!=null && Number.isFinite(campaignSpend)?money(Math.max(0,budget-campaignSpend)):'—'}.</p></DataComponent></SortableItem>

      <SortableItem id="rc-creatives" kind="table" span={12} label="Leitura dos criativos"><DataComponent id="rc-creatives" title="Leitura dos criativos" kind="table" queryId="meta_ad_daily" sourceRows={scope.ads} displayRows={creativeRows} variant="card"><p className="rc-caption rc-caption-top">Comparação descritiva dos conceitos com entrega no período. Aguarde mais volume e leads para avaliar desempenho.</p><DataTable rows={creativeRows} columns={[{field:'concept',label:'Conceito criativo'},{field:'spend',label:'Investimento',renderCell:money},{field:'impressions',label:'Impressões',renderCell:number},{field:'linkClicks',label:'Cliques no link',renderCell:number},{field:'landingPageViews',label:'Visitas à página',renderCell:(value,row)=>`${number(value)}${row.partial?.landingPageViews?' *':''}`},{field:'leads',label:'Leads',renderCell:value=>value==null?'Não reportado':number(value)}]} searchable={false} caption="Resultados por conceito criativo"/><p className="rc-caption">* Valor parcial: apenas os valores reportados foram somados. Campo em branco ou traço indica ausência de informação.</p></DataComponent></SortableItem>

      <SortableItem id="rc-ad-details" kind="table" span={12} label="Detalhamento dos anúncios"><DataComponent id="rc-ad-details" title="Detalhamento dos anúncios" kind="table" queryId="meta_ad_daily" sourceRows={scope.ads} displayRows={adRows} variant="card"><details className="rc-ad-disclosure"><summary><span>Explorar os {adRows.length} anúncios deste recorte</span><small>Nomes completos, públicos e métricas</small></summary><div className="rc-ad-tools"><p className="rc-caption">Anúncios cadastrados sem linha de entrega no período exibem “—”; ausência de linha não significa gasto zero.</p><button className="rc-export-button" onClick={()=>exportAds(adRows)}>Exportar CSV</button></div><DataTable rows={adRows} columns={tableColumns} rowKey="adId" caption="Todos os anúncios no recorte selecionado"/></details></DataComponent></SortableItem>
    </SortableRegion>
    <footer className="rc-method"><div><p className="rc-eyebrow">Sobre esta leitura</p><p>Atribuição: 7 dias após clique e 1 dia após visualização. Fonte: Meta Marketing API · Conta {meta.account?.id || '2489051944900337'}. CTR de link = cliques no link ÷ impressões. CPC de link = investimento ÷ cliques no link. CPL = investimento ÷ leads reportados.</p><p>Ações ausentes na resposta da Meta permanecem sem valor. Extrações em momentos diferentes podem gerar pequenas diferenças entre conta, campanhas e anúncios. O alcance não é somado entre dias ou públicos.</p></div>{meta.limitations?.length>0 && <details><summary>Notas de disponibilidade dos dados</summary><ul>{meta.limitations.map((note,index)=><li key={index}>{typeof note==='string'?note:JSON.stringify(note)}</li>)}</ul></details>}</footer>
  </article>;
}
