// DOM adapter exercises application handlers; this is not a browser/layout test.
const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
function setup(){
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');const elements=[];
 for(const match of html.matchAll(/<([a-z][\w-]*)\b([^>]*)>/gi)){
  const attrs={};for(const a of match[2].matchAll(/([\w-]+)="([^"]*)"/g))attrs[a[1]]=a[2];
  const classes=new Set((attrs.class||'').split(' '));
  const e={attrs,dataset:{},style:{},hidden:false,value:attrs.value||'',selectedIndex:0,textContent:'',innerHTML:'',handlers:{},
   classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),toggle(c,on){if(on===undefined)on=!classes.has(c);on?classes.add(c):classes.delete(c);}},
   addEventListener(n,fn){this.handlers[n]=fn},setAttribute(n,v){attrs[n]=v},querySelectorAll(){return []},scrollIntoView(){},showModal(){this.open=true},close(){this.open=false}};
  for(const [k,v]of Object.entries(attrs))if(k.startsWith('data-'))e.dataset[k.slice(5)]=v;
  e.matches=s=>s.startsWith('.')?classes.has(s.slice(1)):false;elements.push(e);
 }
 const id=n=>elements.find(e=>e.attrs.id===n);let interval;
 const doc={getElementById:id,querySelectorAll:s=>elements.filter(e=>s.split(',').some(x=>e.matches(x))),querySelector:s=>elements.find(e=>e.matches(s))};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../app.js'),'utf8'),{VibrationMath:require('../vibration-math.js'),document:doc,setInterval:fn=>(interval=fn,1),clearInterval:()=>{interval=null},setTimeout:()=>1,clearTimeout(){},Math,Date,Number,Blob,URL});
 return {id,click:n=>id(n).handlers.click(),mode:n=>elements.find(e=>e.dataset.mode===n).handlers.click(),sensor:n=>elements.find(e=>e.dataset.sensor===n).handlers.click(),tick(n){for(let i=0;i<n;i++)interval?.()}};
}
test('power, verification, minimum duration, pause/resume and recording',()=>{
 const a=setup();a.click('startBtn');assert.equal(a.id('screenAlert').textContent,'POWER OFF');
 a.click('powerBtn');a.click('startBtn');assert.equal(a.id('screenAlert').textContent,'VERIFY FIRST');
 a.click('verifyBtn');a.click('startBtn');a.tick(5);a.click('startBtn');a.click('saveBtn');assert.equal(a.id('screenAlert').textContent,'MIDE AL MENOS 10 s');
 a.click('startBtn');a.tick(5);a.click('holdBtn');a.tick(3);assert.equal(a.id('timerValue').textContent,'00:10');
 a.click('holdBtn');a.tick(2);a.click('startBtn');a.click('saveBtn');assert.match(a.id('memoryList').innerHTML,/12 s medidos/);
 a.click('addOperation');assert.equal(a.id('combinedBox').hidden,false);
 a.click('powerBtn');assert.equal(a.id('a8Value').textContent,'0.00');assert.equal(a.id('timerValue').textContent,'00:00');
});
test('bad mounting and overload cannot enter a daily exposure',()=>{
 const a=setup();a.click('powerBtn');a.sensor('loose');a.click('verifyBtn');a.click('startBtn');a.tick(10);a.click('startBtn');a.click('saveBtn');assert.match(a.id('screenAlert').textContent,/NO VÁLIDA/);
 a.sensor('correct');a.click('verifyBtn');a.click('rangeBtn');a.click('startBtn');a.tick(10);a.click('startBtn');a.click('addOperation');assert.match(a.id('screenAlert').textContent,/NO VÁLIDA/);
});
test('mode change requires verification and isolates operations',()=>{
 const a=setup();a.click('powerBtn');a.click('verifyBtn');a.click('startBtn');a.tick(10);a.click('startBtn');a.click('addOperation');
 a.mode('wbv');assert.equal(a.id('combinedBox').hidden,true);assert.equal(a.id('operationsList').innerHTML,'');
 a.click('startBtn');assert.equal(a.id('screenAlert').textContent,'VERIFY FIRST');
 a.mode('hav');assert.equal(a.id('combinedBox').hidden,false);
});
