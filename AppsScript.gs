const SPREADSHEET_ID = '1aXxN1QCp5AxQ86_C9yOBwuGDyoV8P1E7FDIYeRlUCgo';

function doGet(e) {
  try {
    const action = e && e.parameter ? (e.parameter.action || '') : '';

    if (action === 'submit') {
      return salvarRegistro_(e.parameter);
    }

    return listarRegistros_();

  } catch (err) {
    return json_({
      ok: false,
      records: [],
      error: String(err)
    });
  }
}

function salvarRegistro_(p) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName('Respostas ao formulário 1');

  if (!sh) {
    return json_({
      ok: false,
      error: 'Aba "Respostas ao formulário 1" não encontrada'
    });
  }

  const timestamp = Utilities.formatDate(
    new Date(),
    'America/Sao_Paulo',
    'dd/MM/yyyy HH:mm:ss'
  );

  const row = [
    timestamp,                  // A
    p.empresa || '',            // B
    p.stand || '',              // C
    p.pessoasStand || '',       // D
    p.transporte || '',         // E
    p.pessoasTransporte || '',  // F
    p.distanciaEquipe || '',    // G
    p.ocupacaoVeiculo || '',    // H
    p.notebooks || '',          // I
    p.tvs || '',                // J
    p.iluminacao || '',         // K
    p.equipAlto || '',          // L
    p.equipNome || '',          // M
    p.equipQtd || '',           // N
    p.equipHoras || '',         // O
    p.logistica || '',          // P
    p.veiculoLog || '',         // Q
    p.distanciaLog || '',       // R
    p.viagensLog || '',         // S
    p.materiais || '',          // T
    p.folders || '',            // U
    p.copos || '',              // V
    p.pet || '',                // W
    p.residuoFaixa || '',       // X
    p.residuoKg || '',          // Y
    p.tipoResiduo || '',        // Z
    p.destinoResiduo || '',     // AA
    p.refeicoes || '',          // AB
    p.refeicoesQtd || '',       // AC
    p.tipoRefeicao || '',       // AD
    p.acaoAmbiental || ''       // AE
  ];

  // Segurança: não cria registro se Empresa/Projeto vier vazio.
  if (!row[1]) {
    return json_({
      ok: false,
      error: 'Empresa / projeto não recebido'
    });
  }

  sh.appendRow(row);
  SpreadsheetApp.flush();

  return json_({
    ok: true,
    message: 'Registro salvo com sucesso'
  });
}

function listarRegistros_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName('Cálculos');

  if (!sh) {
    return json_({
      records: [],
      error: 'Aba "Cálculos" não encontrada'
    });
  }

  const lastRow = sh.getLastRow();

  if (lastRow < 2) {
    return json_({ records: [] });
  }

  const dadosBase = sh
    .getRange(2, 2, lastRow - 1, 3)
    .getDisplayValues();

  const dadosCalculo = sh
    .getRange(2, 11, lastRow - 1, 2)
    .getValues();

  const records = [];

  for (let i = 0; i < dadosBase.length; i++) {
    const id = dadosBase[i][0];
    const empresa = dadosBase[i][1];

    if (!id || !empresa) continue;

    records.push({
      id: id,
      empresa: empresa,
      stand: dadosBase[i][2],
      total: Number(dadosCalculo[i][0]) || 0,
      maiorFonte: dadosCalculo[i][1] || ''
    });
  }

  return json_({ records: records });
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
