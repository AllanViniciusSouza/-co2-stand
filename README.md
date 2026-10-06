# CO₂ Stand — Site v2

## Melhorias desta versão
- O formulário abre **dentro do próprio site**.
- Há botão **Voltar ao início** antes e depois do formulário.
- A navegação principal permanece disponível no topo.
- "Gerenciar registros" virou **Visualizar registros** em cards.
- A planilha completa não é aberta pelo site.
- Os cards mostram apenas ID, empresa, stand, total kgCO₂e e maior fonte.

## Para publicar
Substitua no GitHub Pages os arquivos:
- index.html
- styles.css
- app.js
- config.js

## Para tornar os cards automáticos
1. Abra a planilha `CO₂ Stand - Respostas e Cálculos`.
2. Vá em **Extensões > Apps Script**.
3. Cole o conteúdo de `AppsScript.gs`.
4. Clique em **Implantar > Nova implantação > Aplicativo da Web**.
5. Executar como: **você**.
6. Quem pode acessar: **qualquer pessoa**.
7. Autorize.
8. Copie a URL que termina em `/exec`.
9. Abra `config.js` e cole a URL em:
   `recordsApiUrl: "SUA_URL_AQUI"`
10. Suba novamente apenas o `config.js` no GitHub.

A API expõe somente os campos resumidos usados pelos cards; não expõe as respostas brutas do formulário.
