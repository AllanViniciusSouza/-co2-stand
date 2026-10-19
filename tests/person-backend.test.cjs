const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const ctx=vm.createContext({});vm.runInContext(fs.readFileSync('AppsScript.gs','utf8'),ctx);
const id='12345678-1234-1234-1234-123456789012';
const base=()=>({interviewed:'Não',role:'Visitante',origin:'Campinas',mainReason:'Sim',daysDone:1,daysPlanned:0,trips:[{phase:'done',mode:'Carro gasolina',km:10,count:1,occupants:2},{phase:'planned',mode:'Ônibus',km:20,count:1,occupants:40}],meals:Object.fromEntries(['Carne bovina','Frango','Vegetariana','Outro / não sei'].map(m=>[m,{done:0,planned:0}])),stay:{type:'Não',done:0,planned:0}});
const factors={TRA_CAR_GAS:{unit:'kgCO2e/km',value:0.2,source:'Teste',year:2026},TRA_ONIBUS:{unit:'kgCO2e/passageiro-km',value:0.1},ALI_BOV:{unit:'kgCO2e/refeição',value:10}};
const normalize=d=>ctx.normalizePerson_(JSON.stringify(d));
test('pessoa: cada trecho tem período; divide carro, não divide passageiro-km nem duplica retorno',()=>{
 const d=base();d.daysDone=3;d.daysPlanned=2;d.meals['Carne bovina'].planned=1;
 const r=ctx.calculatePerson_(normalize(d),factors,id);
 assert.equal(r.done,1);assert.equal(r.planned,12);assert.equal(r.total,13);assert.equal(r.partial,false);assert.equal(r.factors.TRA_CAR_GAS.source,'Teste');
});
test('pessoa: ausências e fatores incompatíveis não viram emissões fictícias',()=>{
 const d=base();d.trips[0].occupants=null;d.trips[1].mode='Avião';d.stay={type:'Hotel / pousada',done:1,planned:null};d.meals['Outro / não sei'].done=2;
 const r=ctx.calculatePerson_(normalize(d),factors,id);
 assert.equal(r.phases.done.breakdown.Transporte,null);assert.equal(r.phases.planned.breakdown.Transporte,null);assert.equal(r.breakdown.Hospedagem,null);assert.equal(r.partial,true);
 const mismatch=ctx.calculatePerson_(normalize(base()),{TRA_CAR_GAS:{value:100,unit:'kgCO2e/litro'}},id);
 assert.equal(mismatch.phases.done.breakdown.Transporte,null);
});
test('pessoa: rejeita duplicidade declarada, equipe, quantidades inválidas e payload incompleto',()=>{
 for(const change of [{interviewed:'Sim'},{role:'Integrante de stand'},{daysDone:null},{daysDone:1.5},{origin:''},{mainReason:''},{trips:[]},{meals:{}}])assert.throws(()=>normalize({...base(),...change}));
 for(const value of [-1,'',false,'12',100001]){const d=base();d.trips[0].km=value;assert.throws(()=>normalize(d));}
 const d=base();d.trips[1].phase='done';assert.throws(()=>normalize(d));
});
test('pessoa: caminhada e ausência de hospedagem são zeros reais, sem transportar campos ocultos',()=>{
 const d=base();d.trips.forEach(t=>{t.mode='A pé / bicicleta';t.km=null;t.occupants=null;});d.stay.done=99;
 const n=normalize(d),r=ctx.calculatePerson_(n,{},id);assert.equal(n.stay.done,0);assert.equal(r.total,0);assert.equal(r.partial,false);
});
function sheetStore(){
 const rows=[];let writes=0;
 const sh={getLastRow:()=>rows.length,setFrozenRows(){},appendRow(row){rows.push(row);writes++;},getRange(r,c,n=1,w=1){return {getValues:()=>Array.from({length:n},(_,i)=>Array.from({length:w},(_,j)=>rows[r+i-1]?.[c+j-1]??'')),getValue:()=>rows[r-1]?.[c-1],setValues:values=>{values.forEach((v,i)=>{rows[r+i-1]??=[];v.forEach((x,j)=>rows[r+i-1][c+j-1]=x);});},createTextFinder:id=>({matchEntireCell:()=>({findNext:()=>{const i=rows.findIndex((row,i)=>i>0&&row[0]===id);return i<0?null:{getRow:()=>i+1};}})})};}};
 let created=false;
 const ss={getSheetByName:name=>name==='Pessoas'?(created?sh:null):{getLastRow:()=>3,getRange:()=>({getValues:()=>[['TRA_CAR_GAS','','','kgCO2e/km',0.2,2026,'Teste','Fonte'],['TRA_ONIBUS','','','kgCO2e/passageiro-km',0.1,2026,'Teste','Fonte']]})},insertSheet:name=>{assert.equal(name,'Pessoas');created=true;return sh;}};
 return {ss,rows,writes:()=>writes};
}
test('pessoa: salva snapshot atômico, preserva histórico em reenvio e consulta por ID',()=>{
 ctx.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};ctx.SpreadsheetApp={flush(){}};
 const store=sheetStore(),payload=JSON.stringify({...base(),origin:'=IMPORTXML()'});
 assert.equal(ctx.personStatus_(store.ss,id).state,'not_found');
 ctx.savePerson_(store.ss,{requestId:id,payload});ctx.savePerson_(store.ss,{requestId:id,payload:'invalid'});
 assert.equal(store.writes(),1);assert.equal(store.rows[1][3],"'=IMPORTXML()");
 assert.equal(ctx.personStatus_(store.ss,id).record.total,3);assert.equal(ctx.listPeople_(store.ss).records.length,1);
 assert.equal(JSON.parse(store.rows[1][10]).origin,'=IMPORTXML()');
 store.rows[0][0]='Conteúdo alheio';assert.throws(()=>ctx.savePerson_(store.ss,{requestId:id,payload}));
});
module.exports={base};

test('pessoa v2: coleta em um dia preserva participação nos dois, sem multiplicar hospedagem',()=>{
 const d={...base(),surveyVersion:2,eventDays:2,participation:'todayTomorrow',otherTravel:'Repetir ida e volta de hoje',daysDone:1,daysPlanned:1};delete d.interviewed;delete d.role;
 d.trips.push({...d.trips[0],phase:'planned'},{...d.trips[1],phase:'planned'});
 d.stay={type:'Hotel / pousada',done:0,planned:1};
 const n=normalize(d),r=ctx.calculatePerson_(n,factors,id);
 assert.equal(n.stay.planned,1);assert.equal(r.done,1);assert.equal(r.planned,5);assert.equal(r.total,6);assert.equal(r.methodVersion,'person-v2');assert.equal(r.partial,true);
 assert.equal(n.role,'Visitante');assert.equal('interviewed' in n,false);
 for(const change of [{daysPlanned:2},{daysDone:2},{eventDays:3},{participation:'invalid'},{otherTravel:''}])assert.throws(()=>normalize({...d,...change}));
 const swapped={...d,trips:d.trips.map(t=>({...t}))};swapped.trips[0].phase='planned';assert.throws(()=>normalize(swapped));
});
test('pessoa v2: outro dia incerto mantém subtotal e aviso, sem inventar viagens',()=>{
 const d={...base(),surveyVersion:2,eventDays:2,participation:'unknown',otherTravel:null};
 const r=ctx.calculatePerson_(normalize(d),factors,id);assert.equal(r.total,3);assert.equal(r.partial,true);assert.ok(r.notes.some(n=>n.includes('ainda incerta')));
});
