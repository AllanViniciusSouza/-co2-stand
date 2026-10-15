# CO₂ Stand v4.5

Entrevista em seis etapas, roteiro de apresentação no início e resultado individual na conclusão.
HTML/CSS/JavaScript estáticos, com Google Apps Script e a planilha existente como fonte de cálculo.

## Publicação obrigatória desta versão

O código local não atualiza automaticamente a implantação do Google Apps Script nem o site publicado.
Publique o backend antes do frontend. A v4.5 exige o protocolo novo; ela preserva o rascunho quando
não consegue confirmá-lo. Não publique somente o formulário.

1. Na planilha **CO₂ Stand - Respostas e Cálculos**, abra **Extensões → Apps Script**.
2. Substitua o código correspondente pelo conteúdo de `AppsScript.gs` deste projeto e salve.
3. Em **Implantar → Gerenciar implantações**, edite a implantação existente, escolha uma **nova versão**
   e implante. Preserve o URL `/exec`, a identidade de execução e os acessos existentes. Se o URL mudar,
   atualize `config.js` antes de publicar o frontend.
4. Publique os arquivos estáticos: `index.html`, `formulario.html`, `registros.html`, `styles.css`,
   `config.js`, `api.js`, `form.js` e `records.js`. O cache usa `?v=45`.

Verificação de implantação: `GET <apiUrl>?action=meta` deve retornar `ok: true`, `version: 45` e a duração
da aba Fatores. Não é necessário cadastrar uma entrevista fictícia para verificar a versão.

## Planilha e compatibilidade

- Planilha vinculada: `1aXxN1QCp5AxQ86_C9yOBwuGDyoV8P1E7FDIYeRlUCgo`.
- As colunas A:AE de **Respostas ao formulário 1** mantêm a ordem e os valores das opções utilizados
  pelas fórmulas atuais. Rótulos visuais de faixas foram esclarecidos sem alterar seus valores internos.
- AF:AI, verificadas vazias na análise, ficam reservadas para ID da entrevista, campos desconhecidos,
  período e estado de preparação do cálculo. O backend interrompe a gravação se houver cabeçalhos diferentes.
- Ao salvar uma nova entrevista, as fórmulas de A:M da linha 2 de **Cálculos** são copiadas com referências
  relativas para a linha correspondente. A linha 2 deve permanecer um modelo válido da metodologia.
- Fatores e respostas históricas não são reescritos. As categorias sem informação/fator ficam vazias
  na nova linha de cálculo; o total é a soma das parcelas disponíveis. A interface identifica esse subtotal.
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
