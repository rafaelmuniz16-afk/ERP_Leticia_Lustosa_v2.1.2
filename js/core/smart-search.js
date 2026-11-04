/* Busca única de IDs e processos. Termos separados por ; significam OU. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object' && module.exports)module.exports=api;
  else root.ERPCaseSearch=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const fold=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const compact=value=>fold(value).replace(/[^a-z0-9]/g,'');
  function terms(query){return [...new Set(String(query??'').split(';').map(fold).filter(Boolean))];}
  function matches(record,query){
    const tokens=terms(query);
    if(!tokens.length)return true;
    const fields=[record?.id,record?.processo].map(v=>({normal:fold(v),flat:compact(v)}));
    return tokens.some(q=>{
      const flat=compact(q);
      return fields.some(f=>f.normal.includes(q)||(flat&&f.flat.includes(flat)));
    });
  }
  return Object.freeze({terms,matches});
});
