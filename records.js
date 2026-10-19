(() => {
  const $=id=>document.getElementById(id), fmt=CO2Api.format;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const number=v=>typeof v==='number'&&Number.isFinite(v);
  const sum=(rows,key)=>{const values=rows.map(r=>r[key]).filter(number);return values.length?values.reduce((a,b)=>a+b,0):null;};
  const amount=v=>number(v)?fmt(v)+' kgCO₂e':'Não calculado';
  let stands=[],people=[],failures=[],loaded=false;
  const filters=()=>{const p=new URLSearchParams(location.search);return {type:['stand','person'].includes(p.get('tipo'))?p.get('tipo'):'todos',page:Math.max(1,Math.floor(Number(p.get('pagina'))||1))};};
  function url(type,page=1){return '?'+new URLSearchParams({tipo:type,pagina:page});}
  function metric(label,value){return `<div class="summary-card"><small>${label}</small><strong>${value}</strong></div>`;}
  function overview(rows,type){
    const person=type==='person', error=failures.includes(type), complete=rows.filter(r=>number(r.total)&&!r.partial), partial=rows.filter(r=>r.partial||!number(r.total)).length;
    const distinct=new Set(rows.map(r=>String(r.stand||'').trim().toLocaleLowerCase('pt-BR')).filter(Boolean)).size;
    return `<section class="summary-group"><h2>${person?'Pessoas visitantes':'Stands'}</h2>${error?'<p class="form-error">Não foi possível atualizar esta base. '+(loaded?'Os resultados anteriores disponíveis foram mantidos.':'Tente Atualizar.')+'</p>':''}<div class="summary-cards">${metric(person?'Pessoas entrevistadas':'Stands identificados',person?rows.length:distinct+' / 33')}${metric('Soma das parcelas disponíveis',amount(sum(rows,'total')))}${person?metric('Já realizado · estimado',amount(sum(rows,'done')))+metric('Ainda previsto',amount(sum(rows,'planned'))):metric('Entrevistas registradas',rows.length)+metric('Média dos registros completos',amount(complete.length?sum(complete,'total')/complete.length:null))}</div><p class="field-help">${partial} registro(s) parcial(is) ou pendente(s). ${person?'Realizado e previsto incluem somente parcelas calculáveis.':'A cobertura usa identificadores de stand distintos; entrevistas repetidas continuam na soma e precisam ser revisadas.'}</p></section>`;
  }
  function card(r){
    const person=r.type==='person';
    const details=person?{'Já realizado · estimado':r.done,'Ainda previsto':r.planned,...r.breakdown}:r.breakdown;
    return `<article class="record-card"><span class="record-id">${person?'Pessoa':'Stand'} · ${esc(r.id)}</span><h3>${person?'Visitante '+esc(r.id):esc(r.empresa||'Sem nome')}</h3><div class="stand">${person?`${esc(r.daysDone)} dia(s) realizados · ${esc(r.daysPlanned)} previstos`:'Stand '+esc(r.stand||'—')}</div><div class="total-row"><span>${r.partial?'Subtotal disponível':'Emissão estimada'}</span><strong>${amount(r.total)}</strong></div><span class="source-pill">Maior fonte calculada: ${esc(r.maiorFonte||'Não identificada')}</span><details><summary>Detalhar resultado</summary><dl class="result-breakdown">${Object.entries(details||{}).map(([k,v])=>`<dt>${esc(k)}</dt><dd>${amount(v)}</dd>`).join('')}</dl>${person?'<p class="field-help">Os valores por categoria somam realizado e previsto. Categorias incompletas mostram somente as parcelas disponíveis.</p>':''}<ul class="result-notes">${(r.notes||[]).map(n=>`<li>${esc(n)}</li>`).join('')}</ul></details></article>`;
  }
  function render(){
    const {type,page:requested}=filters();
    document.querySelectorAll('[data-type]').forEach(a=>{if(a.dataset.type===type)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    $('summaryCards').innerHTML=(type!=='person'?overview(stands,'stand'):'')+(type!=='stand'?overview(people,'person'):'');
    const rows=[...(type!=='person'?stands:[]),...(type!=='stand'?people:[])],size=12,pages=Math.max(1,Math.ceil(rows.length/size)),page=Math.min(requested,pages);
    if(page!==requested)history.replaceState(null,'',url(type,page));
    $('recordList').innerHTML=rows.slice((page-1)*size,page*size).map(card).join('')||'<div class="method-note">'+(failures.length?'Não há registros carregados nesta visão. Tente Atualizar.':'Nenhuma entrevista nesta visão. Inicie uma entrevista pela página inicial.')+'</div>';
    $('pagination').innerHTML=`${page>1?`<a class="page-link" href="${url(type,page-1)}">← Anterior</a>`:'<span></span>'}<span>${rows.length?`${(page-1)*size+1}–${Math.min(page*size,rows.length)} de ${rows.length}`:'0 registros'} · Página ${page} de ${pages}</span>${page<pages?`<a class="page-link" href="${url(type,page+1)}">Próxima →</a>`:'<span></span>'}`;
  }
  async function load(){
    $('status').textContent='Carregando registros…';$('refreshBtn').disabled=true;
    const results=await Promise.allSettled([CO2Api.read(),CO2Api.read({action:'meta'}).then(meta=>{if(![1,2].includes(meta.personVersion))throw Error('Atualize o Apps Script');return CO2Api.read({action:'people'});})]);
    failures=[];
    results.forEach((r,i)=>{if(r.status==='rejected'){failures.push(i?'person':'stand');return;}const rows=(Array.isArray(r.value)?r.value:r.value.records||[]).filter(Boolean);if(i)people=rows.map(r=>({...r,type:'person'}));else stands=rows.map(r=>({...r,type:'stand'}));});
    render();loaded=true;
    $('status').textContent=failures.length?'Atualização incompleta. Verifique a conexão e a implantação do Apps Script.':'Dados atualizados da planilha · valores em kgCO₂e';
    $('refreshBtn').disabled=false;
  }
  document.addEventListener('click',e=>{const a=e.target.closest('.result-filters a,#pagination a');if(!a||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;e.preventDefault();history.pushState(null,'',a.getAttribute('href'));render();});
  window.addEventListener('popstate',render);$('refreshBtn').addEventListener('click',load);load();
})();
