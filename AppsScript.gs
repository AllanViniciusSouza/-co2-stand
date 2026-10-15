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
    if(p.action === 'meta') result = {ok:true, version:45, hours:hours_(ss)};
    else if(p.action === 'submit') result = save_(ss, p, e.parameters || {});
    else if(p.action === 'status') result = status_(ss, p.requestId);
    else result = list_(ss);
    return output_(result, p.action === 'submit' ? '' : p.callback);
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
