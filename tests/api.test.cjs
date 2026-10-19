const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
function setup(){
 const dom=new JSDOM('<!doctype html><html><head></head><body></body></html>',{url:'http://localhost/',runScripts:'outside-only'}),w=dom.window,timers=[];
 w.CO2_STAND_CONFIG={apiUrl:'https://script.google.com/macros/s/test/exec'};
 w.setTimeout=(fn,ms)=>{const timer={fn,ms,cleared:false};timers.push(timer);return timers.length-1;};w.clearTimeout=id=>{timers[id].cleared=true;};
 w.eval(fs.readFileSync('api.js','utf8'));
 const callback=()=>w[new URL(w.document.querySelector('script').src).searchParams.get('callback')];
 return {dom,w,timers,callback};
}
test('API aguarda 45 segundos e aceita retorno que ultrapassaria o prazo anterior',async()=>{
 const a=setup(),promise=a.w.CO2Api.read({action:'meta'});
 assert.equal(a.timers[0].ms,45000);a.callback()({ok:true,personVersion:2});
 assert.equal((await promise).personVersion,2);assert.equal(a.timers[0].cleared,true);assert.equal(a.w.document.querySelector('script'),null);a.dom.window.close();
});
test('API timeout preserva diagnóstico e resposta atrasada não muda resultado',async()=>{
 const a=setup(),promise=a.w.CO2Api.read({action:'meta'}),callbackName=new URL(a.w.document.querySelector('script').src).searchParams.get('callback');
 const rejection=assert.rejects(promise,/45 segundos.*respostas foram mantidas/);a.timers[0].fn();await rejection;
 assert.doesNotThrow(()=>a.w[callbackName]({ok:true}));assert.equal(a.w.document.querySelector('script'),null);a.dom.window.close();
});
test('API distingue erro do servidor de timeout',async()=>{
 const a=setup(),promise=a.w.CO2Api.read({action:'personStatus'});a.callback()({ok:false,error:'Cabeçalhos incompatíveis'});await assert.rejects(promise,/Cabeçalhos incompatíveis/);a.dom.window.close();
});
