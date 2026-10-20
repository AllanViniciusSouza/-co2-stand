---
version: alpha
name: CO₂ Stand
description: Entrevista acadêmica guiada em celular, com resultado estimado por stand.
colors:
  primary: "#0f5132"
  secondary: "#18794e"
  background: "#f4f7f5"
  surface: "#ffffff"
  text: "#18211c"
  muted: "#66716a"
  border: "#dce6df"
  danger: "#b42318"
typography:
  sans:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif'
rounded:
  DEFAULT: "14px"
  field: "17px"
spacing:
  form-max: "680px"
  page-max: "920px"
components:
  button:
    height: "52px"
  field:
    padding: "16px"
---

# CO₂ Stand

## Overview
Ferramenta em português brasileiro para Allan conduzir entrevistas em stands pelo celular.
Preservar a identidade verde existente. A assinatura é a coleta guiada em seis
etapas e um resultado destacado. Priorizar leitura rápida, familiaridade e dados compreensíveis.
Não transformar a coleta em uma página de marketing. A fonte canônica dos tokens é styles.css;
este documento registra suas cores, dimensões e usos, sem gerar um segundo tema.

## Colors
Verde escuro para ações primárias e resultados, verde claro para orientações, branco para campos.
Erros usam texto e borda vermelha; sucesso exige confirmação real, não só cor ou temporizador.

## Typography
Fonte de sistema, corpo legível e campos de 17px para uso móvel. Números em pt-BR, com unidade
kgCO₂e e três casas decimais. A precisão de exibição não representa precisão metodológica.

## Layout
Formulário de uma coluna até 680px; página inicial até 920px. Controles com pelo menos 44px de
área de interação. Preservar margens ao focar campos sob cabeçalho e ações fixas.

## Elevation & Depth
Usar bordas e fundos suaves, sem sombras decorativas em cards. Cabeçalho e progresso fixos.

## Shapes
Campos com 17px, botões com 14px e resultado com 19px de raio, conforme styles.css.

## Components
O logo branco oficial da UNISAL aparece no cabeçalho fixo das quatro telas, sobre fundo verde. Preservar proporção, cores e respiro; arquivo local em
`assets/unisal-branco.svg`, obtido do site institucional. Não aplicar filtros ou recortar.
Formulário e validação: form.js. Transporte de API e formatação numérica: api.js.
Tokens, scrollbar e controles: styles.css. Resultado final reutiliza as cores dos registros.
Erro inline com foco e aria-invalid; seleção e foco visíveis nos rádios. Campos condicionais
desativados não são enviados. Desconhecido é uma escolha explícita, nunca convertido em zero.
Sem toast: mensagens persistentes junto ao formulário/resultado. O formulário Stand usa rádios; não há operações de exclusão.
Envio usa ID único persistido, bloqueia edição enquanto incerto e permite repetir com o mesmo ID.
Somente a confirmação do servidor mostra “Registro salvo”; cálculo pendente é um estado separado.
Redução de movimento respeitada; textarea sem redimensionamento manual, com expansão automática.

## Do's and Don'ts
- Manter rascunho e identidade da entrevista durante falhas e recarregamentos.
- Mostrar subtotal e limitações quando parcelas não puderem ser calculadas.
- Não apresentar ausência de fator, cálculo ou informação como emissão zero.
- Não alterar fatores ou resultados históricos para adequá-los a uma nova entrevista.

## Entrevistas de pessoas e resultados
A entrevista Pessoa tem quatro etapas: participação, trechos, refeições/hospedagem e revisão.
Preserva os tokens, a fonte de sistema e o resultado no próprio fluxo. O elemento característico
é a separação temporal “Já realizado / Ainda previsto”, sempre acompanhada de texto.
Perguntas da pessoa: pessoa.js; motor compartilhado de formulário, validação, rascunho e envio: form.js.
Visitantes usam cartões de escolha com rádios nativos, em duas colunas também no iPhone, sem dropdowns.
Sugestões abaixo dos inputs são botões de no mínimo 44px, com estado selecionado e sem abrir o teclado.
Ida/volta de hoje têm períodos fixos; outro dia exige escolha explícita. Noites não são multiplicadas.
Resultados: filtros Visão geral / Stands / Pessoas, totais independentes, detalhes expansíveis,
12 registros por página, filtro e página na URL. Nunca usar total global entre modalidades.
Comportamento e responsáveis estão registrados em UX-CONTRACT.md.
