/* Paleta compartilhada dos dois gráficos e dos indicadores de categoria. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.ERPChartPalette=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const valid = s => /^#[0-9a-f]{6}$/i.test(String(s||''));
  function rgb(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));}
  function hex(arr){return '#'+arr.map(v=>Math.min(255,Math.max(0,Math.round(v))).toString(16).padStart(2,'0')).join('');}
  function mix(a,b,shareB){
    if(!valid(a)||!valid(b))return valid(a)?a:'#9b74e8';
    const x=rgb(a),y=rgb(b);return hex(x.map((v,i)=>v*(1-shareB)+y[i]*shareB));
  }
  function rgba(h,a){const c=rgb(valid(h)?h:'#9b74e8');return `rgba(${c[0]},${c[1]},${c[2]},${a})`;}
  function forTheme(theme){
    const a=valid(theme?.primary)?theme.primary:'#d85c9d';
    const b=valid(theme?.secondary)?theme.secondary:'#9b74e8';
    // Terceiro tom próprio da combinação do tema; variação de luminosidade para distinguir os três tipos.
    const blended=mix(a,b,.5);
    const third=mix(blended,theme?.mode==='dark'?'#ffffff':'#172033',theme?.mode==='dark'?.33:.28);
    const fourth=mix(mix(b, third, .35),theme?.mode==='dark'?'#d3e3ff':'#243e83',theme?.mode==='dark'?.48:.38);
    return {types:[a,b,third,fourth],line:a,lineFill:rgba(a,.13),linePoint:b};
  }
  return Object.freeze({forTheme,mix,rgba});
});
