# Correção do cálculo de stands — 21/10/2026

A primeira entrevista tinha resíduos com destino desconhecido. O backend apagava I2 de Cálculos
com clearContent, mas copiava essa mesma linha como modelo das entrevistas seguintes. Assim,
I3 e I4 ficaram sem fórmula e a API retornava total nulo e estado calculating indefinidamente.

Foi restaurada somente a fórmula em Cálculos!I2:I4, com referências relativas, sem alterar respostas
ou fatores. A fórmula mantém a parcela desconhecida vazia na primeira entrevista e retorna zero
para as duas entrevistas que declararam nenhum resíduo. Seus totais são 2,643328 kgCO₂e cada.

A correção da planilha vale imediatamente na implantação existente. O AppsScript.gs deste commit
também substitui a exclusão destrutiva por condições nas fórmulas de todas as categorias e detecta
modelos incompletos. Essa proteção de código exige publicar uma nova versão da implantação Apps Script;
git push não publica o backend. A linha 2 restaurada permite que a implantação atual copie resíduos
corretamente para as próximas entrevistas.

Fórmula restaurada em I2 (preencher relativamente até I4):

```text
=IF(A2="";"";IF(OR(REGEXMATCH('Respostas ao formulário 1'!AG2;"residuoKg");'Respostas ao formulário 1'!X2="Não sei";AND('Respostas ao formulário 1'!X2<>"Nenhum";OR('Respostas ao formulário 1'!AA2="Não sei";AND('Respostas ao formulário 1'!AA2="Aterro / lixo comum";'Respostas ao formulário 1'!Z2="Não sei"))));"";IF('Respostas ao formulário 1'!X2="Nenhum";0;IF('Respostas ao formulário 1'!X2="Sei o valor em kg";'Respostas ao formulário 1'!Y2;SWITCH('Respostas ao formulário 1'!X2;"Menos de 1 kg";VLOOKUP("RES_MENOS_1";Fatores!J:K;2;FALSE);"Entre 1 e 5 kg";VLOOKUP("RES_1_5";Fatores!J:K;2;FALSE);"Entre 5 e 10 kg";VLOOKUP("RES_5_10";Fatores!J:K;2;FALSE);"Mais de 10 kg";VLOOKUP("RES_MAIS_10";Fatores!J:K;2;FALSE)))*VLOOKUP(IF('Respostas ao formulário 1'!AA2="Reciclagem";"RES_RECICLAVEL";IF('Respostas ao formulário 1'!AA2="Compostagem";"RES_ORG_COMPOST";IF('Respostas ao formulário 1'!Z2="Orgânico";"RES_ORG_ATERRO";"RES_MISTO_ATERRO")));Fatores!A:E;5;FALSE))))
```
