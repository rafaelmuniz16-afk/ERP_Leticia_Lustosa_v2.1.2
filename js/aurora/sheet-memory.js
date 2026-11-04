/* Adaptador de Memoria_IA: normaliza linhas de planilha para texto do chatbot. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object' && module.exports)module.exports=api;
  else root.ERPSheetMemory=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const keys=['memoria','memorias','memoriaIA','Memoria_IA','memoria_ia','dadosMemoria','dadosMemorias','lembrancas'];
  const contentKeys=['texto','memoria','lembranca','conteudo','conteúdo','fato','anotacao','anotação','nota','mensagem','informacao','informação','descricao','descrição','registro','valor','content','observacao'];
  function asArray(source){
    if(Array.isArray(source))return source;
    if(!source||typeof source!=='object')return null;
    for(const k of [...keys,'dados','rows','linhas','registros','values','data','items']){
      if(Array.isArray(source[k]))return source[k];
    }
    return null;
  }
  function fromResponse(response){
    if(Array.isArray(response))return response;
    if(!response||typeof response!=='object')return null;
    for(const k of keys){
      if(Object.prototype.hasOwnProperty.call(response,k)){
        const data=asArray(response[k]);
        if(data)return data;
      }
    }
    for(const k of ['abas','sheets','planilhas']){
      const tabs=response[k];
      if(tabs&&typeof tabs==='object'){
        const named=tabs.Memoria_IA||tabs.memoria_ia||tabs.memoria;
        const data=asArray(named);
        if(data)return data;
      }
    }
    return null;
  }
  function text(value){
    if(value==null)return '';
    if(typeof value==='string'||typeof value==='number'||typeof value==='boolean')return String(value).trim();
    if(Array.isArray(value))return value.map(text).filter(Boolean).join(' · ');
    if(typeof value==='object'){
      for(const k of contentKeys){
        const exact=Object.keys(value).find(p=>p.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')===k.normalize('NFD').replace(/[\u0300-\u036f]/g,''));
        if(exact){const out=text(value[exact]);if(out)return out;}
      }
      const vals=Object.entries(value).filter(([k,v])=>!/^(?:id|uid|data|date|timestamp|hora|usuario|user|autor|tipo|categoria|api.?key|senha|token)$/i.test(k) && (typeof v==='string'||typeof v==='number'));
      return vals.map(([,v])=>text(v)).filter(Boolean).join(' · ');
    }
    return '';
  }
  function normalize(rows){
    if(!Array.isArray(rows))return [];
    const seen=new Set(), output=[];
    for(const row of rows){
      const value=text(row).replace(/\s+/g,' ').trim().slice(0,500);
      if(!value||/^(mem[oó]ria|texto|conte[uú]do|lemb(ran[cç]a)?|data|observa[cç][aã]o)$/i.test(value))continue;
      const key=value.toLocaleLowerCase('pt-BR');
      if(!seen.has(key)){seen.add(key);output.push(value);}
    }
    return output.slice(-100);
  }
  function promptLines(rows,maxItems=40,maxChars=12000){
    const values=normalize(rows).slice(-maxItems).reverse();
    const result=[];let used=0;
    for(const m of values){const capped=m.slice(0,450);if(used+capped.length>maxChars)break;result.push(capped);used+=capped.length;}
    return result.reverse();
  }
  return Object.freeze({fromResponse,normalize,promptLines});
});
