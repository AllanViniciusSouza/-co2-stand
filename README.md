# CO₂ Stand v4.8

Entrevistas de stands (seis etapas) e pessoas visitantes (quatro etapas), com resultado individual na conclusão.
HTML/CSS/JavaScript estáticos, com Google Apps Script e a planilha existente como fonte de cálculo.

## Publicação obrigatória desta versão

O código local não atualiza automaticamente a implantação do Google Apps Script nem o site publicado.
Publique o backend antes do frontend. A v4.8 exige o protocolo de stands v45 e a capacidade personVersion:2; ela preserva o rascunho quando
não consegue confirmá-lo. Não publique somente o formulário.

1. Na planilha **CO₂ Stand - Respostas e Cálculos**, abra **Extensões → Apps Script**.
2. Substitua o código correspondente pelo conteúdo de `AppsScript.gs` deste projeto e salve.
3. Em **Implantar → Gerenciar implantações**, edite a implantação existente, escolha uma **nova versão**
   e implante. Preserve o URL `/exec`, a identidade de execução e os acessos existentes. Se o URL mudar,
   atualize `config.js` antes de publicar o frontend.
4. Publique os arquivos estáticos: `index.html`, `formulario.html`, `registros.html`, `styles.css`,
   `pessoa.html`, `pessoa.js`, `config.js`, `api.js`, `form.js`, `records.js` e a pasta `assets` com o logo da UNISAL.
   Estilos e scripts alterados usam `?v=48`; config.js e api.js permanecem em `?v=45`.

Verificação de implantação: `GET <apiUrl>?action=meta` deve retornar `ok: true`, `version: 45`, `personVersion: 2` e a duração
da aba Fatores. Não é necessário cadastrar uma entrevista fictícia para verificar a versão.

## Planilha e compatibilidade

- Planilha vinculada: `1aXxN1QCp5AxQ86_C9yOBwuGDyoV8P1E7FDIYeRlUCgo`.
- As colunas A:AE de **Respostas ao formulário 1** mantêm a ordem e os valores das opções utilizados
  pelas fórmulas atuais. Rótulos visuais de faixas foram esclarecidos sem alterar seus valores internos.
- AF:AI, verificadas vazias na análise, ficam reservadas para ID da entrevista, campos desconhecidos,
  período e estado de preparação do cálculo. O backend interrompe a gravação se houver cabeçalhos diferentes.
- Ao salvar uma nova entrevista, as fórmulas de A:M da linha 2 de **Cálculos** são copiadas com referências
  relativas para a linha correspondente. A linha 2 deve permanecer um modelo válido da metodologia.
- Fatores e respostas históricas não são reescritos. As categorias sem informação/fator exibem vazio
  por uma condição na fórmula; suas fórmulas nunca são apagadas, inclusive na linha 2 usada como modelo.
  O total é a soma das parcelas disponíveis. A interface identifica esse subtotal.
- O identificador é persistido no navegador e na planilha. Repetir o envio usa o mesmo ID e não acrescenta
  outra linha. Um bloqueio do Apps Script serializa os envios web.
- Envios por versões anteriores do frontend, sem identificador, são rejeitados: recarregue o site atualizado.
- A listagem usa as respostas como referência para reconhecer registros parciais. O Resumo existente da
  planilha não foi redesenhado; seus totais devem ser interpretados à luz das parcelas ausentes.

## Premissas mantidas

O período é o evento inteiro. A duração vem de `HORAS_EVENTO` na aba Fatores (8 horas na inspeção).
Transportes usam distância de ida e pressupõem volta equivalente. Transporte da equipe considera o
maior grupo, com aviso quando não abrange toda a equipe. A quantidade de passageiros por veículo
refere-se às pessoas da equipe, coerente com a fórmula existente de veículos estimados.

Equipamentos adicionais usam quantidade total, média de horas e potência padrão existente (1.000 W
na inspeção). Materiais representam produção; resíduos representam tratamento do descarte. Alimentação
inclui apenas refeições fornecidas/custeadas pela empresa. Caminhão/Outro não recebem um fator inventado.
Valores “Não sei” ficam registrados separadamente, não como zero. Nenhuma validação científica nova dos
fatores provisórios foi feita; o sistema usa a metodologia fornecida na planilha.

## Desenvolvimento e testes

Requer Node.js 20.19+ ou uma versão LTS mais recente compatível com jsdom.

```powershell
npm ci
npm test
npm run dev
```

`npm run dev` serve em `http://127.0.0.1:4173`, usando a API de `config.js`.
Para testar a interface **sem acessar ou gravar na planilha**, use:

```powershell
node tests/server.cjs --mock-api
```

A API simulada usa dados fictícios em memória e identifica isso nas notas do resultado.
Os testes automatizados cobrem validação, condicionais, desconhecidos, múltiplos materiais,
resultado pendente, falha de conexão, vínculo ao ID e proteção contra reenvio duplicado.

## Arquitetura do envio

O formulário real é enviado por GET em iframe oculto, preservando o caminho já usado pelo Safari.
As leituras usam JSONP com nomes de callback restritos, sem depender de CORS do Apps Script.
A tela de sucesso depende de `action=status&requestId=...`, nunca de um temporizador de sucesso.
Falha/timeout mantém o rascunho e bloqueia edição do envio incerto até a verificação com o mesmo ID.
Os erros são inline, com foco e associação ao campo; movimentos respeitam a preferência do sistema.

## Versão com visitantes (frontend v48; protocolo de stands v45 preservado)

### Publicação
Atualize a implantação com **todo o AppsScript.gs**, antes do frontend. `action=meta` continua
retornando `version:45` para os stands e acrescenta `personVersion:2`. O formulário Pessoa e o
painel verificam essa capacidade; backend antigo não é confundido com uma base vazia.
Inclua `pessoa.html` e `pessoa.js`, além dos arquivos já publicados. Use as referências de cache
presentes nos HTMLs. A implementação local não publica o Apps Script nem o site automaticamente.

### Armazenamento escolhido
Manter a mesma planilha, com uma aba **Pessoas**, criada no primeiro envio válido. Não há migração
ou alteração das abas antigas. A aba tem 12 colunas: ID UUID, data UTC ISO, versão do esquema,
origem, dias realizados, dias previstos, emissão realizada, prevista, total, indicador parcial,
respostas JSON e resultado/fatores JSON. As colunas escalares permitem filtros e resumos no Sheets;
os JSONs preservam trechos variáveis, refeições por tipo, desconhecidos (`null`) e a rastreabilidade.
Uma única linha grava respostas e cálculo juntos, sob lock e com proteção idempotente por ID.
Cabeçalhos divergentes interrompem o envio em vez de sobrescrever dados existentes.

O servidor calcula usando os códigos e unidades conferidos da aba Fatores, e guarda no resultado
um snapshot dos fatores efetivamente usados (valor, unidade, ano, status e fonte) e `person-v2` (registros antigos preservam `person-v1`).
Resultados históricos de pessoas não são recalculados ao mudar fatores. Não é necessária outra
planilha ou banco para este evento; em uma escala maior, respostas e atividades podem virar tabelas
relacionadas por ID mantendo este contrato. Filtros e paginação visual são locais, em lotes de 12;
a API ainda lê a base inteira, adequado ao protótipo, não a bases de grande volume.

### Escopo e metodologia
- Pessoas: abrir o formulário já define o público como visitante. Não há pergunta sobre perfil
  ou entrevista anterior. A proteção contra duplicidade cobre reenvio do mesmo ID, não entrevistas
  distintas da mesma pessoa. O backend mantém compatibilidade com envios v1 já pendentes.
- A coleta acontece em um único dia de um evento de dois dias. Ida de hoje é realizada e volta
  de hoje é prevista, uma vez cada, sem pergunta de período. A participação pode ser só hoje,
  hoje/amanhã. As opções ontem/hoje e outro dia incerto foram retiradas da nova coleta; registros anteriores continuam compatíveis. Outro dia exige escolha explícita: repetir os dois
  percursos, informar outro percurso, sem nova viagem ou desconhecido. Só os trechos adicionais
  pedem período/repetições. Hospedagem registra noites reais (antes/entre/depois), nunca dias × noites.
- Opções são rádios em cartões tocáveis, sem dropdown. Todos os campos textuais/numéricos do
  visitante têm sugestões rápidas; tocar preenche, desmarca Não sei e salva rascunho sem focar input.
  A volta pode copiar os dados da ida e continuar editável.
- Carro/moto/táxi: veículo-km dividido pela ocupação; ônibus/trem/metrô: passageiro-km, sem divisão.
- A pé/bicicleta: zero de emissão direta. Avião, van de passageiros, etanol/elétrico/flex desconhecido
  ficam sem cálculo até existir metodologia apropriada; não se reutiliza fator de van de logística.
- Refeições bovina/frango/vegetariana usam proxies existentes. Outro/desconhecido não assume média.
- Hospedagem registra tipo e noites, sem fator inventado. Ausência de hospedagem é zero; noites
  positivas/desconhecidas são uma parcela ausente. Não há extrapolação de visitantes para o público.
- Viagens com outros motivos preservam todos os trechos declarados, com nota sobre atribuição.
- Subtotais somam parcelas conhecidas; resultado parcial identifica o que faltou. Categorias e
  períodos também podem ter subtotais. Os fatores existentes continuam provisórios; sua validação
  científica não faz parte desta alteração.
- Painel separa bases porque refeições e deslocamentos podem coincidir. Cobertura de stands conta
  identificadores distintos sobre 33; a soma mantém todas as entrevistas, sinalizando repetição possível.

### Teste seguro
`node tests/server.cjs --mock-api` usa o cálculo de pessoas com fatores de demonstração e memória
local. Não modifica a planilha. `npm test` inclui cálculos, unidades, desconhecidos, validação,
salvamento idempotente, rascunho, envio incerto e regressão do formulário Stand.

Verificação visual opcional: com Playwright instalado e Edge disponível, inicie o servidor simulado
e execute `node tests/browser-check.cjs`. `PLAYWRIGHT_MODULE` permite apontar para uma instalação
externa de Playwright. As imagens ficam em `tests/` e só contêm dados fictícios.
