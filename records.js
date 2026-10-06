(() => {
  const cfg = window.CO2_STAND_CONFIG || {};
  const list = document.getElementById("recordList");
  const status = document.getElementById("status");
  const summary = document.getElementById("summaryCards");
  const notice = document.getElementById("integrationNotice");
  const refresh = document.getElementById("refreshBtn");

  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));

  const fmt = v => (Number(v)||0).toLocaleString("pt-BR", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  });

  function render(records, live){
    const clean = Array.isArray(records) ? records.filter(r => r && (r.id || r.empresa)) : [];
    const total = clean.reduce((s,r)=>s+(Number(r.total)||0),0);
    const avg = clean.length ? total/clean.length : 0;
    const max = clean.reduce((a,b)=>(Number(b.total)||0)>(Number(a.total)||0)?b:a,{total:0});

    summary.innerHTML = `
      <div class="summary-card"><small>Stands</small><strong>${clean.length}</strong></div>
      <div class="summary-card"><small>Pegada total</small><strong>${fmt(total)} kgCO₂e</strong></div>
      <div class="summary-card"><small>Média / stand</small><strong>${fmt(avg)} kgCO₂e</strong></div>
      <div class="summary-card"><small>Maior emissão</small><strong>${fmt(max.total)} kgCO₂e</strong></div>`;

    list.innerHTML = clean.map(r => `
      <article class="record-card">
        <div class="top">
          <div>
            <span class="record-id">${esc(r.id || "Stand")}</span>
            <h3>${esc(r.empresa || "Sem nome")}</h3>
            <div class="stand">Stand ${esc(r.stand || "-")}</div>
          </div>
        </div>
        <div class="total-row">
          <span>Emissão estimada</span>
          <strong>${fmt(r.total)} kgCO₂e</strong>
        </div>
        <span class="source-pill">Maior fonte: ${esc(r.maiorFonte || "-")}</span>
      </article>`).join("") || `<div class="integration-notice">Nenhum registro disponível.</div>`;

    status.textContent = live ? "Dados atualizados da planilha" : "Prévia com dados de teste";
    notice.classList.toggle("hidden", live);
  }

  async function load(){
    status.textContent = "Carregando registros…";

    if(!cfg.recordsApiUrl){
      render(cfg.demoRecords || [], false);
      return;
    }

    try{
      const res = await fetch(cfg.recordsApiUrl, { cache:"no-store" });

      if(!res.ok){
        throw new Error("HTTP " + res.status);
      }

      const json = await res.json();
      render(Array.isArray(json) ? json : (json.records || []), true);
    }catch(err){
      render(cfg.demoRecords || [], false);
      status.textContent = "Falha ao atualizar; mostrando dados de teste";
    }
  }

  refresh.addEventListener("click", load);
  load();
})();
