(() => {
  const person = window.CO2Person;
  const statusAction = person ? 'personStatus' : 'status';
  const form = document.getElementById('co2Form');
  const steps = [...form.querySelectorAll('.form-step')];
  const $ = id => document.getElementById(id);
  const field = name => form.elements[name];
  const selected = name => form.querySelector(`[name="${name}"]:checked`)?.value || '';
  const show = (el, visible) => el.classList.toggle('hidden', !visible);
  const draftKey = person ? 'co2PersonDraft' : 'co2StandDraft', pendingKey = person ? 'co2PersonPending' : 'co2StandPending';
  let current = 0, busy = false, pending = null, saved = null;
  const storage = {
    get(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { $('draftStatus').textContent = 'Rascunho indisponível neste navegador. Mantenha esta página aberta até concluir.'; } },
    remove(key) { try { localStorage.removeItem(key); } catch { /* Continua nesta página. */ } }
  };
  form.querySelectorAll('input[type="number"]').forEach(input => {
    input.id = input.name;
    if(person && ['daysDone','daysPlanned'].includes(input.name)) return;
    const wrap = input.closest('.field'), label = document.createElement('label');
    label.className = 'unknown-choice';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox'; checkbox.dataset.unknown = input.name;
    checkbox.setAttribute('aria-label', 'Não sei: ' + wrap.querySelector('span').textContent.replace('*', '').trim());
    label.append(checkbox, document.createTextNode(' Não sei'));
    wrap.after(label); // Rótulos separados, sem labels aninhados.
    input.dataset.required = String(input.required);
  });
  const unknownBoxes = new Map([...form.querySelectorAll('[data-unknown]')].map(el=>[el.dataset.unknown,el]));
  const unknownBox = name => unknownBoxes.get(name);
  function conditional(element, on) {
    show(element, on);
    element.querySelectorAll('input, textarea').forEach(el => { el.disabled = !on; });
  }
  function required(name, on) {
    form.querySelectorAll(`[name="${name}"]`).forEach(el => {
      el.required = on; if(el.type === 'number') el.dataset.required = String(on);
    });
  }
  function applyConditionals() {
    if(person) person.apply();
    else {
    const transport = selected('transporte');
    const motor = !!transport && transport !== 'A pé / bicicleta';
    const vehicle = ['Carro gasolina','Carro diesel','Moto','Aplicativo / táxi'].includes(transport);
    conditional(document.querySelector('.transport-count'), !!transport);
    document.querySelectorAll('.transport-common').forEach(el => conditional(el, motor));
    conditional(document.querySelector('.vehicle-occupancy'), vehicle);
    show($('walkNote'), transport === 'A pé / bicicleta');
    required('pessoasTransporte', !!transport); required('distanciaEquipe', motor); required('ocupacaoVeiculo', vehicle);
    const extra = selected('equipAlto') === 'Sim';
    conditional($('extraEquipment'), extra);
    ['equipNome','equipQtd','equipHoras'].forEach(name => required(name, extra));
    const logistics = selected('logistica') === 'Sim';
    conditional($('logisticsDetails'), logistics);
    ['veiculoLog','distanciaLog','viagensLog'].forEach(name => required(name, logistics));
    const materials = [...form.querySelectorAll('[name="materiais"]:checked')].map(el => el.value);
    document.querySelectorAll('.material-qty').forEach(el => {
      const on = materials.includes(el.dataset.for); conditional(el, on); required(el.querySelector('input').name, on);
    });
    const exact = selected('residuoFaixa') === 'Sei o valor em kg';
    conditional($('exactWasteWrap'), exact); required('residuoKg', exact);
    const waste = selected('residuoFaixa') !== 'Nenhum';
    conditional($('wasteDetails'), waste); required('tipoResiduo', waste); required('destinoResiduo', waste);
    const meals = selected('refeicoes') === 'Sim';
    conditional($('mealDetails'), meals); required('refeicoesQtd', meals); required('tipoRefeicao', meals);
    }
    form.querySelectorAll('input[type="number"]').forEach(input => {
      const box = unknownBox(input.name), visible = !input.closest('.hidden');
      if(!box) return;
      show(box.parentElement, visible); box.disabled = !visible;
      input.disabled = !visible || box.checked;
      input.required = visible && !box.checked && input.dataset.required === 'true';
    });
  }
  function snapshot() {
    const data = {};
    form.querySelectorAll('[name]').forEach(el => {
      if (['radio','checkbox'].includes(el.type)) {
        if (el.checked) data[el.name] = [].concat(data[el.name] || [], el.value);
      } else data[el.name] = el.value;
    });
    if(person) data._person = person.snapshot();
    data._unknown = [...form.querySelectorAll('[data-unknown]:checked')].map(el => el.dataset.unknown);
    return data;
  }
  function restore(data) {
    if (!data) return;
    if(person) person.restore(data._person);
    Object.entries(data).forEach(([name,value]) => {
      form.querySelectorAll(`[name="${CSS.escape(name)}"]`).forEach(el => {
        if (['radio','checkbox'].includes(el.type)) el.checked = [].concat(value).includes(el.value);
        else el.value = value;
      });
    });
    (data._unknown || []).forEach(name => { if(unknownBox(name)) unknownBox(name).checked = true; });
  }
  function clearError() {
    show($('formError'), false);
    form.querySelectorAll('[aria-invalid]').forEach(el => { el.removeAttribute('aria-invalid'); el.removeAttribute('aria-describedby'); });
  }
  function error(message, input) {
    $('formError').textContent = message; show($('formError'), true);
    if(input) { input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby','formError'); input.focus(); }
    else $('formError').focus();
    return false;
  }
  function validateStep() {
    clearError(); applyConditionals();
    for (const input of steps[current].querySelectorAll('input,textarea,select')) {
      if(input.disabled || input.closest('.hidden')) continue;
      if(input.type === 'text' && input.required && !input.value.trim()) return error('Preencha o campo indicado.', input);
      if(!input.checkValidity()) return error(input.type === 'number' ? 'Informe um número válido dentro do limite indicado ou marque “Não sei”.' : 'Preencha o campo indicado ou selecione uma opção.', input);
    }
    if(person) return person.validate(current,error);
    if(current === 1) {
      const people = field('pessoasTransporte'), team = field('pessoasStand'), occupancy = field('ocupacaoVeiculo');
      if(!people.disabled && !team.disabled && Number(people.value) > Number(team.value)) return error('O grupo de transporte não pode ter mais pessoas que a equipe inteira.', people);
      if(!people.disabled && !occupancy.disabled && Number(occupancy.value) > Number(people.value)) return error('A ocupação por veículo não pode superar o número de pessoas desse grupo.', occupancy);
    }
    if(current === 4 && !form.querySelector('[name="materiais"]:checked')) return error('Selecione os materiais utilizados ou “Nenhum desses”.', form.querySelector('[name="materiais"]'));
    return true;
  }
  function renderStep() {
    steps.forEach((el, index) => el.classList.toggle('active', index === current));
    show($('prevBtn'), current > 0); show($('nextBtn'), current < steps.length - 1); show($('submitBtn'), current === steps.length - 1);
    const pct = Math.round((current + 1) / steps.length * 100);
    $('stepLabel').textContent = `Etapa ${current + 1} de ${steps.length}`;
    $('progressPct').textContent = pct + '%'; $('progressBar').style.width = pct + '%';
    applyConditionals();
    if(person) show($('scopeNote'),current === 0);
    if(person && current === steps.length - 1) person.review();
    const heading = steps[current].querySelector('h1'); heading.tabIndex = -1; heading.focus({preventScroll:true});
    window.scrollTo({top:0, behavior:'instant'});
  }
  function lockForm(locked) {
    form.querySelectorAll('input,textarea,select,button').forEach(el => el.disabled = locked);
    if(!locked) applyConditionals();
    $('submitBtn').disabled = busy;
    $('submitBtn').textContent = busy ? 'Aguardando confirmação…' : pending ? 'Verificar / tentar novamente' : 'Finalizar entrevista';
    $('newEntryBtn').disabled = busy; $('retryResultBtn').disabled = busy;
  }
  function hidden(name, value) {
    let input = form.querySelector(`input[type="hidden"][name="${name}"]`);
    if(!input) { input = document.createElement('input'); input.type = 'hidden'; input.name = name; form.append(input); }
    input.value = value; input.disabled = false;
  }
  function showSaved(record, state) {
    saved = record; storage.remove(draftKey);
    // O ID fica em memória para esta tela, mas um resultado confirmado não é rascunho.
    if(state === 'ready') storage.remove(pendingKey);
    show($('scopeNote'), false); $('draftStatus').textContent = '';
    show(form, false); show(document.querySelector('.progress-wrap'), false); show($('successView'), true);
    $('savedIdentity').textContent = person ? `${record.id} · Pessoa visitante · Registro salvo na planilha` : `${record.empresa} · Stand ${record.stand} · Registro salvo na planilha`;
    $('successTitle').focus();
    $('resultStatus').textContent = state === 'ready' ? '' : 'Registro salvo. O cálculo ainda não está disponível; consulte novamente sem reenviar a entrevista.';
    show($('interviewResult'), state === 'ready'); show($('retryResultBtn'), state !== 'ready');
    if(state !== 'ready') return;
    $('resultLabel').textContent = record.partial ? 'Subtotal estimado · dados incompletos' : 'Emissão estimada';
    $('resultTotal').textContent = record.total === null ? 'Dados insuficientes' : `${CO2Api.format(record.total)} kgCO₂e`;
    $('resultSource').textContent = record.maiorFonte ? `Maior fonte ${record.partial ? 'entre as parcelas calculadas' : 'de emissão'}: ${record.maiorFonte}` : 'Sem fonte predominante identificada.';
    $('resultBreakdown').replaceChildren();
    const breakdown = person ? {'Já realizado (estimado)':record.done, 'Ainda previsto':record.planned, ...record.breakdown} : record.breakdown;
    Object.entries(breakdown || {}).forEach(([label,value]) => {
      const dt = document.createElement('dt'), dd = document.createElement('dd');
      dt.textContent = label; dd.textContent = value === null ? 'Não calculado' : `${CO2Api.format(value)} kgCO₂e`;
      $('resultBreakdown').append(dt,dd);
    });
    $('resultNotes').replaceChildren();
    (record.notes || []).forEach(note => { const li = document.createElement('li'); li.textContent = note; $('resultNotes').append(li); });
  }
  async function pollResult() {
    for(let attempt = 0; attempt < 8; attempt++) {
      const response = await CO2Api.read({action:statusAction, requestId:pending.requestId});
      if(response.state === 'ready' || response.state === 'calculating') {
        showSaved(response.record, response.state);
        if(response.state === 'ready') return true;
      }
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    return !!saved;
  }
  form.addEventListener('change', e => {
    if(e.target.name === 'materiais') {
      if(e.target.value === 'Nenhum desses' && e.target.checked) form.querySelectorAll('[name="materiais"]').forEach(el => { if(el !== e.target) el.checked = false; });
      else if(e.target.checked) $('noneMaterials').checked = false;
    }
    applyConditionals(); storage.set(draftKey, snapshot()); clearError();
  });
  form.addEventListener('input', e => {
    if(e.target.tagName === 'TEXTAREA') { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }
    storage.set(draftKey, snapshot()); clearError();
  });
  $('nextBtn').addEventListener('click', () => { if(validateStep()) { current++; renderStep(); } });
  $('prevBtn').addEventListener('click', () => { current--; clearError(); renderStep(); });
  form.addEventListener('submit', async e => {
    e.preventDefault(); if(busy) return;
    if(!pending) {
      for(current = 0; current < steps.length; current++) {
        if(!validateStep()) { renderStep(); form.querySelector('[aria-invalid="true"]')?.focus(); return; }
      }
      current = steps.length - 1; renderStep();
    }
    busy = true; lockForm(true); clearError();
    try {
      const meta = await CO2Api.read({action:'meta'});
      if(meta.version !== 45) throw new Error('Atualize a implantação do Apps Script para a versão 45 antes de enviar. Suas respostas foram preservadas.');
      if(person && (meta.personVersion < (pending && !JSON.parse(pending.payload || '{}').surveyVersion ? 1 : 2) || !meta.personVersion)) throw new Error('Atualize o Apps Script com suporte a entrevistas de pessoas antes de enviar. O rascunho foi preservado.');
      if(!person) { $('eventHours').textContent = meta.hours; field('equipHoras').max = meta.hours; }
      if(!pending) {
        lockForm(false);
        if(!person && !field('equipHoras').disabled && Number(field('equipHoras').value) > meta.hours) {
          current = 2; renderStep(); throw new Error(`As horas de uso não podem superar as ${meta.hours} horas de referência do evento.`);
        }
        const unknown = [...form.querySelectorAll('[data-unknown]:checked')].filter(el => !el.disabled).map(el => el.dataset.unknown);
        const payload = person ? JSON.stringify(person.payload()) : null;
        if(person) { lockForm(true); await CO2Api.read({action:'validatePerson',payload}); }
        pending = {requestId:crypto.randomUUID(), data:snapshot(), unknown, payload};
        storage.set(pendingKey, pending);
      }
      lockForm(true);
      const existing = await CO2Api.read({action:statusAction, requestId:pending.requestId});
      if(existing.state === 'ready' || existing.state === 'calculating') showSaved(existing.record, existing.state);
      if(existing.state === 'not_found' || existing.state === 'preparing') {
        lockForm(false);
        hidden('action',person ? 'submitPerson' : 'submit'); hidden('requestId',pending.requestId);
        if(person) { hidden('payload',pending.payload); form.querySelectorAll('[name]:not([type=hidden])').forEach(el=>el.disabled=true); }
        else { hidden('unknownFields',JSON.stringify(pending.unknown)); hidden('periodo','Evento inteiro'); }
        form.action = window.CO2_STAND_CONFIG.apiUrl; form.method = 'GET'; form.target = 'submitFrame';
        HTMLFormElement.prototype.submit.call(form); lockForm(true);
      }
      if(existing.state !== 'ready' && !await pollResult()) throw new Error('Ainda não foi possível confirmar o salvamento. As respostas estão preservadas. Use “Verificar / tentar novamente”; o mesmo identificador evita duplicar o registro.');
    } catch(err) {
      if(saved) { $('resultStatus').textContent = 'Registro salvo. Não foi possível consultar o cálculo agora.'; show($('retryResultBtn'), true); }
      else error(err.message);
    } finally { busy = false; lockForm(!!pending); }
  });
  $('retryResultBtn').addEventListener('click', async () => {
    busy = true; lockForm(true);
    try { await pollResult(); } catch { $('resultStatus').textContent = 'Registro salvo. A consulta falhou; tente novamente quando houver conexão.'; }
    finally { busy = false; lockForm(true); }
  });
  $('newEntryBtn').addEventListener('click', () => {
    if(busy) return;
    storage.remove(pendingKey); storage.remove(draftKey); pending = null; saved = null;
    show($('scopeNote'), true);
    form.reset(); if(person) person.restore(null); form.querySelectorAll('input[type="hidden"]').forEach(el => el.remove());
    if(person) $('personReview').replaceChildren();
    $('interviewResult').classList.add('hidden');
    $('resultStatus').textContent = '';
    show($('successView'), false); show(form, true); show(document.querySelector('.progress-wrap'), true);
    $('draftStatus').textContent = ''; current = 0; clearError(); lockForm(false); renderStep();
  });
  pending = storage.get(pendingKey); restore(pending?.data || storage.get(draftKey));
  if(pending) { current = steps.length - 1; $('draftStatus').textContent = 'Há uma entrevista aguardando confirmação. Verifique antes de iniciar outra.'; }
  else if(storage.get(draftKey)) $('draftStatus').textContent = 'Rascunho recuperado. Confira as respostas antes de continuar.';
  renderStep(); lockForm(!!pending);
  $('newEntryBtn').disabled = false; $('retryResultBtn').disabled = false;
  if(pending) {
    // Recupera confirmações antigas sem criar outra linha na planilha.
    busy = true; lockForm(true);
    $('draftStatus').textContent = 'Verificando se a entrevista anterior já foi salva…';
    CO2Api.read({action:statusAction, requestId:pending.requestId}).then(response => {
      if(response.state === 'ready' || response.state === 'calculating') showSaved(response.record,response.state);
      else $('draftStatus').textContent = 'Há uma entrevista aguardando confirmação. Use “Verificar / tentar novamente”.';
    }).catch(() => {
      $('draftStatus').textContent = 'Não foi possível verificar a entrevista anterior. Suas respostas estão preservadas; use “Verificar / tentar novamente”.';
    }).finally(() => { busy = false; lockForm(true); });
  }
  if(!person) CO2Api.read({action:'meta'}).then(meta => { if(meta.version === 45) { $('eventHours').textContent = meta.hours; field('equipHoras').max = meta.hours; } }).catch(() => {});
})();
