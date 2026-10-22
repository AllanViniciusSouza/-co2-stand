# Contrato de interface

Produto acadêmico em pt-BR, para coleta pelo celular. A implementação de referência é a entrevista de stand.

| Capacidade | Responsável canônico | Contrato e variantes | Verificação |
|---|---|---|---|
| Form | form.js; pessoa.js para perguntas de visitantes | Etapas, validação inline, foco no erro, rascunho separado por modalidade; sem validação nativa em balões | tests/form.test.cjs e tests/person-form.test.cjs |
| Escolha única | rádios nativos em cartões; pessoa.js e styles.css | Sem dropdowns; legend, label e teclado nativos, duas colunas no celular | Browser e testes de campos condicionais |
| Scrollbar | styles.css | Rolagem natural do documento, cores compartilhadas, forced-colors | Auditoria e viewport móvel |
| Feedback | form.js / records.js | Mensagens persistentes com status/alert; sem toast | Sucesso real, erro e reenvio testados |
| CRUD | api.js e AppsScript.gs | Criar e ler; não há editar/excluir. Sucesso fica no resultado individual, conforme pedido. ID preservado durante incerteza | Testes de idempotência e recuperação |
| Resultados | records.js | Filtros por tipo e página na URL; 12 cards/página; falha de uma base não apaga a outra | tests/records.test.cjs |

## Dados e navegação
- Pessoas: participantes visitantes, sem nome/contato/endereço completo; cidade/bairro como origem.
- Rascunho fica no navegador, com retorno à tela após recarga. Não há descarte na navegação; a tela informa recuperação.
- Durante envio incerto, campos permanecem bloqueados e o mesmo ID é reutilizado.
- Resultado pronto remove imediatamente a pendência persistida; abrir o formulário novamente começa uma entrevista vazia.
- Pendência antiga é consultada automaticamente, sem reenvio; falha mantém respostas e ID.
- Nova entrevista limpa rascunho, ID e revisão da modalidade atual e volta à primeira etapa, depois de confirmação do salvamento.
- Números em pt-BR, kgCO₂e. Desconhecido e ausência de fator não são zeros.
- Pessoas mantêm realizado e previsto; stands mantêm o evento inteiro. Não apresentar soma global das duas bases.
- Não extrapolar visitantes para público total. A contagem de stands entrevistados usa identificadores distintos, sem exibir o total previsto e sem apagar entrevistas repetidas.
- API usa a política de acesso já existente do Apps Script; esta mudança não altera compartilhamento ou permissões.

## Coleta de visitantes em um dia (evento de dois dias)
- A modalidade já identifica o visitante; sem triagem por perfil ou pergunta de resposta anterior.
- Ida de hoje realizada e volta de hoje prevista, uma ocorrência de cada.
- Segundo dia: repetir somente por escolha explícita, informar percursos diferentes ou indicar ausência/incerteza.
- Hospedagem usa as noites declaradas; nunca inferir noites pela duração do evento.
- Sugestões de inputs preenchem pelo toque, sem mover foco ao teclado, retiram Não sei e persistem no rascunho.
- Botão de copiar ida para volta mantém a volta editável e copia também os campos desconhecidos.
