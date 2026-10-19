const SPREADSHEET_ID = '1aXxN1QCp5AxQ86_C9yOBwuGDyoV8P1E7FDIYeRlUCgo';
const FIELDS = ['empresa','stand','pessoasStand','transporte','pessoasTransporte','distanciaEquipe','ocupacaoVeiculo','notebooks','tvs','iluminacao','equipAlto','equipNome','equipQtd','equipHoras','logistica','veiculoLog','distanciaLog','viagensLog','materiais','folders','copos','pet','residuoFaixa','residuoKg','tipoResiduo','destinoResiduo','refeicoes','refeicoesQtd','tipoRefeicao','acaoAmbiental'];
const CATEGORIES = ['Transporte','Energia','Logística','Materiais','Resíduos','Alimentação'];
const NUMERIC = ['pessoasStand','pessoasTransporte','distanciaEquipe','ocupacaoVeiculo','notebooks','tvs','iluminacao','equipQtd','equipHoras','distanciaLog','viagensLog','folders','copos','pet','residuoKg','refeicoesQtd'];
const GROUPS = {Transporte:['pessoasTransporte','distanciaEquipe','ocupacaoVeiculo'], Energia:['notebooks','tvs','iluminacao','equipQtd','equipHoras'], 'Logística':['distanciaLog','viagensLog'], Materiais:['folders','copos','pet'], 'Resíduos':['residuoKg'], 'Alimentação':['refeicoesQtd']};

function doGet(e) {
  const p = e && e.parameter || {};
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let result;
    if(p.action === 'meta') result = {ok:true, version:45, personVersion:2, hours:hours_(ss)};
    else if(p.action === 'submitPerson') result = savePerson_(ss, p);
    else if(p.action === 'personStatus') result = personStatus_(ss, p.requestId);
    else if(p.action === 'people') result = listPeople_(ss);
    else if(p.action === 'validatePerson') { normalizePerson_(p.payload); result = {ok:true}; }
    else if(p.action === 'submit') result = save_(ss, p, e.parameters || {});
    else if(p.action === 'status') result = status_(ss, p.requestId);
    else result = list_(ss);
    return output_(result, ['submit','submitPerson'].includes(p.action) ? '' : p.callback);
  } catch(err) { return output_({ok:false, error:String(err.message || err)}, p.action === 'submit' ? '' : p.callback); }
}
function hours_(ss) {
  const rows = ss.getSheetByName('Fatores').getRange('J1:K20').getValues();
  const entry = rows.find(row => row[0] === 'HORAS_EVENTO');
  if(!entry || typeof entry[1] !== 'number' || entry[1] <= 0) throw new Error('Duração do evento inválida na aba Fatores.');
  return entry[1];
}
function requestId_(value) {
  if(!/^[a-f0-9-]{36}$/i.test(value || '')) throw new Error('Identificador da entrevista inválido. Atualize a página.');
  return value;
}
function findRow_(sh, id) {
  if(sh.getLastRow() < 2) return null;
  const match = sh.getRange(2,32,sh.getLastRow()-1,1).createTextFinder(id).matchEntireCell(true).findNext();
  return match ? match.getRow() : null;
}
function normalize_(input, multi, hours) {
  const p = {};
  FIELDS.forEach(key => p[key] = String(input[key] || '').trim());
  if(!p.empresa || !p.stand) throw new Error('Informe empresa e stand.');
  if(FIELDS.some(key => p[key].length > 1000)) throw new Error('Uma resposta ultrapassa 1.000 caracteres.');
  let unknown = JSON.parse(input.unknownFields || '[]');
  if(!Array.isArray(unknown) || unknown.some(key => !NUMERIC.includes(key))) throw new Error('Campos desconhecidos inválidos.');
  const clear = keys => keys.forEach(key => { p[key] = ''; unknown = unknown.filter(item => item !== key); });
  const vehicle = ['Carro gasolina','Carro diesel','Moto','Aplicativo / táxi'].includes(p.transporte);
  if(!['Carro gasolina','Carro diesel','Moto','Aplicativo / táxi','Ônibus','Trem','Metrô','A pé / bicicleta'].includes(p.transporte)) throw new Error('Selecione um transporte válido.');
  ['equipAlto','logistica','refeicoes'].forEach(key => { if(!['Sim','Não'].includes(p[key])) throw new Error('Responda todas as perguntas obrigatórias.'); });
  if(p.transporte === 'A pé / bicicleta') clear(['distanciaEquipe','ocupacaoVeiculo']);
  else if(!vehicle) clear(['ocupacaoVeiculo']);
  if(p.equipAlto !== 'Sim') clear(['equipNome','equipQtd','equipHoras']);
  if(p.logistica !== 'Sim') clear(['veiculoLog','distanciaLog','viagensLog']);
  const materials = multi.materiais || [].concat(input.materiais || []);
  if(!materials.length || materials.some(value => !['Folders ou impressos','Copos plásticos','Garrafas PET','Nenhum desses'].includes(value))) throw new Error('Selecione os materiais.');
  if(materials.includes('Nenhum desses') && materials.length > 1) throw new Error('Revise os materiais selecionados.');
  p.materiais = materials.join(', ');
  [['Folders ou impressos','folders'],['Copos plásticos','copos'],['Garrafas PET','pet']].forEach(([label,key]) => { if(!materials.includes(label)) clear([key]); });
  if(p.residuoFaixa !== 'Sei o valor em kg') clear(['residuoKg']);
  if(p.residuoFaixa === 'Nenhum') clear(['tipoResiduo','destinoResiduo']);
  if(p.refeicoes !== 'Sim') clear(['refeicoesQtd','tipoRefeicao']);
  unknown.forEach(key => p[key] = '');
  const required = ['pessoasStand','pessoasTransporte','notebooks','tvs','iluminacao'];
  if(p.transporte !== 'A pé / bicicleta') required.push('distanciaEquipe');
  if(vehicle) required.push('ocupacaoVeiculo');
  if(p.equipAlto === 'Sim') { required.push('equipQtd','equipHoras'); if(!p.equipNome) throw new Error('Descreva os equipamentos adicionais.'); }
  if(p.logistica === 'Sim') required.push('distanciaLog','viagensLog');
  [['Folders ou impressos','folders'],['Copos plásticos','copos'],['Garrafas PET','pet']].forEach(([label,key]) => { if(materials.includes(label)) required.push(key); });
  if(p.residuoFaixa === 'Sei o valor em kg') required.push('residuoKg');
  if(p.refeicoes === 'Sim') required.push('refeicoesQtd');
  const minOne = ['pessoasStand','pessoasTransporte','ocupacaoVeiculo','equipQtd','viagensLog','refeicoesQtd'];
  const decimals = ['distanciaEquipe','ocupacaoVeiculo','equipHoras','distanciaLog','residuoKg'];
  NUMERIC.forEach(key => {
    if(unknown.includes(key)) return;
    if(p[key] === '') { if(required.includes(key)) throw new Error('Informe ' + key + ' ou marque Não sei.'); return; }
    const n = Number(p[key].replace(',','.'));
    if(!Number.isFinite(n) || n < (minOne.includes(key) ? 1 : 0) || (!decimals.includes(key) && !Number.isInteger(n))) throw new Error('Valor inválido: ' + key);
    p[key] = n;
  });
  const choices = {
    residuoFaixa:['Nenhum','Menos de 1 kg','Entre 1 e 5 kg','Entre 5 e 10 kg','Mais de 10 kg','Sei o valor em kg','Não sei'],
    veiculoLog:p.logistica === 'Sim' ? ['Carro','Van','Caminhonete','Caminhão','Outro'] : [''],
    tipoResiduo:p.residuoFaixa !== 'Nenhum' ? ['Misturado','Reciclável','Orgânico','Não sei'] : [''],
    destinoResiduo:p.residuoFaixa !== 'Nenhum' ? ['Reciclagem','Aterro / lixo comum','Compostagem','Não sei'] : [''],
    tipoRefeicao:p.refeicoes === 'Sim' ? ['Carne bovina','Frango','Vegetariana','Variada / não sei'] : ['']
  };
  Object.keys(choices).forEach(key => { if(!choices[key].includes(p[key])) throw new Error('Opção inválida: ' + key); });
  if(typeof p.pessoasTransporte === 'number' && typeof p.pessoasStand === 'number' && p.pessoasTransporte > p.pessoasStand) throw new Error('Grupo de transporte maior que a equipe.');
  if(typeof p.ocupacaoVeiculo === 'number' && typeof p.pessoasTransporte === 'number' && p.ocupacaoVeiculo > p.pessoasTransporte) throw new Error('Ocupação maior que o grupo.');
  if(p.equipHoras > hours) throw new Error('Horas de equipamento maiores que a duração do evento.');
  return {p,unknown};
}
function exclusions_(p, unknown) {
  const excluded = CATEGORIES.filter(category => GROUPS[category].some(key => unknown.includes(key)));
  if(p.logistica === 'Sim' && ['Caminhão','Outro'].includes(p.veiculoLog)) excluded.push('Logística');
  if(p.residuoFaixa === 'Não sei' || (p.residuoFaixa !== 'Nenhum' && (p.destinoResiduo === 'Não sei' || (p.destinoResiduo === 'Aterro / lixo comum' && p.tipoResiduo === 'Não sei')))) excluded.push('Resíduos');
  return [...new Set(excluded)];
}
function save_(ss, input, multi) {
  const id = requestId_(input.requestId);
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const sh = ss.getSheetByName('Respostas ao formulário 1');
    const headers = ['ID da entrevista web','Campos não informados','Período da entrevista','Cálculo web preparado'];
    const existingHeaders = sh.getRange(1,32,1,4).getValues()[0];
    existingHeaders.forEach((value,i) => { if(value && value !== headers[i]) throw new Error('As colunas AF:AI estão ocupadas por outro conteúdo.'); });
    const existingRow = findRow_(sh,id);
    if(existingRow) {
      const stored = sh.getRange(existingRow,1,1,35).getValues()[0];
      if(stored[34] !== 'v45') {
        const data = {}; FIELDS.forEach((key,i) => data[key] = stored[i+1]);
        ensureCalculation_(ss,existingRow,data,JSON.parse(stored[32] || '[]'));
        SpreadsheetApp.flush(); sh.getRange(existingRow,35).setValue('v45');
      }
      return {ok:true, requestId:id}; // Reenvio idempotente, com recuperação do cálculo.
    }
    const normalized = normalize_(input,multi,hours_(ss));
    const p = normalized.p, unknown = normalized.unknown;
    sh.getRange(1,32,1,4).setValues([headers]);
    const timestamp = Utilities.formatDate(new Date(),'America/Sao_Paulo','dd/MM/yyyy HH:mm:ss');
    // Texto nunca é interpretado como fórmula da planilha.
    const safe = value => typeof value === 'string' && /^[=+@-]/.test(value) ? "'" + value : value;
    const row = [timestamp].concat(FIELDS.map(key => safe(p[key])),[id,JSON.stringify(unknown),'Evento inteiro']);
    sh.appendRow(row);
    const index = findRow_(sh,id);
    ensureCalculation_(ss,index,p,unknown);
    SpreadsheetApp.flush();
    sh.getRange(index,35).setValue('v45');
    return {ok:true, requestId:id};
  } finally { lock.releaseLock(); }
}
function ensureCalculation_(ss,index,p,unknown) {
  const calc = ss.getSheetByName('Cálculos');
  if(!calc) throw new Error('Aba Cálculos não encontrada.');
  if(index > calc.getMaxRows()) calc.insertRowsAfter(calc.getMaxRows(),index-calc.getMaxRows());
  // A linha 2 é o modelo existente; o Sheets ajusta suas referências relativas.
  calc.getRange(2,1,1,13).copyTo(calc.getRange(index,1,1,13),SpreadsheetApp.CopyPasteType.PASTE_FORMULA,false);
  exclusions_(p,unknown).forEach(category => calc.getRange(index,5+CATEGORIES.indexOf(category)).clearContent());
}
function record_(ss,index,raw,values) {
  const p = {}; FIELDS.forEach((key,i) => p[key] = raw[i+1]);
  if(raw[31] && raw[34] !== 'v45') return {state:'preparing',record:{empresa:p.empresa,stand:p.stand,total:null,partial:true,notes:['Registro salvo; preparação do cálculo pendente.']}};
  let unknown = []; try { unknown = JSON.parse(raw[32] || '[]'); } catch(e) { unknown = []; }
  const excluded = exclusions_(p,unknown), notes = [], breakdown = {};
  CATEGORIES.forEach((category,i) => {
    const value = values[i+4];
    breakdown[category] = !excluded.includes(category) && typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
    if(excluded.includes(category)) notes.push(category + ': parcela não calculada por falta de informação ou fator de emissão.');
  });
  const calculating = CATEGORIES.some(category => !excluded.includes(category) && breakdown[category] === null);
  const omittedPeople = Number(p.pessoasTransporte) < Number(p.pessoasStand) || unknown.includes('pessoasStand');
  if(omittedPeople) notes.push('Transporte considera apenas o grupo informado; os demais deslocamentos não estão incluídos.');
  if(p.transporte === 'A pé / bicicleta') notes.push('A pé/bicicleta: emissão direta de transporte considerada zero para o grupo informado.');
  if(p.equipAlto === 'Sim') notes.push('Equipamentos adicionais usam potência padrão e média de horas de uso.');
  if(p.refeicoes === 'Sim' && p.tipoRefeicao === 'Variada / não sei') notes.push('Alimentação usa o fator médio assumido da planilha.');
  if(p.logistica === 'Sim') notes.push('Logística considera apenas viagens adicionais, com ida e volta equivalentes.');
  const known = Object.entries(breakdown).filter(entry => entry[1] !== null);
  const total = calculating || !known.length ? null : known.reduce((sum,entry) => sum+entry[1],0);
  const largest = known.reduce((best,entry) => entry[1] > best[1] ? entry : best,['',0]);
  return {state:calculating ? 'calculating' : 'ready', record:{id:values[1] || 'ST-' + String(index-1).padStart(3,'0'),empresa:p.empresa,stand:p.stand,total,maiorFonte:largest[0],breakdown,partial:excluded.length > 0 || omittedPeople,notes}};
}
function status_(ss, id) {
  requestId_(id);
  const sh = ss.getSheetByName('Respostas ao formulário 1'), index = findRow_(sh,id);
  if(!index) return {ok:true,state:'not_found'};
  const raw = sh.getRange(index,1,1,35).getValues()[0];
  const calc = ss.getSheetByName('Cálculos');
  const values = calc && index <= calc.getMaxRows() ? calc.getRange(index,1,1,13).getValues()[0] : [];
  const result = record_(ss,index,raw,values);
  return Object.assign({ok:true,requestId:id},result);
}
function list_(ss) {
  const sh = ss.getSheetByName('Respostas ao formulário 1'), calc = ss.getSheetByName('Cálculos');
  const count = sh.getLastRow()-1;
  if(count < 1) return {ok:true,records:[]};
  const rows = sh.getRange(2,1,count,35).getValues();
  const values = calc.getRange(2,1,Math.min(count,calc.getMaxRows()-1),13).getValues();
  return {ok:true,records:rows.map((raw,i) => raw[1] ? record_(ss,i+2,raw,values[i] || []).record : null).filter(Boolean)};
}
function output_(data, callback) {
  const json = JSON.stringify(data);
  if(callback && /^co2_[a-f0-9]{32}$/.test(callback)) return ContentService.createTextOutput(callback+'('+json+');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

// Pessoas têm esquema próprio: nunca alteram as respostas/fórmulas dos stands.
const PERSON_HEADERS = ['ID da entrevista','Data UTC','Versão do esquema','Origem','Dias realizados','Dias previstos','Realizado kgCO2e','Previsto kgCO2e','Total kgCO2e','Parcial','Respostas JSON','Resultado e fatores JSON'];
const PERSON_TRANSPORT = {'Carro gasolina':'TRA_CAR_GAS','Carro diesel':'TRA_CAR_DIE','Moto':'TRA_MOTO','Aplicativo / táxi':'TRA_TAXI','Ônibus':'TRA_ONIBUS','Trem':'TRA_TREM','Metrô':'TRA_METRO','A pé / bicicleta':'walk','Carro etanol':'unsupported','Carro elétrico':'unsupported','Carro flex / não sei':'unsupported','Van':'unsupported','Avião':'unsupported','Não sei':'unsupported'};
const PERSON_MEALS = {'Carne bovina':'ALI_BOV','Frango':'ALI_FRANGO','Vegetariana':'ALI_VEG','Outro / não sei':null};
function personNumber_(value, min, integer) {
  if(value === null) return null;
  if(typeof value !== 'number' || !Number.isFinite(value) || value < min || value > 100000 || (integer && !Number.isInteger(value))) throw new Error('Revise as quantidades da entrevista de pessoa.');
  return value;
}
function normalizePerson_(payload) {
  if(typeof payload !== 'string' || payload.length > 12000) throw new Error('Entrevista de pessoa inválida.');
  const d = JSON.parse(payload);
  const current = d.surveyVersion === 2;
  if(!current && d.interviewed !== 'Não') throw new Error('Entreviste apenas visitantes que ainda não responderam neste evento.');
  if(!current && d.role !== 'Visitante') throw new Error('Para equipes expositoras, utilize a entrevista de stand.');
  if(!['Sim','Não','Não sei'].includes(d.mainReason)) throw new Error('Informe o motivo da viagem.');
  if(typeof d.origin !== 'string' || !d.origin.trim() || d.origin.length > 120) throw new Error('Informe cidade/bairro de origem, sem endereço completo.');
  const result = {role:'Visitante',origin:d.origin.trim(),mainReason:d.mainReason,daysDone:personNumber_(d.daysDone,1,true),daysPlanned:personNumber_(d.daysPlanned,0,true)};
  if(result.daysDone === null || result.daysPlanned === null) throw new Error('Informe os dias de participação.');
  if(current) {
    const days = {today:[1,0],todayTomorrow:[1,1],yesterdayToday:[2,0],unknown:[1,0]};
    const expected = days[d.participation];
    if(d.eventDays !== 2 || !expected || result.daysDone !== expected[0] || result.daysPlanned !== expected[1]) throw new Error('Revise a participação nos dois dias do evento.');
    const both = ['todayTomorrow','yesterdayToday'].includes(d.participation);
    if(both && !['Repetir ida e volta de hoje','Informar outro percurso','Sem nova viagem','Não sei'].includes(d.otherTravel)) throw new Error('Informe os deslocamentos do outro dia.');
    result.surveyVersion=2; result.eventDays=2; result.participation=d.participation; result.otherTravel=both?d.otherTravel:null;
  }

  if(!Array.isArray(d.trips) || !d.trips.length || d.trips.length > (current ? 10 : 8) || !d.trips.some(t=>t.phase==='done') || !d.trips.some(t=>t.phase==='planned')) throw new Error('Inclua a ida realizada e a volta prevista, mesmo que ainda não saiba o transporte.');
  if(current && (d.trips[0].phase !== 'done' || d.trips[1].phase !== 'planned' || d.trips[0].count !== 1 || d.trips[1].count !== 1)) throw new Error('A ida de hoje é realizada e a volta é prevista, uma vez cada.');
  result.trips = d.trips.map(t => {
    if(!['done','planned'].includes(t.phase) || !Object.prototype.hasOwnProperty.call(PERSON_TRANSPORT,t.mode)) throw new Error('Selecione período e transporte de cada trecho.');
    const vehicle = ['Carro gasolina','Carro diesel','Moto','Aplicativo / táxi','Carro etanol','Carro elétrico','Carro flex / não sei','Van'].includes(t.mode);
    return {phase:t.phase,mode:t.mode,km:t.mode === 'A pé / bicicleta' ? 0 : personNumber_(t.km,0,false),count:personNumber_(t.count,1,true),occupants:vehicle ? personNumber_(t.occupants,1,true) : 1};
  });
  result.meals = {};
  Object.keys(PERSON_MEALS).forEach(type => {
    if(!d.meals || !d.meals[type]) throw new Error('Informe as refeições ou marque Não sei.');
    result.meals[type] = {done:personNumber_(d.meals[type].done,0,true),planned:personNumber_(d.meals[type].planned,0,true)};
  });
  if(!d.stay || !['Não','Hotel / pousada','Casa de conhecidos','Outro / não sei'].includes(d.stay.type)) throw new Error('Informe a hospedagem.');
  result.stay = {type:d.stay.type,done:d.stay.type==='Não'?0:personNumber_(d.stay.done,0,true),planned:d.stay.type==='Não'?0:personNumber_(d.stay.planned,0,true)};
  return result;
}
function personFactors_(ss) {
  const sh = ss.getSheetByName('Fatores');
  const rows = sh.getRange(2,1,Math.max(1,sh.getLastRow()-1),8).getValues(), factors = {};
  rows.forEach(r => { if(r[0]) factors[r[0]] = {code:r[0],unit:r[3],value:r[4],year:r[5],status:r[6],source:r[7]}; });
  return factors;
}
function calculatePerson_(d, factors, id) {
  const notes = ['Estimativa da participação: não extrapolada para todo o público.','Fatores de transporte provisórios e refeições por aproximação, conforme a aba Fatores.','Refeições e deslocamentos podem coincidir com dados dos stands; os totais das duas bases não devem ser somados automaticamente.'];
  const used = {}, phases = {}, missing = [];
  if(d.surveyVersion === 2) notes.push('Evento de dois dias; entrevista coletada em um único dia. Somente os deslocamentos e as noites declarados entram na estimativa, sem multiplicação automática.');
  if(d.participation === 'unknown') notes.push('Participação no outro dia ainda incerta: deslocamentos não informados desse dia ficam fora da estimativa.');
  if(d.mainReason !== 'Sim') notes.push('Viagem com outras finalidades ou motivo desconhecido: inclui integralmente os trechos declarados, sem atribuição exclusiva ao evento.');
  function emission(code, qty, unit, divisor) {
    if(qty === 0) return 0;
    const f = factors[code];
    if(qty === null || divisor === null || !f || f.unit !== unit || typeof f.value !== 'number' || !Number.isFinite(f.value) || f.value < 0) return null;
    used[code] = f; return qty * f.value / divisor;
  }
  function sum(values) { const known=values.filter(v=>v!==null); return known.length ? known.reduce((a,b)=>a+b,0) : null; }
  ['done','planned'].forEach(phase => {
    const trips = d.trips.filter(t=>t.phase===phase).map(t => {
      if(t.mode === 'A pé / bicicleta') return 0;
      const code = PERSON_TRANSPORT[t.mode], passenger = ['TRA_ONIBUS','TRA_TREM','TRA_METRO'].includes(code);
      return emission(code,t.km===null||t.count===null?null:t.km*t.count,passenger?'kgCO2e/passageiro-km':'kgCO2e/km',passenger?1:t.occupants);
    });
    const meals = Object.keys(PERSON_MEALS).map(type=>emission(PERSON_MEALS[type],d.meals[type][phase],'kgCO2e/refeição',1));
    // Não há fator de hospedagem na metodologia existente. Não inventar um.
    const stay = d.stay[phase] === 0 ? 0 : null;
    const values = {Transporte:sum(trips),Alimentação:sum(meals),Hospedagem:stay};
    const incomplete = {Transporte:trips.includes(null),Alimentação:meals.includes(null),Hospedagem:stay===null};
    Object.keys(incomplete).forEach(k=> {if(incomplete[k]) missing.push(k+' · '+(phase==='done'?'realizado':'previsto'));});
    phases[phase] = {breakdown:values,total:sum(Object.values(values)),partial:Object.values(incomplete).some(Boolean)};
  });
  if(missing.length) notes.push('Parcelas não calculadas por informação ou fator ausente: '+missing.join('; ')+'.');
  if(d.stay.type !== 'Não') notes.push('Hospedagem registrada, sem fator disponível; noites informadas não entram no subtotal.');
  if(d.trips.some(t=>t.mode==='A pé / bicicleta')) notes.push('A pé/bicicleta: considera somente emissão direta, igual a zero.');
  const breakdown = {};
  ['Transporte','Alimentação','Hospedagem'].forEach(k=>breakdown[k]=sum([phases.done.breakdown[k],phases.planned.breakdown[k]]));
  const largest=Object.entries(breakdown).reduce((best,e)=>e[1]>best[1]?e:best,['',0]);
  return {type:'person',id:'P-'+id.slice(0,8),requestId:id,total:sum([phases.done.total,phases.planned.total]),done:phases.done.total,planned:phases.planned.total,phases,breakdown,partial:missing.length>0||d.participation==='unknown',notes,maiorFonte:largest[0],factors:used,methodVersion:d.surveyVersion===2?'person-v2':'person-v1',participation:d.participation||null,daysDone:d.daysDone,daysPlanned:d.daysPlanned};
}
function personSheet_(ss, create) {
  let sh=ss.getSheetByName('Pessoas');
  if(!sh && create) sh=ss.insertSheet('Pessoas');
  if(!sh) return null;
  if(sh.getLastRow()===0 && create) { sh.getRange(1,1,1,PERSON_HEADERS.length).setValues([PERSON_HEADERS]); sh.setFrozenRows(1); }
  const headers=sh.getRange(1,1,1,PERSON_HEADERS.length).getValues()[0];
  if(headers.some((v,i)=>v!==PERSON_HEADERS[i])) throw new Error('A aba Pessoas possui um esquema diferente. Preserve os dados e revise os cabeçalhos.');
  return sh;
}
function personRow_(sh,id) {
  if(!sh || sh.getLastRow()<2) return null;
  const match=sh.getRange(2,1,sh.getLastRow()-1,1).createTextFinder(id).matchEntireCell(true).findNext();
  return match ? match.getRow() : null;
}
function savePerson_(ss,input) {
  const id=requestId_(input.requestId), lock=LockService.getScriptLock(); lock.waitLock(20000);
  try {
    let sh=personSheet_(ss,false);
    if(personRow_(sh,id)) return {ok:true,requestId:id};
    const data=normalizePerson_(input.payload), result=calculatePerson_(data,personFactors_(ss),id);
    sh=personSheet_(ss,true);
    const origin=/^[=+@-]/.test(data.origin)?"'"+data.origin:data.origin;
    // Uma gravação contém respostas e snapshot calculado; reenvio não troca fatores históricos.
    sh.appendRow([id,new Date().toISOString(),data.surveyVersion||1,origin,data.daysDone,data.daysPlanned,result.done===null?'':result.done,result.planned===null?'':result.planned,result.total===null?'':result.total,result.partial,JSON.stringify(data),JSON.stringify(result)]);
    SpreadsheetApp.flush(); return {ok:true,requestId:id};
  } finally {lock.releaseLock();}
}
function personStatus_(ss,id) {
  requestId_(id); const sh=personSheet_(ss,false), row=personRow_(sh,id);
  return row ? {ok:true,state:'ready',requestId:id,record:JSON.parse(sh.getRange(row,12).getValue())} : {ok:true,state:'not_found'};
}
function listPeople_(ss) {
  const sh=personSheet_(ss,false);
  if(!sh || sh.getLastRow()<2) return {ok:true,records:[]};
  return {ok:true,records:sh.getRange(2,12,sh.getLastRow()-1,1).getValues().map(r=>JSON.parse(r[0]))};
}
