const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync('AppsScript.gs','utf8'),ctx);
const base = () => ({empresa:'Stand teste',stand:'12',pessoasStand:'4',transporte:'Carro gasolina',pessoasTransporte:'4',distanciaEquipe:'10',ocupacaoVeiculo:'2',notebooks:'1',tvs:'0',iluminacao:'0',equipAlto:'Não',logistica:'Não',materiais:'Nenhum desses',residuoFaixa:'Nenhum',refeicoes:'Não'});
test('campos ocultos são removidos no servidor, inclusive valores antigos e desconhecidos', () => {
 const input = {...base(),equipQtd:'99',equipHoras:'8',refeicoesQtd:'50',tipoRefeicao:'Carne bovina',copos:'99',residuoKg:'5',unknownFields:'["equipQtd"]'};
 const {p,unknown} = ctx.normalize_(input,{},8);
 for(const key of ['equipQtd','equipHoras','refeicoesQtd','tipoRefeicao','copos','residuoKg']) assert.equal(p[key],'');
 assert.equal(unknown.length,0);
});
test('preserva múltiplos materiais e quantidades', () => {
 const input = {...base(),folders:'10',copos:'20'};
 const {p} = ctx.normalize_(input,{materiais:['Folders ou impressos','Copos plásticos']},8);
 assert.equal(p.materiais,'Folders ou impressos, Copos plásticos'); assert.equal(p.folders,10); assert.equal(p.copos,20);
});
test('valida população, ocupação, números negativos, horas e campos obrigatórios', () => {
 for(const delta of [{pessoasTransporte:'5'},{ocupacaoVeiculo:'5'},{notebooks:'-1'},{pessoasStand:'1.5'},{tvs:''},{equipAlto:'Sim',equipNome:'Motor',equipQtd:'1',equipHoras:'9'}]) assert.throws(()=>ctx.normalize_({...base(),...delta},{},8));
});
test('desconhecido é excluído, nunca convertido em zero', () => {
 const {p,unknown} = ctx.normalize_({...base(),notebooks:'',unknownFields:'["notebooks"]'},{},8);
 assert.equal(p.notebooks,''); assert.equal(ctx.exclusions_(p,unknown)[0],'Energia');
});
test('logística sem fator e resíduo desconhecido deixam resultado parcial', () => {
 const {p,unknown} = ctx.normalize_({...base(),logistica:'Sim',veiculoLog:'Caminhão',distanciaLog:'10',viagensLog:'1',residuoFaixa:'Não sei',tipoResiduo:'Não sei',destinoResiduo:'Não sei'},{},8);
 assert.deepEqual(Array.from(ctx.exclusions_(p,unknown)),['Logística','Resíduos']);
});
function resultFor(p, cells, unknown=[]) {
 ctx.pForTest = p;
 const raw = vm.runInContext('["data", ...FIELDS.map(key => pForTest[key] ?? ""), "id", "[]", "Evento inteiro", "v45"]',ctx);
 raw[32]=JSON.stringify(unknown);
 return ctx.record_(null,2,raw,['data','ST-001',p.empresa,p.stand,...cells,0,'','']);
}
test('resultado vazio ou erro não vira zero e zero real permanece válido', () => {
 const {p} = ctx.normalize_(base(),{},8);
 assert.equal(resultFor(p,[1,'#ERROR!',0,0,0,0]).state,'calculating');
 const zero = resultFor(p,[0,0,0,0,0,0]);
 assert.equal(zero.state,'ready'); assert.equal(zero.record.total,0); assert.equal(zero.record.maiorFonte,'');
});
test('subtotal exclui categoria desconhecida e identifica maior fonte calculada', () => {
 const {p} = ctx.normalize_(base(),{},8);
 const result = resultFor(p,[10,0.5,0,1,0,0],['notebooks']);
 assert.equal(result.record.total,11); assert.equal(result.record.partial,true); assert.equal(result.record.breakdown.Energia,null); assert.equal(result.record.maiorFonte,'Transporte');
});
test('reenvio com o mesmo ID retorna antes de gravar ou recalcular', () => {
 let writes=0,released=false;
 ctx.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){released=true;}})};
 const range={getValues:()=>[['ID da entrevista web','Campos não informados','Período da entrevista','Cálculo web preparado']],createTextFinder:()=>({matchEntireCell:()=>({findNext:()=>({getRow:()=>2})})})};
 const sheet={getRange:(r,c)=>r===2&&c===1?{getValues:()=>[Object.assign(Array(35).fill(''),{34:'v45'})]}:range,getLastRow:()=>2,appendRow:()=>writes++};
 const response=ctx.save_({getSheetByName:()=>sheet},{requestId:'12345678-1234-1234-1234-123456789012'},{});
 assert.equal(response.ok,true); assert.equal(writes,0); assert.equal(released,true);
});

test('primeira entrevista parcial preserva fórmulas para a entrevista seguinte', () => {
 const rows = {2:Array(13).fill('=1')};
 const calc = {getMaxRows:()=>100, getRange(row,col,height,width) {
   return {
     row,col,
     copyTo(target) { rows[target.row]=rows[row].map(f=>f.replace(/([A-Z]+)2\b/g,'$1'+target.row)); },
     getFormula() { return rows[row][col-1]; },
     setFormula(value) { rows[row][col-1]=value; }
   };
 }};
 ctx.SpreadsheetApp={CopyPasteType:{PASTE_FORMULA:'formula'}};
 const ss={getSheetByName:()=>calc};
 ctx.ensureCalculation_(ss,2,{...base(),destinoResiduo:'Não sei'},['notebooks']);
 assert.ok(rows[2][5].includes('REGEXMATCH'));
 assert.ok(rows[2][8].includes('="Não sei"'));
 assert.ok(rows[2].every(value=>value.startsWith('=')));
 ctx.ensureCalculation_(ss,3,base(),[]);
 assert.ok(rows[3].every(value=>value.startsWith('=')));
 assert.ok(rows[3][8].includes("'Respostas ao formulário 1'!X3"));
 assert.equal(rows[3][8].split('REGEXMATCH').length,2);
});

test('modelo incompleto é identificado antes de marcar cálculo como preparado', () => {
 ctx.SpreadsheetApp={CopyPasteType:{PASTE_FORMULA:'formula'}};
 const calc={getMaxRows:()=>100,getRange:()=>({copyTo(){},getFormula:()=>'',setFormula(){}})};
 assert.throws(()=>ctx.ensureCalculation_({getSheetByName:()=>calc},3,base(),[]),/Fórmula ausente/);
});
