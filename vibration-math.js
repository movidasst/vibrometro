/* Educational calculations. Inputs are frequency-weighted acceleration RMS, m/s². */
(function(root){
  'use strict';
  const factors = mode => mode === 'wbv' ? [1.4,1.4,1] : [1,1,1];
  function magnitude(mode, axes){
    const a=axes.map((v,i)=>v*factors(mode)[i]);
    return mode==='hav'?Math.hypot(...a):Math.max(...a);
  }
  function exposure(mode, operations){
    const energies=[0,0,0];
    for(const o of operations){
      if(!Number.isFinite(o.hours)||o.hours<0||o.hours>24||o.axes.some(v=>!Number.isFinite(v)||v<0)) throw new RangeError('Datos de exposición inválidos');
      o.axes.forEach((v,i)=>energies[i]+=(v*factors(mode)[i])**2*o.hours/8);
    }
    const axes=energies.map(Math.sqrt);
    return {axes,total:mode==='hav'?Math.hypot(...axes):Math.max(...axes)};
  }
  function accumulate(acc, axes, peaks, seconds=1){
    if(!(seconds>0))throw new RangeError('Intervalo inválido');
    acc.seconds+=seconds;
    axes.forEach((v,i)=>{acc.squares[i]+=v*v*seconds;acc.peaks[i]=Math.max(acc.peaks[i],peaks[i]);});
    return acc.squares.map(v=>Math.sqrt(v/acc.seconds));
  }
  const api={factors,magnitude,exposure,accumulate,fresh:()=>({seconds:0,squares:[0,0,0],peaks:[0,0,0]})};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.VibrationMath=api;
})(globalThis);
