const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {JSDOM} = require('jsdom');
const html = fs.readFileSync('formulario.html','utf8').replace(/<script[^>]*><\/script>/g,'');
function setup(read = async () => ({version:45,hours:8})) {
 const dom = new JSDOM(html,{url:'http://localhost/',runScripts:'outside-only'}), w=dom.window;
 w.scrollTo=()=>{}; w.CSS={escape:x=>x};
 w.CO2Api={read,format:n=>String(n)}; w.CO2_STAND_CONFIG={apiUrl:'http://localhost/api'};
 w.eval(fs.readFileSync('form.js','utf8'));
 const set=(name,value)=>{ const el=w.document.querySelector(`[name="${name}"]`); el.value=value; el.dispatchEvent(new w.Event('input',{bubbles:true})); };
 const choice=(name,value)=>{const el=w.document.querySelector(`[name="${name}"][value="${value}"]`);el.checked=true;el.dispatchEvent(new w.Event('change',{bubbles:true}));};
 return {dom,w,set,choice,doc:w.document};
}
test('condicionais desativam respostas antigas no FormData e pulam resíduos inexistentes',()=>{
 const {dom,w,set,choice,doc}=setup();
 choice('refeicoes','Sim');set('refeicoesQtd','10');choice('tipoRefeicao','Frango');choice('refeicoes','Não');
 choice('residuoFaixa','Nenhum');
 const data=new w.FormData(doc.querySelector('form'));
 assert.equal(data.has('refeicoesQtd'),false);assert.equal(data.has('tipoRefeicao'),false);
 assert.equal(doc.querySelector('[name="tipoResiduo"]').required,false);
 assert.equal(doc.querySelector('#wasteDetails').classList.contains('hidden'),true);
 dom.window.close();
});
test('não sei desativa número e não exige um zero fictício',()=>{
 const {dom,w,doc}=setup();const box=doc.querySelector('[data-unknown="notebooks"]');box.checked=true;box.dispatchEvent(new w.Event('change',{bubbles:true}));
 assert.equal(doc.querySelector('[name="notebooks"]').required,false);assert.equal(new w.FormData(doc.querySelector('form')).has('notebooks'),false);dom.window.close();
});
test('envio exige confirmação e mostra resultado vinculado ao ID',async()=>{
 let submitted=false,requestId,postData;
 const record={empresa:'Teste',stand:'1',total:0,maiorFonte:'',breakdown:{Transporte:0,Energia:0},notes:[],partial:false};
 const {dom,w,set,choice,doc}=setup(async p => p.action==='meta'?{version:45,hours:8}:submitted?{state:'ready',record}:{state:'not_found'});
 w.HTMLFormElement.prototype.submit=function(){ submitted=true;postData=new w.FormData(this);requestId=postData.get('requestId');assert.equal(doc.querySelector('#successView').classList.contains('hidden'),true); };
 set('empresa','Teste');set('stand','1');set('pessoasStand','1');choice('transporte','A pé / bicicleta');set('pessoasTransporte','1');
 for(const name of ['notebooks','tvs','iluminacao'])set(name,'0');
 choice('equipAlto','Não');choice('logistica','Não');choice('materiais','Nenhum desses');choice('residuoFaixa','Nenhum');choice('refeicoes','Não');
 doc.querySelector('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(submitted,true);assert.match(requestId,/^[a-f0-9-]{36}$/);assert.equal(postData.get('empresa'),'Teste');
 assert.equal(doc.querySelector('#successView').classList.contains('hidden'),false);assert.equal(doc.querySelector('#resultTotal').textContent,'0 kgCO₂e');
 doc.querySelector('#newEntryBtn').click();assert.equal(w.localStorage.getItem('co2StandPending'),null);assert.equal(doc.querySelector('[name="empresa"]').value,'');
 dom.window.close();
});
test('API indisponível preserva rascunho e não mostra sucesso',async()=>{
 const {dom,w,set,choice,doc}=setup(async()=>{throw new Error('Sem conexão');});
 set('empresa','Teste');set('stand','1');set('pessoasStand','1');choice('transporte','A pé / bicicleta');set('pessoasTransporte','1');
 for(const name of ['notebooks','tvs','iluminacao'])set(name,'0');
 choice('equipAlto','Não');choice('logistica','Não');choice('materiais','Nenhum desses');choice('residuoFaixa','Nenhum');choice('refeicoes','Não');
 doc.querySelector('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(doc.querySelector('#successView').classList.contains('hidden'),true);assert.ok(w.localStorage.getItem('co2StandDraft'));assert.equal(doc.querySelector('#formError').textContent,'Sem conexão');dom.window.close();
});
