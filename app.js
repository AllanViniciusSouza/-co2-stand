(() => {
  const cfg = window.CO2_STAND_CONFIG || {};
  const views = ["home","form","records"];

  function showView(name){
    if(!views.includes(name)) name="home";
    views.forEach(v => document.getElementById("view-"+v)?.classList.toggle("active", v===name));
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.view===name));
    window.scrollTo({top:0,behavior:"smooth"});
    if(name==="records") loadRecords();
  }

  document.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click",()=>showView(b.dataset.go)));
  document.querySelectorAll(".nav-btn").forEach(b => b.addEventListener("click",()=>showView(b.dataset.view)));
  document.getElementById("homeBtn").addEventListener("click",()=>showView("home"));
  document.getElementById("refreshBtn").addEventListener("click",loadRecords);

  const list = document.getElementById("recordList");
  const status = document.getElementById("recordStatus");
  const summary = document.getElementById("recordSummary");
  const apiHelp = document.getElementById("apiHelp");

  function safeText(v){ return String(v ?? "").replace(/[&<>"']/g, m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m])); }
  function fmt(v){ const n=Number(v)||0; return n.toLocaleString("pt-BR",{minimumFractionDigits:3,maximumFractionDigits:3}); }

  function render(records, source){
    const clean = Array.isArray(records) ? records.filter(r => r && (r.id || r.empresa)) : [];
    const total = clean.reduce((s,r)=>s+(Number(r.total)||0),0);
    const max = clean.reduce((a,b)=>(Number(b.total)||0)>(Number(a.total)||0)?b:a,{total:0});
    summary.innerHTML = `
      <div class="summary-card"><small>Stands</small><strong>${clean.length}</strong></div>
      <div class="summary-card"><small>Pegada total</small><strong>${fmt(total)} kgCO₂e</strong></div>
      <div class="summary-card"><small>Média / stand</small><strong>${fmt(clean.length?total/clean.length:0)} kgCO₂e</strong></div>
      <div class="summary-card"><small>Maior emissão</small><strong>${fmt(max.total)} kgCO₂e</strong></div>`;
    list.innerHTML = clean.length ? clean.map(r=>`
      <article class="record-card">
        <div class="record-top"><div><span class="record-id">${safeText(r.id||"Stand")}</span><h3>${safeText(r.empresa||"Sem nome")}</h3><div class="stand">Stand ${safeText(r.stand||"-")}</div></div></div>
        <div class="metric"><span>Emissão estimada</span><strong>${fmt(r.total)} kgCO₂e</strong></div>
        <span class="dominant">Maior fonte: ${safeText(r.maiorFonte||"-")}</span>
      </article>`).join("") : `<div class="help-card">Nenhum registro encontrado.</div>`;
    status.textContent = source==="api" ? "Dados atualizados da planilha" : "Prévia com registros de teste";
    apiHelp.classList.toggle("hidden", source==="api");
  }

  async function loadRecords(){
    status.textContent="Carregando registros…";
    if(!cfg.recordsApiUrl){
      render(cfg.demoRecords||[],"demo");
      return;
    }
    try{
      const res=await fetch(cfg.recordsApiUrl,{cache:"no-store"});
      if(!res.ok) throw new Error("HTTP "+res.status);
      const data=await res.json();
      render(Array.isArray(data)?data:(data.records||[]),"api");
    }catch(e){
      render(cfg.demoRecords||[],"demo");
      status.textContent="Não foi possível atualizar; mostrando prévia";
      apiHelp.classList.remove("hidden");
    }
  }

  showView("home");
})();