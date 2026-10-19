/* Perguntas de visitantes; form.js mantém navegação, rascunho, envio e resultado. */
(() => {
  const modes=['Carro gasolina','Carro diesel','Carro etanol','Carro elétrico','Carro flex / não sei','Moto','Aplicativo / táxi','Ônibus','Trem','Metrô','Van','Avião','A pé / bicicleta','Não sei'];
  const meals=['Carne bovina','Frango','Vegetariana','Outro / não sei'];
  const participation={'Só hoje':'today','Hoje e amanhã':'todayTomorrow','Ontem e hoje':'yesterdayToday','Outro dia ainda incerto':'unknown'};
  const quick=(name,values)=>`<div class="quick-values" role="group" aria-label="Sugestões rápidas"><span class="field-help">Toque para preencher</span>${values.map(v=>`<button type="button" disabled data-fill="${name}" data-value="${v}" aria-pressed="false">${v}</button>`).join('')}</div>`;
  const number=(name,label,min=0,value='')=>{
    const suggestions=name.endsWith('Km')?[5,10,20,50,100]:name.endsWith('Occupants')?[1,2,3,4,5]:name.endsWith('Count')?[1,2]:[0,1,2,3];
    return `<div class="field"><label for="${name}"><span>${label}</span><input id="${name}" type="number" inputmode="${name.endsWith('Km')?'decimal':'numeric'}" name="${name}" min="${min}" max="100000" step="${name.endsWith('Km')?'any':'1'}" required value="${value}"></label>${quick(name,suggestions)}</div>`;
  };
  const choice=(name,label,options,value='')=>`<fieldset class="field"><legend>${label}</legend><div class="choice-grid">${options.map(o=>`<label><input type="radio" name="${name}" value="${o}" required${o===value?' checked':''}><span>${o}</span></label>`).join('')}</div></fieldset>`;
  const head=(title,text)=>`<div class="step-head"><span class="eyebrow green">Visitante</span><h1>${title}</h1><p>${text}</p></div>`;
  const trip=(i)=>{
    const title=i===0?'Ida de hoje':i===1?'Volta de hoje':i===2?'Ida do outro dia':i===3?'Volta do outro dia':`Trecho adicional ${i-3}`;
    return `<section class="trip-panel${i>1?' hidden':''}" data-trip="${i}"><h2>${title}</h2>${i<2?`<p class="field-help">${i===0?'Já realizada · chegada ao evento':'Ainda prevista · saída do evento'}</p>`:i<4?'<p class="field-help other-day-phase"></p>':choice('trip'+i+'Phase','Este trecho adicional…',['Já realizado','Ainda previsto'])}${choice('trip'+i+'Mode','Meio de transporte',modes)}<div data-distance="${i}">${number('trip'+i+'Km','Distância deste trecho, em um sentido (km)')}</div>${i<4?'':number('trip'+i+'Count','Quantas vezes esse trecho acontece?',1,1)}<div data-occupancy="${i}">${number('trip'+i+'Occupants','Pessoas no veículo, incluindo o visitante',1)}</div></section>`;
  };
  document.getElementById('personSteps').outerHTML=`
  <section class="form-step active">${head('Sobre a participação','O evento dura dois dias. A coleta acontece em um único dia, mas considera a participação completa de cada visitante.')}
  <div class="field"><label for="origin"><span>Cidade e bairro de origem</span><input id="origin" name="origin" type="text" maxlength="120" required placeholder="Cidade / bairro, se souber"></label>${quick('origin',['Mesma cidade do evento','Não sei'])}</div>
  ${choice('participation','Em quais dias a pessoa participa?',Object.keys(participation))}
  ${choice('mainReason','O evento foi o motivo principal da viagem?',['Sim','Não','Não sei'])}
  </section>
  <section class="form-step">${head('Como veio e como vai voltar','Informe a ida já realizada e a volta ainda prevista de hoje. Cada distância é de um sentido; não dobre o valor.')}
  ${trip(0)}<button id="copyOutbound" type="button" class="btn secondary copy-trip">Usar os mesmos dados na volta</button>${trip(1)}
  <div id="otherDayTravel" class="conditional-panel hidden">${choice('otherTravel','Deslocamentos no outro dia',['Repetir ida e volta de hoje','Informar outro percurso','Sem nova viagem','Não sei'])}<p class="field-help">Só repita se houver outra ida e outra volta iguais. Se a pessoa ficar hospedada, registre o percurso entre a hospedagem e o evento; não repita a viagem de chegada à cidade.</p></div>
  ${trip(2)}${trip(3)}
  <p class="field-help">Usou mais de um transporte ou chegou à cidade em outro dia? Acrescente somente os trechos que ainda não estão acima.</p>
  ${Array.from({length:6},(_,i)=>trip(i+4)).join('')}
  <div class="toolbar"><button id="addTrip" type="button">Adicionar trecho</button><button id="removeTrip" type="button">Retirar último trecho</button></div><p id="tripLimit" class="field-help" role="status"></p>
  </section>
  <section class="form-step">${head('Refeições e hospedagem','Conte o que já aconteceu e o que ainda está previsto em toda a participação, inclusive no outro dia, quando houver. Não multiplique pelos dois dias.')}
  ${meals.map((m,i)=>`<h2>${m}</h2>${number('meal'+i+'Done','Refeições já consumidas')}${number('meal'+i+'Planned','Refeições ainda previstas')}`).join('')}
  ${choice('stayType','Hospedagem por causa do evento',['Não','Hotel / pousada','Casa de conhecidos','Outro / não sei'])}
  <div id="stayDetails">${number('stayDone','Noites já utilizadas por causa do evento')}${number('stayPlanned','Noites ainda previstas por causa do evento')}<p class="field-help">Inclua as noites necessárias antes, entre ou depois dos dois dias do evento. Não presuma duas noites: registre o que a pessoa informar. As noites ficam registradas, ainda sem fator de hospedagem.</p></div>
  </section>
  <section class="form-step">${head('Conferir e concluir','Revise as respostas antes de salvar. Use Voltar para corrigir.')}
  <div id="personReview" class="review-card"></div><p class="field-help">Atividades futuras são previsões. O resultado considera somente as parcelas para as quais existem informação e fator compatível.</p></section>`;
  const form=document.getElementById('co2Form');
  let extraCount=0;
  const controls=new Map();
  form.querySelectorAll('[name]').forEach(el=>controls.set(el.name,[...(controls.get(el.name)||[]),el]));
  const field=name=>controls.get(name)?.[0];
  const value=name=>{const els=controls.get(name)||[];return (els[0]?.type==='radio'?els.find(el=>el.checked)?.value:els[0]?.value)||'';};
  const bothDays=()=>['Hoje e amanhã','Ontem e hoje'].includes(value('participation'));
  const otherPhase=()=>value('participation')==='Ontem e hoje'?'done':'planned';
  const activeTrip=i=>i<2 || (i<4?bothDays()&&value('otherTravel')==='Informar outro percurso':i<4+extraCount);
  function apply() {
    document.getElementById('otherDayTravel').classList.toggle('hidden',!bothDays());
    form.querySelectorAll('[data-trip]').forEach(panel=>{
      const i=Number(panel.dataset.trip),on=activeTrip(i),mode=value('trip'+i+'Mode');
      panel.classList.toggle('hidden',!on);
      panel.querySelectorAll('input,button').forEach(el=>el.disabled=!on);
      const vehicle=['Carro gasolina','Carro diesel','Carro etanol','Carro elétrico','Carro flex / não sei','Moto','Aplicativo / táxi','Van'].includes(mode);
      panel.querySelector('[data-distance]').classList.toggle('hidden',mode==='A pé / bicicleta');
      panel.querySelector('[data-occupancy]').classList.toggle('hidden',!vehicle);
      const phase=panel.querySelector('.other-day-phase');if(phase)phase.textContent=otherPhase()==='done'?'Já realizado · ontem':'Ainda previsto · amanhã';
    });
    const stay=value('stayType');
    document.getElementById('stayDetails').classList.toggle('hidden',!stay||stay==='Não');
    form.querySelectorAll('input[type=radio],button[data-fill]').forEach(el=>el.disabled=!!el.closest('.hidden'));
    document.getElementById('addTrip').disabled=extraCount>=6;
    document.getElementById('removeTrip').disabled=extraCount===0;
    document.getElementById('copyOutbound').disabled=!value('trip0Mode');
    document.getElementById('tripLimit').textContent=`${extraCount} de até 6 trechos adicionais.`;
    syncQuick();
  }
  function syncQuick(){form.querySelectorAll('[data-fill]').forEach(button=>{
    const input=field(button.dataset.fill),unknown=form.querySelector(`[data-unknown="${button.dataset.fill}"]`);
    button.setAttribute('aria-pressed',String(!unknown?.checked && input.value===button.dataset.value));
  });}
  form.addEventListener('click',e=>{
    const button=e.target.closest('button[data-fill]');if(!button||button.disabled)return;
    const input=field(button.dataset.fill),unknown=form.querySelector(`[data-unknown="${input.name}"]`);
    if(unknown)unknown.checked=false;
    input.value=button.dataset.value;
    // O foco permanece no botão, sem abrir o teclado do iPhone.
    input.dispatchEvent(new Event('change',{bubbles:true}));syncQuick();
  });
  form.addEventListener('input',syncQuick);
  ['addTrip','removeTrip'].forEach(id=>document.getElementById(id).addEventListener('click',()=>{
    if(id==='addTrip'&&extraCount<6)extraCount++;
    if(id==='removeTrip'&&extraCount>0)extraCount--;
    apply();form.dispatchEvent(new Event('change',{bubbles:true}));
    if(id==='addTrip')form.querySelector(`[name="trip${3+extraCount}Phase"]`).focus();else document.getElementById('addTrip').focus();
  }));
  document.getElementById('copyOutbound').addEventListener('click',()=>{
    form.querySelectorAll('[name=trip1Mode]').forEach(el=>el.checked=el.value===value('trip0Mode'));
    ['Km','Occupants'].forEach(suffix=>{
      field('trip1'+suffix).value=field('trip0'+suffix).value;
      const source=form.querySelector(`[data-unknown="trip0${suffix}"]`),target=form.querySelector(`[data-unknown="trip1${suffix}"]`);
      if(target)target.checked=!!source?.checked;
    });
    form.dispatchEvent(new Event('change',{bubbles:true}));
  });
  function num(name){const el=field(name);return el.disabled||el.value===''?null:Number(el.value);}
  function readTrip(i){return {phase:i===0?'done':i===1?'planned':i<4?otherPhase():value('trip'+i+'Phase')==='Já realizado'?'done':'planned',mode:value('trip'+i+'Mode'),km:num('trip'+i+'Km'),count:i<4?1:num('trip'+i+'Count'),occupants:num('trip'+i+'Occupants')};}
  function payload(){
    const p=participation[value('participation')], trips=Array.from({length:10},(_,i)=>i).filter(activeTrip).map(readTrip);
    if(bothDays()&&value('otherTravel')==='Repetir ida e volta de hoje')trips.push(...[0,1].map(i=>({...readTrip(i),phase:otherPhase()})));
    if(bothDays()&&value('otherTravel')==='Não sei')trips.push({phase:otherPhase(),mode:'Não sei',km:null,count:1,occupants:null});
    return {surveyVersion:2,eventDays:2,participation:p,otherTravel:bothDays()?value('otherTravel'):null,origin:value('origin'),mainReason:value('mainReason'),daysDone:p==='yesterdayToday'?2:1,daysPlanned:p==='todayTomorrow'?1:0,trips,
      meals:Object.fromEntries(meals.map((m,i)=>[m,{done:num('meal'+i+'Done'),planned:num('meal'+i+'Planned')}])),stay:{type:value('stayType'),done:num('stayDone'),planned:num('stayPlanned')}};
  }
  function review(){
    const target=document.getElementById('personReview');target.replaceChildren();
    const d=payload(),lines=[`Origem: ${d.origin}`,`Evento de 2 dias · participação: ${value('participation')}.`];
    if(bothDays())lines.push(`Outro dia: ${value('otherTravel')}.`);
    const n=v=>v===null?'Não sei':v;
    d.trips.forEach((t,i)=>lines.push(`Trecho ${i+1}: ${t.phase==='done'?'realizado':'previsto'} · ${t.mode} · ${t.mode==='A pé / bicicleta'?'emissão direta zero':n(t.km)+' km'} · ${n(t.count)} percurso(s)${t.occupants!==null?' · '+t.occupants+' ocupante(s)':''}.`));
    meals.forEach(m=>lines.push(`${m}: ${n(d.meals[m].done)} realizada(s), ${n(d.meals[m].planned)} prevista(s).`));
    lines.push(`Hospedagem: ${d.stay.type}${d.stay.type==='Não'?'':` · ${n(d.stay.done)} noite(s) realizadas, ${n(d.stay.planned)} previstas`}.`);
    lines.forEach(text=>{const p=document.createElement('p');p.textContent=text;target.append(p);});
  }
  window.CO2Person={apply,payload,review,snapshot:()=>({version:2,extraCount}),restore:data=>{extraCount=Math.max(0,Math.min(6,Number(data?.extraCount)||0));},validate(){return true;}};
})();
