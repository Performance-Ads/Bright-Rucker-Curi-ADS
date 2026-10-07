import React, {useState, useRef} from 'react';
import {metricLeaders} from './creative-metrics.mjs';
import {creativeImages} from './creative-images.mjs';

const number=v=>Number.isFinite(v)?new Intl.NumberFormat('pt-BR').format(v):'—';
const money=v=>Number.isFinite(v)?new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v):'—';
const fields={linkClicks:'Cliques no link',impressions:'Impressões',landingPageViews:'Visitas à página',leads:'Leads',spend:'Investimento'};
function CreativeCard({row,leaders}){
  const [slide,setSlide]=useState(0);
  const dialog=useRef(null);
  const media=row.media.filter(m=>creativeImages[m.hash]);
  const selected=media[slide] || media[0];
  return <article className="rc-creative-card" data-reviewed-rows>
    <div className="rc-creative-art">
      {selected?<button className="rc-art-open" onClick={()=>dialog.current.showModal()} aria-label={`Ampliar ${row.label}, imagem ${slide+1}`}><img src={creativeImages[selected.hash]} alt={`${row.concept}: ${selected.title || 'criativo'} · imagem ${slide+1}`} loading="lazy" width="1080" height="1350"/></button>:<p>Imagem não disponível</p>}
      {media.length>1&&<div className="rc-carousel-controls"><button aria-label={`Imagem anterior de ${row.label}`} onClick={()=>setSlide((slide+media.length-1)%media.length)}>←</button><span>{slide+1} / {media.length}</span><button aria-label={`Próxima imagem de ${row.label}`} onClick={()=>setSlide((slide+1)%media.length)}>→</button></div>}
    </div>
    <div className="rc-creative-info"><div className="rc-creative-heading"><h4>{row.concept}</h4><span>{row.current?'Campanha atual':'Histórico'}</span></div>
    <p className="rc-creative-title">{row.media[0]?.title || row.concept}</p>
    <div className="rc-creative-badges">{['linkClicks','impressions','leads'].filter(f=>leaders[f].state==='leaders'&&leaders[f].keys.includes(row.key)).map(f=><span key={f}>{leaders[f].keys.length>1?'Empate em ': 'Mais '}{fields[f].toLowerCase()}{leaders[f].partial?' reportados':''}</span>)}</div>
    <dl className="rc-creative-numbers">{Object.entries(fields).map(([f,label])=><div key={f}><dt>{label}</dt><dd>{f==='spend'?money(row[f]):row[f]==null?'Não reportado':number(row[f])}{row.partial?.[f]?' *':''}</dd></div>)}<div><dt>CPC de link</dt><dd>{money(row.linkCpc)}</dd></div></dl></div>
    <dialog ref={dialog} className="rc-creative-dialog" aria-label={`Criativo ${row.label}`} onClick={e=>{if(e.target===dialog.current)dialog.current.close();}}><div className="rc-dialog-toolbar"><span>{row.label} · {slide+1}/{media.length}</span><button autoFocus onClick={()=>dialog.current.close()}>Fechar ×</button></div>{selected&&<img src={creativeImages[selected.hash]} alt={selected.title || row.label}/>}</dialog>
  </article>;
}

export function CreativeGallery({rows}){
  const [sort,setSort]=useState('linkClicks');
  const leaders=Object.fromEntries(Object.keys(fields).map(f=>[f,metricLeaders(rows,f)]));
  const ordered=[...rows].sort((a,b)=>(b[sort]??-Infinity)-(a[sort]??-Infinity)||b.impressions-a.impressions||a.label.localeCompare(b.label));
  if(!rows.length)return <p className="rc-caption">Nenhum criativo com entrega no período e nos filtros selecionados.</p>;
  return <section className="rc-creative-gallery" aria-label="Galeria de criativos">
    <div className="rc-gallery-heading"><div><h3>Criativos em destaque</h3><p className="rc-caption">Imagens dos anúncios e resultados no recorte selecionado. Toque na imagem para ampliar.</p></div><label>Ordenar por <select value={sort} onChange={e=>setSort(e.target.value)}>{Object.entries(fields).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label></div>
    <div className="rc-creative-leaders" data-reviewed-rows>{['linkClicks','impressions','leads'].map(field=>{const result=leaders[field];return <div key={field}><span>{field==='leads'?'Leads reportados':`Mais ${fields[field].toLowerCase()}`}</span><strong>{result.state==='missing'?'Não reportado':result.state==='zero'?'Nenhum resultado':result.state==='equal'?`Empate entre os ${rows.length} criativos`:rows.filter(r=>result.keys.includes(r.key)).map(r=>r.label).join(' / ')}</strong>{result.value>0&&<small>{number(result.value)} {fields[field].toLowerCase()}{result.keys.length>1?' por criativo':''}{result.partial?' · dados parciais':''}</small>}</div>;})}</div>
    <p className="rc-caption rc-gallery-note">Os destaques indicam volume, sem comprovar maior eficiência. {leaders.leads.state==='missing'?'Ainda não há leads reportados para comparar conversões. ':''}* Soma parcial dos valores reportados. Métricas de carrossel se referem ao anúncio completo.</p>
    <div className="rc-creative-grid">{ordered.map(row=><CreativeCard key={row.key} row={row} leaders={leaders}/>)}</div>
  </section>;
}
