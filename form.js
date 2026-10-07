(() => {
  const cfg = window.CO2_STAND_CONFIG || {};
  const form = document.getElementById("co2Form");
  const steps = [...document.querySelectorAll(".form-step")];
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const submitBtn = document.getElementById("submitBtn");
  const errorBox = document.getElementById("formError");
  const successView = document.getElementById("successView");
  const progressBar = document.getElementById("progressBar");
  const stepLabel = document.getElementById("stepLabel");
  const progressPct = document.getElementById("progressPct");
  let current = 0;

  function q(name){ return form.querySelector(`[name="${name}"]:checked`)?.value || ""; }
  function byName(name){ return form.elements[name]; }
  function setRequired(el, yes){ if(!el) return; el.required = !!yes; if(!yes) el.setCustomValidity(""); }
  function show(el, yes){ el?.classList.toggle("hidden", !yes); }

  function applyConditionals(){
    const transport = q("transporte");
    const isWalk = transport === "A pé / bicicleta";
    const vehicle = ["Carro gasolina","Carro diesel","Moto","Aplicativo / táxi"].includes(transport);
    document.querySelectorAll(".transport-common").forEach(el => show(el, !!transport && !isWalk));
    show(document.getElementById("walkNote"), isWalk);
    show(document.querySelector(".vehicle-occupancy"), vehicle);
    setRequired(byName("pessoasTransporte"), !!transport && !isWalk);
    setRequired(byName("distanciaEquipe"), !!transport && !isWalk);
    setRequired(byName("ocupacaoVeiculo"), vehicle);

    const extra = q("equipAlto") === "Sim";
    show(document.getElementById("extraEquipment"), extra);
    ["equipNome","equipQtd","equipHoras"].forEach(n => setRequired(byName(n), extra));

    const log = q("logistica") === "Sim";
    show(document.getElementById("logisticsDetails"), log);
    form.querySelectorAll('[name="veiculoLog"]').forEach(x => x.required = log);
    setRequired(byName("distanciaLog"), log);
    setRequired(byName("viagensLog"), log);

    const selectedMaterials = [...form.querySelectorAll('[name="materiais"]:checked')].map(x=>x.value);
    document.querySelectorAll(".material-qty").forEach(el => {
      const on = selectedMaterials.includes(el.dataset.for);
      show(el, on);
      setRequired(el.querySelector("input"), on);
    });

    const exactWaste = q("residuoFaixa") === "Sei o valor em kg";
    show(document.getElementById("exactWasteWrap"), exactWaste);
    setRequired(byName("residuoKg"), exactWaste);

    const meals = q("refeicoes") === "Sim";
    show(document.getElementById("mealDetails"), meals);
    setRequired(byName("refeicoesQtd"), meals);
    form.querySelectorAll('[name="tipoRefeicao"]').forEach(x => x.required = meals);
  }

  form.addEventListener("change", e => {
    if(e.target.id === "noneMaterials" && e.target.checked){
      form.querySelectorAll('[name="materiais"]').forEach(x => { if(x !== e.target) x.checked = false; });
    } else if(e.target.name === "materiais" && e.target.value !== "Nenhum desses" && e.target.checked){
      document.getElementById("noneMaterials").checked = false;
    }
    applyConditionals();
    saveDraft();
  });

  form.addEventListener("input", saveDraft);

  function validateStep(){
    applyConditionals();
    const active = steps[current];
    const fields = [...active.querySelectorAll("input,textarea")].filter(el => !el.closest(".hidden"));

    for(const el of fields){
      if(!el.checkValidity()){
        el.reportValidity();
        return false;
      }
    }

    const requiredRadios = [...active.querySelectorAll('input[type="radio"][required]')];
    const names = [...new Set(requiredRadios.map(x=>x.name))];
    for(const name of names){
      if(!active.querySelector(`input[name="${name}"]:checked`)){
        errorBox.textContent = "Selecione uma opção antes de continuar.";
        show(errorBox, true);
        return false;
      }
    }

    show(errorBox, false);
    return true;
  }

  function renderStep(){
    steps.forEach((s,i)=>s.classList.toggle("active", i===current));
    prevBtn.classList.toggle("hidden", current===0);
    nextBtn.classList.toggle("hidden", current===steps.length-1);
    submitBtn.classList.toggle("hidden", current!==steps.length-1);

    const pct = Math.round(((current+1)/steps.length)*100);
    progressBar.style.width = pct+"%";
    stepLabel.textContent = `Etapa ${current+1} de ${steps.length}`;
    progressPct.textContent = pct+"%";
    window.scrollTo({top:0,behavior:"smooth"});
    applyConditionals();
  }

  nextBtn.addEventListener("click", ()=>{
    if(!validateStep()) return;
    if(current < steps.length-1){ current++; renderStep(); }
  });

  prevBtn.addEventListener("click", ()=>{
    if(current>0){ current--; renderStep(); }
  });

  function val(name){ return (byName(name)?.value ?? "").toString().trim(); }

  function payload(){
    const materials = [...form.querySelectorAll('[name="materiais"]:checked')]
      .map(x=>x.value).join(", ");

    return {
      empresa: val("empresa"),
      stand: val("stand"),
      pessoasStand: val("pessoasStand"),
      transporte: q("transporte"),
      pessoasTransporte: val("pessoasTransporte"),
      distanciaEquipe: val("distanciaEquipe"),
      ocupacaoVeiculo: val("ocupacaoVeiculo"),
      notebooks: val("notebooks"),
      tvs: val("tvs"),
      iluminacao: val("iluminacao"),
      equipAlto: q("equipAlto"),
      equipNome: val("equipNome"),
      equipQtd: val("equipQtd"),
      equipHoras: val("equipHoras"),
      logistica: q("logistica"),
      veiculoLog: q("veiculoLog"),
      distanciaLog: val("distanciaLog"),
      viagensLog: val("viagensLog"),
      materiais,
      folders: val("folders"),
      copos: val("copos"),
      pet: val("pet"),
      residuoFaixa: q("residuoFaixa"),
      residuoKg: val("residuoKg"),
      tipoResiduo: q("tipoResiduo"),
      destinoResiduo: q("destinoResiduo"),
      refeicoes: q("refeicoes"),
      refeicoesQtd: val("refeicoesQtd"),
      tipoRefeicao: q("tipoRefeicao"),
      acaoAmbiental: val("acaoAmbiental")
    };
  }

  /*
   * Envio robusto para Apps Script:
   * usa um FORM HTML tradicional direcionado a um iframe invisível.
   * Isso evita CORS/redirecionamentos do fetch() no Safari/iPhone.
   */
  function prepareNativeSubmission(){
    if(!cfg.apiUrl){
      throw new Error("API não configurada");
    }

    form.action = cfg.apiUrl;
    form.method = "GET";
    form.target = "submitFrame";

    let actionInput = form.querySelector('input[name="action"]');
    if(!actionInput){
      actionInput = document.createElement("input");
      actionInput.type = "hidden";
      actionInput.name = "action";
      form.appendChild(actionInput);
    }
    actionInput.value = "submit";
  }

  form.addEventListener("submit", e=>{
    e.preventDefault();
    if(!validateStep()) return;

    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando…";
    show(errorBox, false);

    try{
      prepareNativeSubmission();

      // Envia os próprios campos reais do formulário.
      // Isso evita fetch, CORS, POST e montagem manual de parâmetros.
      HTMLFormElement.prototype.submit.call(form);

      setTimeout(() => {
        localStorage.removeItem("co2StandDraft");
        form.classList.add("hidden");
        document.querySelector(".progress-wrap").classList.add("hidden");
        successView.classList.remove("hidden");
        submitBtn.disabled = false;
        submitBtn.textContent = "Enviar levantamento";
        window.scrollTo({top:0,behavior:"smooth"});
      }, 2200);

    }catch(err){
      errorBox.textContent = "Não foi possível iniciar o envio. Recarregue a página e tente novamente.";
      show(errorBox,true);
      submitBtn.disabled = false;
      submitBtn.textContent = "Enviar levantamento";
    }
  });

  document.getElementById("newEntryBtn").addEventListener("click", ()=>{
    form.reset();
    current = 0;
    successView.classList.add("hidden");
    form.classList.remove("hidden");
    document.querySelector(".progress-wrap").classList.remove("hidden");
    submitBtn.disabled = false;
    submitBtn.textContent = "Enviar levantamento";
    renderStep();
  });

  function saveDraft(){
    const data = {};
    new FormData(form).forEach((v,k)=>{
      if(data[k] !== undefined) data[k] = [].concat(data[k], v);
      else data[k] = v;
    });
    localStorage.setItem("co2StandDraft", JSON.stringify(data));
  }

  function restoreDraft(){
    try{
      const data = JSON.parse(localStorage.getItem("co2StandDraft") || "{}");
      Object.entries(data).forEach(([name,value])=>{
        const els = form.querySelectorAll(`[name="${CSS.escape(name)}"]`);
        els.forEach(el=>{
          if(el.type==="radio" || el.type==="checkbox"){
            const vals = Array.isArray(value)?value:[value];
            el.checked = vals.includes(el.value);
          }else if(typeof value === "string"){
            el.value = value;
          }
        });
      });
    }catch(e){}
  }

  restoreDraft();
  renderStep();
})();