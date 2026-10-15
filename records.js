(() => {
  const cfg = window.CO2_STAND_CONFIG || {};
  const list = document.getElementById("recordList");
  const status = document.getElementById("status");
  const summary = document.getElementById("summaryCards");
  const refresh = document.getElementById("refreshBtn");

  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
  const fmt = CO2Api.format;

  function render(records){
    const clean = Array.isArray(records) ? records.filter(r=>r && (r.id||r.empresa)) : [];
    const calculated = clean.filter(r => typeof r.total === 'number' && Number.isFinite(r.total));
    const total = calculated.reduce((s,r)=>s+r.total,0);
    const avg = calculated.length ? total/calculated.length : null;
    const max = calculated.reduce((a,b)=>b.total > a.total ? b : a,{total:calculated.length ? 0 : null});
    const incomplete = clean.some(r => r.partial || r.total === null);

    summary.innerHTML = `
      <div class="summary-card"><small>Stands</small><strong>${clean.length}</strong></div>
      <div class="summary-card"><small>${incomplete ? 'Subtotal disponível' : 'Pegada total'}</small><strong>${fmt(calculated.length ? total : null)} kgCO₂e</strong></div>
      <div class="summary-card"><small>Média / stand</small><strong>${fmt(avg)} kgCO₂e</strong></div>
      <div class="summary-card"><small>Maior emissão</small><strong>${fmt(max.total)} kgCO₂e</strong></div>`;

    list.innerHTML = clean.map(r=>`
      <article class="record-card">
        <span class="record-id">${esc(r.id||"Stand")}</span>
        <h3>${esc(r.empresa||"Sem nome")}</h3>
        <div class="stand">Stand ${esc(r.stand||"-")}</div>
        <div class="total-row"><span>${r.partial ? 'Subtotal estimado' : 'Emissão estimada'}</span><strong>${r.total === null ? 'Pendente / dados insuficientes' : fmt(r.total) + ' kgCO₂e'}</strong></div>
        <span class="source-pill">Maior fonte calculada: ${esc(r.maiorFonte||"Não identificada")}</span>
        ${(r.notes || []).map(note => `<p class="field-help">${esc(note)}</p>`).join('')}
      </article>`).join("") || `<div class="method-note">Nenhum registro disponível.</div>`;

    status.textContent = incomplete ? 'Dados atualizados · há registros parciais ou pendentes' : 'Dados atualizados da planilha';
  }

  async function load(){
    status.textContent="Carregando registros…";
    refresh.disabled = true;
    try{
      const json=await CO2Api.read();
      render(Array.isArray(json)?json:(json.records||[]));
    }catch(e){
      status.textContent="Não foi possível carregar os registros.";
      list.innerHTML='<div class="method-note">Verifique a implantação do Apps Script e tente novamente.</div>';
    } finally { refresh.disabled = false; }
  }
  refresh.addEventListener("click",load);
  load();
})();
