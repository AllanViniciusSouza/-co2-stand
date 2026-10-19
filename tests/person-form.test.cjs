const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
function setup(read,storage={}){
 const html=fs.readFileSync('pessoa.html','utf8').replace(/<script[^>]*><\/script>/g,'');
 const dom=new JSDOM(html,{url:'http://localhost/pessoa.html',runScripts:'outside-only'}),w=dom.window;
 w.scrollTo=()=>{};w.CSS={escape:x=>x};w.CO2_STAND_CONFIG={apiUrl:'http://localhost/api'};w.CO2Api={read:read|| (async()=>({version:45,personVersion:2,hours:8})),format:n=>String(n)};
 Object.entries(storage).forEach(([k,v])=>w.localStorage.setItem(k,v));
 w.eval(fs.readFileSync('pessoa.js','utf8'));w.eval(fs.readFileSync('form.js','utf8'));
 const doc=w.document,set=(name,value)=>{let el=doc.querySelector(`[name="${name}"]`);if(el.type==='radio'){el=[...doc.querySelectorAll(`[name="${name}"]`)].find(x=>x.value===value);el.checked=true;}else el.value=value;el.dispatchEvent(new w.Event('change',{bubbles:true}));};
 const fill=()=>{for(const [k,v] of Object.entries({participation:'Só hoje',origin:'Campinas',mainReason:'Sim',trip0Mode:'A pé / bicicleta',trip1Mode:'A pé / bicicleta',stayType:'Não'}))set(k,v);for(let i=0;i<4;i++){set('meal'+i+'Done','0');set('meal'+i+'Planned','0');}};
 const submit=()=>doc.querySelector('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 return {dom,w,doc,set,fill,submit};
}
const tick=()=>new Promise(r=>setImmediate(r));
test('pessoa UI: campos condicionais, rascunho próprio, revisão e restauração de trechos',()=>{
 const a=setup();a.fill();a.doc.getElementById('addTrip').click();a.set('trip4Phase','Ainda previsto');a.set('trip4Mode','Ônibus');a.set('trip4Km','12');
 assert.equal(a.doc.querySelector('[name=trip4Occupants]').disabled,true);
 a.doc.querySelector('[data-unknown=trip4Km]').click();assert.equal(a.w.CO2Person.payload().trips[2].km,null);
 const draft=a.w.localStorage.getItem('co2PersonDraft');assert.ok(draft);assert.equal(a.w.localStorage.getItem('co2StandDraft'),null);
 const b=setup(null,{co2PersonDraft:draft});assert.equal(b.w.CO2Person.payload().trips.length,3);assert.equal(b.doc.querySelector('[name=trip4Km]').disabled,true);
 b.w.CO2Person.review();assert.match(b.doc.getElementById('personReview').textContent,/Não sei km/);
 a.dom.window.close();b.dom.window.close();
});
test('pessoa UI: salvamento confirmado, payload específico, zero real e nova entrevista',async()=>{
 let sent=false,posted;const a=setup(async p=>p.action==='meta'?{version:45,personVersion:2}:p.action==='validatePerson'?{ok:true}:sent&&p.requestId===posted.get('requestId')?{state:'ready',record:{id:'P-123',total:0,done:0,planned:0,breakdown:{Transporte:0},notes:[]}}:{state:'not_found'});
 a.w.HTMLFormElement.prototype.submit=function(){sent=true;posted=new a.w.FormData(this);assert.equal(a.doc.getElementById('successView').classList.contains('hidden'),true);};
 a.fill();a.submit();await tick();
 assert.equal(posted.get('action'),'submitPerson');assert.equal(posted.has('origin'),false);assert.equal(JSON.parse(posted.get('payload')).origin,'Campinas');assert.equal(a.doc.getElementById('resultTotal').textContent,'0 kgCO₂e');
 assert.match(a.doc.getElementById('resultBreakdown').textContent,/Ainda previsto/);
 assert.equal(a.w.localStorage.getItem('co2PersonPending'),null);
 assert.equal(a.w.localStorage.getItem('co2PersonDraft'),null);
 const reopened=setup(null,Object.fromEntries(Object.keys(a.w.localStorage).map(k=>[k,a.w.localStorage.getItem(k)])));
 assert.equal(reopened.doc.querySelector('.form-step.active h1').textContent,'Sobre a participação');
 assert.equal(reopened.doc.querySelector('[name=origin]').value,'');reopened.dom.window.close();
 a.doc.getElementById('newEntryBtn').click();assert.equal(a.w.localStorage.getItem('co2PersonPending'),null);assert.equal(a.doc.querySelector('[name=origin]').value,'');assert.equal(a.doc.querySelector('.form-step.active h1').textContent,'Sobre a participação');assert.equal(a.doc.getElementById('personReview').textContent,'');
 const firstId=posted.get('requestId');a.fill();a.submit();await tick();assert.notEqual(posted.get('requestId'),firstId);assert.equal(a.w.localStorage.getItem('co2PersonPending'),null);a.dom.window.close();
});
test('pessoa UI: não aceita API antiga nem perde rascunho em falha',async()=>{
 const a=setup(async()=>({version:45}));a.fill();a.submit();await tick();assert.match(a.doc.getElementById('formError').textContent,/suporte a entrevistas de pessoas/);assert.ok(a.w.localStorage.getItem('co2PersonDraft'));assert.equal(a.w.localStorage.getItem('co2PersonPending'),null);a.dom.window.close();
});
test('pessoa UI: perguntas redundantes e dropdowns removidos, ida/volta fixas',()=>{
 const a=setup();a.fill();
 for(const name of ['interviewed','role','trip0Phase','trip1Phase','daysDone','daysPlanned'])assert.equal(a.doc.querySelector(`[name="${name}"]`),null);
 assert.equal(a.doc.querySelectorAll('select').length,0);
 const d=a.w.CO2Person.payload();assert.equal(d.trips[0].phase,'done');assert.equal(d.trips[1].phase,'planned');assert.equal(d.trips[0].count,1);assert.equal(d.eventDays,2);
 a.dom.window.close();
});
test('pessoa UI: envio incerto recupera o mesmo ID sem permitir edição ou duplicação',async()=>{
 let statusCalls=0,submitted=0;
 const a=setup(async p=>{if(p.action==='meta')return {version:45,personVersion:2};if(p.action==='validatePerson')return {ok:true};statusCalls++;if(statusCalls===1)return {state:'not_found'};throw Error('Sem conexão');});
 a.w.HTMLFormElement.prototype.submit=()=>submitted++;
 a.fill();a.submit();await tick();const pending=a.w.localStorage.getItem('co2PersonPending');assert.ok(pending);assert.equal(a.doc.querySelector('[name=origin]').disabled,true);assert.equal(a.doc.getElementById('submitBtn').disabled,false);
 const id=JSON.parse(pending).requestId;let lookedUp;
 const b=setup(async p=>{if(p.action==='meta')return {version:45,personVersion:2};lookedUp=p.requestId;return {state:'ready',record:{id:'P-restored',total:1,done:1,planned:0,breakdown:{Transporte:1},notes:[]}};},{co2PersonPending:pending});
 b.w.HTMLFormElement.prototype.submit=()=>submitted++;await tick();assert.equal(lookedUp,id);assert.equal(submitted,1);assert.equal(b.w.localStorage.getItem('co2PersonPending'),null);assert.match(b.doc.getElementById('savedIdentity').textContent,/P-restored/);a.dom.window.close();b.dom.window.close();
});

test('pessoa UI: sugestões preenchem sem teclado, retiram Não sei e persistem o rascunho',()=>{
 const a=setup();a.fill();a.set('trip0Mode','Carro gasolina');
 a.doc.querySelector('[data-unknown=trip0Km]').click();
 const b=a.doc.querySelector('[data-fill=trip0Km][data-value="20"]');b.focus();b.click();
 assert.equal(a.doc.activeElement,b);assert.equal(a.doc.querySelector('[name=trip0Km]').value,'20');assert.equal(a.doc.querySelector('[data-unknown=trip0Km]').checked,false);assert.equal(b.getAttribute('aria-pressed'),'true');
 assert.equal(JSON.parse(a.w.localStorage.getItem('co2PersonDraft')).trip0Km,'20');
 a.doc.querySelector('[data-fill=origin][data-value="Mesma cidade do evento"]').click();assert.equal(a.doc.querySelector('[name=origin]').value,'Mesma cidade do evento');
 a.dom.window.close();
});
test('pessoa UI: dois dias repetem apenas após escolha explícita, noites não são multiplicadas',()=>{
 const a=setup();a.fill();a.set('trip0Mode','Carro gasolina');a.set('trip0Km','10');a.set('trip0Occupants','2');a.doc.getElementById('copyOutbound').click();
 a.set('participation','Hoje e amanhã');a.set('otherTravel','Repetir ida e volta de hoje');
 let d=a.w.CO2Person.payload();assert.equal(d.trips.length,4);assert.deepEqual(Array.from(d.trips,t=>t.phase),['done','planned','planned','planned']);assert.equal(d.daysPlanned,1);
 a.set('participation','Ontem e hoje');d=a.w.CO2Person.payload();assert.deepEqual(Array.from(d.trips,t=>t.phase),['done','planned','done','done']);assert.equal(d.daysDone,2);
 a.set('stayType','Hotel / pousada');a.set('stayDone','1');a.set('stayPlanned','0');assert.equal(a.w.CO2Person.payload().stay.done,1);
 a.set('otherTravel','Sem nova viagem');assert.equal(a.w.CO2Person.payload().trips.length,2);
 a.set('otherTravel','Não sei');assert.equal(a.w.CO2Person.payload().trips.at(-1).km,null);
 a.set('participation','Só hoje');assert.equal(a.w.CO2Person.payload().trips.length,2);assert.equal(a.w.CO2Person.payload().otherTravel,null);
 a.dom.window.close();
});
test('pessoa UI: outro percurso tem período do outro dia e campos ocultos não vazam',()=>{
 const a=setup();a.fill();a.set('participation','Hoje e amanhã');a.set('otherTravel','Informar outro percurso');
 a.set('trip2Mode','Ônibus');a.set('trip2Km','5');a.set('trip3Mode','A pé / bicicleta');
 let d=a.w.CO2Person.payload();assert.equal(d.trips.length,4);assert.equal(d.trips[2].phase,'planned');assert.equal(d.trips[3].phase,'planned');
 a.set('otherTravel','Sem nova viagem');assert.equal(a.doc.querySelector('[name=trip2Km]').disabled,true);assert.equal(a.w.CO2Person.payload().trips.length,2);a.dom.window.close();
});

test('pessoa UI: falha ao verificar pendência antiga não descarta respostas nem permite novo envio',async()=>{
 const pending=JSON.stringify({requestId:'12345678-1234-1234-1234-123456789012',data:{origin:'Preservado',_person:{version:2,extraCount:0}},payload:'{"surveyVersion":2}',unknown:[]});
 const a=setup(async()=>{throw Error('Sem conexão');},{co2PersonPending:pending});
 let submissions=0;a.w.HTMLFormElement.prototype.submit=()=>submissions++;
 await tick();assert.equal(a.w.localStorage.getItem('co2PersonPending'),pending);assert.equal(a.doc.querySelector('[name=origin]').value,'Preservado');assert.equal(a.doc.querySelector('[name=origin]').disabled,true);assert.equal(a.doc.getElementById('submitBtn').disabled,false);assert.equal(submissions,0);assert.match(a.doc.getElementById('draftStatus').textContent,/respostas estão preservadas/);a.dom.window.close();
});
