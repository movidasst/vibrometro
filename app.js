(() => {
  'use strict';

  const MODES = {
    hav: {
      label: 'HAV', weight: 'Wh', primary: 'ahv', badge: 'HAV',
      scenarios: [
        {name:'Esmeril angular', desc:'Vibración continua con predominio medio-alto. La forma de agarre y el disco cambian la respuesta.', pattern:'Continuo', exposure:2, axes:[3.8,4.5,5.7], peak:18.5, cf:3.0},
        {name:'Taladro percutor', desc:'Vibración combinada de rotación e impacto. Requiere especial atención al montaje rígido del sensor.', pattern:'Percutivo', exposure:1.5, axes:[5.2,6.6,7.8], peak:34.0, cf:3.7},
        {name:'Martillo neumático', desc:'Señal intensa e impulsiva. Una medición representativa debe cubrir la variabilidad del trabajo.', pattern:'Impacto', exposure:2.5, axes:[8.4,10.2,12.8], peak:62.0, cf:4.1},
        {name:'Motosierra', desc:'Vibración variable según carga, corte, cadena y postura. Conviene caracterizar las operaciones relevantes.', pattern:'Intermitente', exposure:3, axes:[4.7,6.2,5.4], peak:24.0, cf:3.2},
        {name:'Llave de impacto', desc:'Impulsos de corta duración. El tiempo diario puede estimarse por ciclos o impactos representativos.', pattern:'Impulsos', exposure:1.1, axes:[7.3,8.8,9.1], peak:55.0, cf:4.8}
      ]
    },
    wbv: {
      label: 'WBV', weight: 'Wd/Wk', primary: 'A(8)', badge: 'WBV',
      scenarios: [
        {name:'Montacargas', desc:'Vibración transmitida a través del asiento. Baches, velocidad y superficie influyen mucho.', pattern:'Variable', exposure:6, axes:[0.42,0.36,0.58], peak:2.8, cf:4.1},
        {name:'Tractor agrícola', desc:'Vibración de baja frecuencia con variaciones por terreno, implemento, asiento y velocidad.', pattern:'Variable', exposure:5, axes:[0.48,0.52,0.71], peak:3.6, cf:4.6},
        {name:'Camión de reparto', desc:'Combina vibración de carretera con eventos transitorios. El eje dominante puede cambiar.', pattern:'Transitorio', exposure:7, axes:[0.31,0.34,0.49], peak:2.4, cf:4.2},
        {name:'Compactador', desc:'Exposición de cuerpo entero con vibración intensa y componente vertical importante.', pattern:'Continuo', exposure:4, axes:[0.54,0.50,0.88], peak:4.9, cf:5.0},
        {name:'Vehículo sobre terreno irregular', desc:'Escenario con picos frecuentes. Si el crest factor es alto, RMS puede no describir toda la severidad.', pattern:'Choques', exposure:3, axes:[0.62,0.68,0.95], peak:8.7, cf:8.4}
      ]
    }
  };

  const guideSteps = [
    ['Enciende el instrumento','Pulsa POWER. Antes de medir en campo, inspecciona equipo, sensor, cable y batería.','powerBtn'],
    ['Verifica la cadena de medición','Pulsa CAL. La comprobación funcional no sustituye la calibración metrológica trazable.','verifyBtn'],
    ['Selecciona el modo','Elige MANO–BRAZO o CUERPO ENTERO según la vía de transmisión al trabajador.','mode-strip'],
    ['Ubica correctamente el acelerómetro','En HAV mide tan cerca como sea posible de la zona de agarre. En WBV usa el punto de interfaz cuerpo-superficie.','sensorDiagram'],
    ['Confirma la ponderación','HAV usa Wh. En WBV sentado, X/Y usan Wd y Z usa Wk para evaluación de salud.','weightBtn'],
    ['Revisa el rango','AUTO es práctico; un rango insuficiente genera OVERLOAD y uno excesivo puede llevar a bajo-rango.','rangeBtn'],
    ['Inicia una medición representativa','Pulsa MEDIR y observa X, Y, Z, RMS, Peak y Crest Factor. La duración debe representar el trabajo real.','startBtn'],
    ['Calcula la exposición diaria','Ajusta el tiempo real de exposición y revisa A(8). Puedes agregar varias operaciones a la jornada.','exposureHours']
  ];

  const state = {
    mode:'hav', powered:false, verified:false, running:false, hold:false, range:'AUTO', guide:true, guideStep:0,
    sensor:'correct', tick:0, timer:0, values:{x:0,y:0,z:0,rms:0,peak:0,cf:0,primary:0,vdv:0}, operations:[], memory:[]
  };

  const $ = id => document.getElementById(id);
  const $$ = sel => [...document.querySelectorAll(sel)];
  const clamp = (n,min,max)=>Math.max(min,Math.min(max,n));
  const fmt = (n,d=2)=>Number.isFinite(n)?n.toFixed(d):'0.00';

  function currentScenario(){ return MODES[state.mode].scenarios[$('scenarioSelect').selectedIndex || 0]; }
  function exposureHours(){ return Number($('exposureHours').value || 0); }

  function init(){
    bind();
    setMode('hav');
    setSensor('correct');
    renderPower();
    renderGuide();
    switchTab('instant');
  }

  function bind(){
    $$('.mode-card').forEach(b=>b.addEventListener('click',()=>{setMode(b.dataset.mode);advanceGuideFor('mode-strip');}));
    $('scenarioSelect').addEventListener('change',()=>{loadScenarioMeta(); resetMeasurement(false);});
    $$('.sensor-choice,.sensor-point').forEach(b=>b.addEventListener('click',()=>{setSensor(b.dataset.sensor);advanceGuideFor('sensorDiagram');}));
    $('powerBtn').addEventListener('click',togglePower);
    $('verifyBtn').addEventListener('click',verify);
    $('weightBtn').addEventListener('click',explainWeight);
    $('rangeBtn').addEventListener('click',cycleRange);
    $('startBtn').addEventListener('click',toggleRun);
    $('holdBtn').addEventListener('click',()=>{ if(!state.powered)return alertScreen('POWER OFF'); state.hold=!state.hold; $('holdBtn').classList.toggle('active',state.hold); });
    $('resetBtn').addEventListener('click',()=>resetMeasurement(true));
    $('saveBtn').addEventListener('click',saveMeasurement);
    $('exposureHours').addEventListener('input',()=>{ $('exposureHoursOut').value=`${fmt(exposureHours())} h`; updateExposure(); });
    $('addOperation').addEventListener('click',addOperation);
    $('clearMemory').addEventListener('click',()=>{state.memory=[];renderMemory();});
    $$('.metric-tab').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));
    $('toggleGuide').addEventListener('click',()=>{state.guide=!state.guide;$('guideCard').hidden=!state.guide;$('toggleGuide').classList.toggle('active',state.guide);$('toggleGuide').setAttribute('aria-pressed',String(state.guide));});
    $('guideWhere').addEventListener('click',highlightGuideTarget);
    $('openHelp').addEventListener('click',()=>$('helpDialog').showModal());
    $('closeHelp').addEventListener('click',()=>$('helpDialog').close());
  }

  function setMode(mode){
    state.mode=mode;
    $$('.mode-card').forEach(b=>b.classList.toggle('selected',b.dataset.mode===mode));
    const cfg=MODES[mode];
    $('scenarioSelect').innerHTML=cfg.scenarios.map((s,i)=>`<option value="${i}">${s.name}</option>`).join('');
    $('scenarioBadge').textContent=cfg.badge;
    $('displayMode').textContent=cfg.label;
    $('displayWeight').textContent=cfg.weight;
    $('factWeight').textContent=cfg.weight;
    $('primaryLabel').innerHTML=mode==='hav'?'a<sub>hv</sub>':'a<sub>w,dom</sub>';
    $('sensorDiagram').classList.toggle('wbv',mode==='wbv');
    $('sensorDiagram').classList.toggle('hav',mode==='hav');
    $('m1Label').innerHTML=mode==='hav'?'a<sub>hwx</sub>':'1.4·a<sub>wx</sub> (Wd)';
    $('m2Label').innerHTML=mode==='hav'?'a<sub>hwy</sub>':'1.4·a<sub>wy</sub> (Wd)';
    $('m3Label').innerHTML=mode==='hav'?'a<sub>hwz</sub>':'1.0·a<sub>wz</sub> (Wk)';
    $('m4Label').innerHTML=mode==='hav'?'a<sub>hv</sub>':'Eje dominante';
    $('instantExplanation').innerHTML=mode==='hav'
      ?'En mano-brazo se usa Wh en los tres ejes y el valor total a<sub>hv</sub> es la raíz de la suma de cuadrados.'
      :'Para salud en persona sentada: X e Y usan Wd con k=1,4 y Z usa Wk con k=1. La evaluación se realiza por eje y se considera el mayor.';
    $('exposureTitle').textContent='A(8)';
    $('formulaBox').innerHTML=mode==='hav'
      ?'A(8) = a<sub>hv</sub> × √(T / 8 h)'
      :'A<sub>l</sub>(8) = k<sub>l</sub> · a<sub>wl</sub> × √(T / 8 h)';
    loadScenarioMeta(); setSensor('correct'); resetMeasurement(false); updateExposure();
  }

  function loadScenarioMeta(){
    const s=currentScenario();
    $('scenarioDescription').textContent=s.desc;
    $('scenarioPattern').textContent=s.pattern;
    $('scenarioExposure').textContent=`${fmt(s.exposure,1)} h`;
    $('exposureHours').value=s.exposure;
    $('exposureHoursOut').value=`${fmt(s.exposure)} h`;
  }

  function setSensor(kind){
    state.sensor=kind;
    $$('.sensor-choice,.sensor-point').forEach(b=>b.classList.toggle('selected',b.dataset.sensor===kind));
    const fb=$('sensorFeedback');
    if(kind==='correct'){
      fb.className='feedback ok';
      fb.textContent=state.mode==='hav'?'Sensor próximo a la zona de transmisión y montaje rígido.':'Sensor en la interfaz asiento-cuerpo, alineado con los ejes de medición.';
    }else if(kind==='far'){
      fb.className='feedback warn';
      fb.textContent='Ubicación poco representativa: la magnitud puede cambiar con la posición del transductor.';
    }else{
      fb.className='feedback bad';
      fb.textContent='Montaje deficiente: puede introducir resonancia, movimiento relativo o error en la medición.';
    }
    updateInterpretation();
  }

  function togglePower(){
    state.powered=!state.powered;
    if(!state.powered){state.running=false;state.verified=false;state.timer=0;stopLoop();}
    renderPower();
    if(state.powered){advanceGuideFor('powerBtn'); alertScreen('SELF CHECK',700); setTimeout(()=>alertScreen('READY',700),730);}
  }

  function renderPower(){
    $('display').classList.toggle('off',!state.powered);
    $('displayRun').textContent=state.running?'RUN':'STOP';
    $('powerBtn').classList.toggle('active',state.powered);
    if(!state.powered) setReadings({x:0,y:0,z:0,rms:0,peak:0,cf:0,primary:0,vdv:0});
  }

  function verify(){
    if(!state.powered)return alertScreen('POWER OFF');
    state.verified=true;
    const text=state.mode==='hav'?'CHECK 79.58 Hz':'CHECK 15.915 Hz';
    alertScreen(text,900); setTimeout(()=>alertScreen('CAL CHECK OK',900),920);
    advanceGuideFor('verifyBtn'); updateInterpretation();
  }

  function explainWeight(){
    if(!state.powered)return alertScreen('POWER OFF');
    alertScreen(state.mode==='hav'?'Wh ACTIVE':'Wd X/Y · Wk Z',1100);
    advanceGuideFor('weightBtn');
  }

  function cycleRange(){
    const order=['AUTO','LOW','MID','HIGH'];
    state.range=order[(order.indexOf(state.range)+1)%order.length];
    $('displayRange').textContent=state.range;$('factRange').textContent=state.range;
    advanceGuideFor('rangeBtn');
  }

  function toggleRun(){
    if(!state.powered)return alertScreen('POWER OFF');
    if(!state.verified){alertScreen('VERIFY FIRST',1200);return;}
    state.running=!state.running; state.hold=false; $('holdBtn').classList.remove('active');
    $('displayRun').textContent=state.running?'RUN':'STOP'; $('startBtn').classList.toggle('active',state.running);
    if(state.running){state.timer=0;state.tick=0;runLoop();advanceGuideFor('startBtn');} else stopLoop();
    updateInterpretation();
  }

  let interval=null;
  function runLoop(){
    stopLoop(); interval=setInterval(()=>{
      if(!state.running||state.hold)return;
      state.tick++;state.timer++;
      const s=currentScenario();
      const bias=state.sensor==='correct'?1:state.sensor==='far'?0.82:1.17;
      const wobble=(idx)=>1 + Math.sin((state.tick+idx*2)/3.7)*0.055 + (Math.random()-.5)*0.045;
      let x=s.axes[0]*bias*wobble(1), y=s.axes[1]*bias*wobble(2), z=s.axes[2]*bias*wobble(3);
      let primary;
      let rms;
      if(state.mode==='hav'){
        primary=Math.sqrt(x*x+y*y+z*z);
        rms=Math.max(x,y,z);
      }else{
        primary=Math.max(1.4*x,1.4*y,z);
        rms=primary;
      }
      const peak=s.peak*bias*(.94+Math.random()*.12);
      const cf=peak/Math.max(rms,0.001);
      const vdv=0; // reservado para una fase avanzada con integración de cuarta potencia
      const values={x,y,z,rms,peak,cf,primary,vdv};
      setReadings(values);checkRange(values);updateExposure();updateInterpretation();
    },1000);
  }
  function stopLoop(){if(interval){clearInterval(interval);interval=null;}}

  function setReadings(v){
    state.values=v;
    $('xValue').textContent=fmt(v.x);$('yValue').textContent=fmt(v.y);$('zValue').textContent=fmt(v.z);
    $('rmsValue').textContent=fmt(v.rms);$('peakValue').textContent=fmt(v.peak);$('crestValue').textContent=fmt(v.cf,1);
    $('primaryValue').textContent=fmt(v.primary);$('timerValue').textContent=`${String(Math.floor(state.timer/60)).padStart(2,'0')}:${String(state.timer%60).padStart(2,'0')}`;
    let axes=state.mode==='hav'?[v.x,v.y,v.z]:[1.4*v.x,1.4*v.y,v.z];
    $('m1Value').textContent=`${fmt(axes[0])} m/s²`;$('m2Value').textContent=`${fmt(axes[1])} m/s²`;$('m3Value').textContent=`${fmt(axes[2])} m/s²`;
    if(state.mode==='hav')$('m4Value').textContent=`${fmt(v.primary)} m/s²`;else{
      const names=['X','Y','Z'];const max=Math.max(...axes);$('m4Value').textContent=`${names[axes.indexOf(max)]} · ${fmt(max)} m/s²`;
    }
  }

  function checkRange(v){
    if(state.range==='AUTO')return;
    const limits=state.mode==='hav'?{LOW:[.2,4],MID:[.5,12],HIGH:[1,80]}:{LOW:[.02,.5],MID:[.05,2],HIGH:[.2,12]};
    const [low,high]=limits[state.range];
    if(v.primary>high)alertScreen('OVERLOAD',1300);
    else if(v.primary<low)alertScreen('UNDER RANGE',1300);
  }

  function updateExposure(){
    const T=exposureHours();
    if(state.mode==='hav'){
      const a8=state.values.primary*Math.sqrt(T/8);$('a8Value').textContent=fmt(a8);
    }else{
      const axes=[1.4*state.values.x,1.4*state.values.y,state.values.z];
      const a8axes=axes.map(v=>v*Math.sqrt(T/8));$('a8Value').textContent=fmt(Math.max(...a8axes));
    }
    renderOperations();
  }

  function addOperation(){
    if(!state.powered||state.values.primary<=0){alertScreen('MEASURE FIRST',1100);return;}
    const s=currentScenario();
    const item={id:Date.now(),mode:state.mode,name:s.name,hours:exposureHours(),x:state.values.x,y:state.values.y,z:state.values.z,primary:state.values.primary};
    state.operations.push(item);renderOperations();advanceGuideFor('exposureHours');
  }

  function renderOperations(){
    const box=$('operationsList');
    box.innerHTML=state.operations.map((o,i)=>`<div class="operation-item"><div><strong>${i+1}. ${o.name}</strong><span>${fmt(o.hours)} h · ${fmt(o.primary)} m/s²</span></div><button type="button" data-remove="${o.id}">×</button></div>`).join('');
    box.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{state.operations=state.operations.filter(o=>String(o.id)!==b.dataset.remove);renderOperations();});
    const same=state.operations.filter(o=>o.mode===state.mode);
    const combined=$('combinedBox');
    if(!same.length){combined.hidden=true;return;}
    let result=0;
    if(state.mode==='hav') result=Math.sqrt(same.reduce((sum,o)=>sum+o.primary*o.primary*o.hours/8,0));
    else {
      const ax=Math.sqrt(same.reduce((sum,o)=>sum+(1.4*o.x)**2*o.hours/8,0));
      const ay=Math.sqrt(same.reduce((sum,o)=>sum+(1.4*o.y)**2*o.hours/8,0));
      const az=Math.sqrt(same.reduce((sum,o)=>sum+(o.z)**2*o.hours/8,0));
      result=Math.max(ax,ay,az);
    }
    $('combinedA8').textContent=`${fmt(result)} m/s²`;combined.hidden=false;
  }

  function saveMeasurement(){
    if(!state.powered||state.values.primary<=0){alertScreen('NO DATA',900);return;}
    state.memory.unshift({time:new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),mode:MODES[state.mode].label,name:currentScenario().name,value:state.values.primary,a8:Number($('a8Value').textContent)});
    state.memory=state.memory.slice(0,6);renderMemory();alertScreen('SAVED',700);
  }

  function renderMemory(){
    $('memoryList').innerHTML=state.memory.length?state.memory.map(m=>`<div class="memory-item"><div><strong>${m.mode} · ${m.name}</strong><span>${m.time}</span></div><div><strong>${fmt(m.value)} m/s²</strong><span>A(8) ${fmt(m.a8)}</span></div></div>`).join(''):'<p class="muted">Aún no hay mediciones guardadas.</p>';
  }

  function resetMeasurement(full){
    state.running=false;state.hold=false;state.timer=0;stopLoop();$('startBtn').classList.remove('active');$('holdBtn').classList.remove('active');$('displayRun').textContent='STOP';
    setReadings({x:0,y:0,z:0,rms:0,peak:0,cf:0,primary:0,vdv:0});updateExposure();
    if(full)alertScreen('RESET',600);updateInterpretation();
  }

  function updateInterpretation(){
    const box=$('interpretation');
    if(!state.powered){box.innerHTML='<h3>Equipo apagado</h3><p>Enciende el instrumento y realiza la comprobación funcional antes de medir.</p>';return;}
    if(!state.verified){box.innerHTML='<h3>Falta verificar</h3><p>Comprueba la cadena de medición antes de iniciar la evaluación.</p>';return;}
    if(state.sensor!=='correct'){box.innerHTML='<h3>Revisa el sensor</h3><p>La posición o el montaje pueden sesgar la medición. Corrígelo antes de interpretar resultados.</p>';return;}
    if(!state.running&&state.values.primary===0){box.innerHTML='<h3>Listo para medir</h3><p>Modo, sensor y comprobación están preparados. Inicia una medición representativa.</p>';return;}
    if(state.mode==='wbv'&&state.values.cf>9){box.innerHTML='<h3>Señal muy impulsiva</h3><p>El Crest Factor elevado indica que el RMS básico puede no describir suficientemente la señal. Considera métodos adicionales.</p>';return;}
    box.innerHTML='<h3>Medición en curso</h3><p>Observa la estabilidad de los tres ejes y asegúrate de que el periodo medido represente la operación real.</p>';
  }

  function switchTab(tab){
    $$('.metric-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));$$('.tab-panel').forEach(p=>p.classList.toggle('active',p.dataset.panel===tab));
  }

  function alertScreen(text,ms=1200){
    const el=$('screenAlert');el.textContent=text;el.hidden=false;clearTimeout(alertScreen.t);alertScreen.t=setTimeout(()=>el.hidden=true,ms);
  }

  function renderGuide(){
    const [title,text]=guideSteps[state.guideStep];$('guideStepLabel').textContent=`Paso ${state.guideStep+1} de ${guideSteps.length}`;$('guideTitle').textContent=title;$('guideText').textContent=text;$('guideProgress').style.width=`${((state.guideStep+1)/guideSteps.length)*100}%`;
  }
  function advanceGuideFor(target){
    const expected=guideSteps[state.guideStep][2];
    if(expected===target&&state.guideStep<guideSteps.length-1){state.guideStep++;renderGuide();}
  }
  function highlightGuideTarget(){
    const target=guideSteps[state.guideStep][2];let el=$(target)||document.querySelector('.'+target);if(!el)return;el.classList.remove('highlight');void el.offsetWidth;el.classList.add('highlight');el.scrollIntoView({behavior:'smooth',block:'center'});
  }

  init();
})();
