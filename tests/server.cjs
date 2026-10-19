// Servidor de desenvolvimento. --mock-api usa apenas memória, nunca a planilha real.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const backend=vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../AppsScript.gs'),'utf8'),backend);
const demoFactors={TRA_CAR_GAS:{unit:'kgCO2e/km',value:0.16152,status:'Demonstração'},TRA_ONIBUS:{unit:'kgCO2e/passageiro-km',value:0.128,status:'Demonstração'},ALI_BOV:{unit:'kgCO2e/refeição',value:14.922},ALI_FRANGO:{unit:'kgCO2e/refeição',value:1.4805},ALI_VEG:{unit:'kgCO2e/refeição',value:0.474}};
const mock = process.argv.includes('--mock-api');
const port = Number(process.env.PORT || 4173);
const entries = new Map();
const root = path.resolve(__dirname,'..');
http.createServer((req,res) => {
 const url = new URL(req.url,'http://localhost:4173');
 if(mock && url.pathname === '/api') {
  const p=url.searchParams;let data;
  if(p.get('action')==='meta') data={ok:true,version:45,personVersion:2,hours:8};
  else if(p.get('action')==='validatePerson') {try{backend.normalizePerson_(p.get('payload'));data={ok:true};}catch(e){data={ok:false,error:e.message};}}
  else if(p.get('action')==='submitPerson') {
   try {const id=p.get('requestId');if(!entries.has(id)){const d=backend.normalizePerson_(p.get('payload')),r=backend.calculatePerson_(d,demoFactors,id);r.notes.push('Demonstração local: dados em memória, sem gravação na planilha.');entries.set(id,r);}data={ok:true};}catch(e){data={ok:false,error:e.message};}
  }
  else if(p.get('action')==='submit') {
   entries.set(p.get('requestId'),{id:'DEMO-001',empresa:p.get('empresa'),stand:p.get('stand'),total:3.321,maiorFonte:'Transporte',breakdown:{Transporte:3.23,Energia:0.089,'Logística':0,Materiais:0,'Resíduos':0.002,'Alimentação':0},partial:false,notes:['Demonstração local: valores fictícios; nenhum dado foi enviado à planilha.']});
   data={ok:true};
  } else if(['status','personStatus'].includes(p.get('action'))) data=entries.has(p.get('requestId'))?{ok:true,state:'ready',record:entries.get(p.get('requestId'))}:{ok:true,state:'not_found'};
  else data={ok:true,records:[...entries.values()].filter(r=>p.get('action')==='people'?r.type==='person':r.type!=='person')};
  const callback=p.get('callback');res.setHeader('Content-Type',callback?'text/javascript':'application/json');
  res.end(callback?`${callback}(${JSON.stringify(data)});`:JSON.stringify(data));return;
 }
 if(mock && url.pathname==='/config.js') {res.setHeader('Content-Type','text/javascript');res.end('window.CO2_STAND_CONFIG={apiUrl:location.origin+"/api"};');return;}
 const filename=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
 if(!filename.startsWith(root+path.sep)||!['.html','.css','.js','.svg'].includes(path.extname(filename))) {res.writeHead(404);res.end();return;}
 try {res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml'})[path.extname(filename)]);res.end(fs.readFileSync(filename));}catch {res.writeHead(404);res.end();}
}).listen(port,'127.0.0.1',()=>console.log(`http://127.0.0.1:${port} — ${mock?'API simulada, sem gravação no Drive':'API configurada em config.js'}`));
