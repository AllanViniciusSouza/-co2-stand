// Servidor de desenvolvimento. --mock-api usa apenas memória, nunca a planilha real.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const mock = process.argv.includes('--mock-api');
const entries = new Map();
const root = path.resolve(__dirname,'..');
http.createServer((req,res) => {
 const url = new URL(req.url,'http://localhost:4173');
 if(mock && url.pathname === '/api') {
  const p=url.searchParams;let data;
  if(p.get('action')==='meta') data={ok:true,version:45,hours:8};
  else if(p.get('action')==='submit') {
   entries.set(p.get('requestId'),{id:'DEMO-001',empresa:p.get('empresa'),stand:p.get('stand'),total:3.321,maiorFonte:'Transporte',breakdown:{Transporte:3.23,Energia:0.089,'Logística':0,Materiais:0,'Resíduos':0.002,'Alimentação':0},partial:false,notes:['Demonstração local: valores fictícios; nenhum dado foi enviado à planilha.']});
   data={ok:true};
  } else if(p.get('action')==='status') data=entries.has(p.get('requestId'))?{ok:true,state:'ready',record:entries.get(p.get('requestId'))}:{ok:true,state:'not_found'};
  else data={ok:true,records:[...entries.values()]};
  const callback=p.get('callback');res.setHeader('Content-Type',callback?'text/javascript':'application/json');
  res.end(callback?`${callback}(${JSON.stringify(data)});`:JSON.stringify(data));return;
 }
 if(mock && url.pathname==='/config.js') {res.setHeader('Content-Type','text/javascript');res.end('window.CO2_STAND_CONFIG={apiUrl:location.origin+"/api"};');return;}
 const filename=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
 if(!filename.startsWith(root+path.sep)||!['.html','.css','.js'].includes(path.extname(filename))) {res.writeHead(404);res.end();return;}
 try {res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript'})[path.extname(filename)]);res.end(fs.readFileSync(filename));}catch {res.writeHead(404);res.end();}
}).listen(4173,'127.0.0.1',()=>console.log(`http://127.0.0.1:4173 — ${mock?'API simulada, sem gravação no Drive':'API configurada em config.js'}`));
