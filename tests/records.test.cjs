const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const tick=()=>new Promise(r=>setImmediate(r));
function setup(read,url='http://localhost/registros.html'){
 const dom=new JSDOM(fs.readFileSync('registros.html','utf8').replace(/<script[^>]*><\/script>/g,''),{url,runScripts:'outside-only'});
 dom.window.CO2Api={read,format:String};dom.window.eval(fs.readFileSync('records.js','utf8'));return dom;
}
test('resultados: bases separadas, cobertura distinta, subtotal e paginação restaurável',async()=>{
 const stands=[{id:'s1',stand:'1',empresa:'<script>bad</script>',total:10,breakdown:{Transporte:10}},{id:'s2',stand:'1',total:20,partial:true}];
 const people=Array.from({length:14},(_,i)=>({id:'P-'+i,total:3,done:1,planned:2,type:'person',notes:[],breakdown:{Transporte:3},daysDone:1,daysPlanned:0}));
 const d=setup(async p=>p?.action==='meta'?{personVersion:1}:{records:p?.action==='people'?people:stands});await tick();
 const doc=d.window.document;assert.match(doc.getElementById('summaryCards').textContent,/1 \/ 33/);assert.equal(doc.querySelectorAll('.record-card').length,12);assert.equal(doc.querySelectorAll('#recordList script').length,0);
 doc.querySelector('[data-type=person]').click();assert.match(d.window.location.search,/tipo=person/);assert.equal(doc.querySelectorAll('.summary-group').length,1);doc.querySelector('#pagination a').click();assert.equal(doc.querySelectorAll('.record-card').length,2);
 assert.match(d.window.location.search,/pagina=2/);doc.querySelector('[data-type=stand]').click();assert.equal(doc.querySelectorAll('.record-card').length,2);assert.equal(new URLSearchParams(d.window.location.search).get('pagina')||'1','1');d.window.close();
});
test('resultados: backend sem pessoas não disfarça stands como visitantes',async()=>{
 const d=setup(async p=>p?.action==='meta'?{version:45}:{records:[{id:'s1',empresa:'Stand',stand:'2',total:5}]});await tick();const doc=d.window.document;
 assert.match(doc.getElementById('status').textContent,/incompleta/);assert.equal(doc.querySelectorAll('.record-card').length,1);assert.match(doc.querySelector('.form-error').textContent,/Não foi possível atualizar/);d.window.close();
});
