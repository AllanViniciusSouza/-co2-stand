# CO₂ Stand — v4 (formulário próprio)

## Arquitetura
GitHub Pages → formulário próprio → Apps Script → Google Sheets → Cálculos → cards de resultados

## Arquivos para o GitHub
Envie para a raiz:
- index.html
- formulario.html
- registros.html
- styles.css
- config.js
- form.js
- records.js

## Importante: atualizar o Apps Script
O Apps Script mudou: agora ele recebe os dados do formulário do site.

1. Abra a planilha `CO₂ Stand - Respostas e Cálculos`.
2. Extensões > Apps Script.
3. Substitua todo o código pelo conteúdo de `AppsScript.gs`.
4. Salve.
5. Vá em Implantar > Gerenciar implantações.
6. Edite a implantação existente (ícone de lápis).
7. Em versão, escolha `Nova versão`.
8. Clique em Implantar.

Mantenha a mesma URL /exec. O `config.js` já está configurado para ela.

## Lógica condicional implementada
- Transporte:
  - carro gasolina/diesel, moto e aplicativo/táxi → pessoas + distância + ocupação média
  - ônibus/trem/metrô → pessoas + distância, sem ocupação
  - a pé/bicicleta → pula pessoas/distância/ocupação para cálculo
- Equipamento alto consumo:
  - Sim → equipamento, quantidade, horas/dia
  - Não → pula detalhes
- Logística:
  - Sim → veículo, distância, viagens
  - Não → pula detalhes
- Materiais:
  - só mostra quantidade do material marcado
- Resíduo:
  - "Sei o valor em kg" → abre campo de kg
- Alimentação:
  - Sim → quantidade e tipo predominante
  - Não → pula detalhes

## Teclado numérico
Campos de quantidade usam `inputmode="numeric"`.
Campos de km, kg e horas usam `inputmode="decimal"`.
