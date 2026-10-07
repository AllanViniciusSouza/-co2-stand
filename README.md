# CO₂ Stand v4.4 — envio nativo do navegador

Nesta versão o formulário real da página é enviado diretamente pelo Safari para o Apps Script usando GET e um iframe oculto.

Não usa:
- fetch()
- POST
- CORS
- montagem manual de uma segunda cópia do formulário

## Apps Script
Não precisa alterar o Apps Script desta vez.

## GitHub
Substitua os arquivos da raiz pelos deste pacote, especialmente:
- formulario.html
- form.js
- config.js
- styles.css

Os scripts usam ?v=44 para evitar cache antigo no iPhone.
