/* Phase 4: local observation and explicit, read-only consultation. */
(() => {
 'use strict';const A=window.__auroraAutonomyParts={};
 const freeze=o=>{if(o&&typeof o==='object'&&!Object.isFrozen(o)){Object.values(o).forEach(freeze);Object.freeze(o);}return o;};
 const copy=o=>JSON.parse(JSON.stringify(o));
 const hash=o=>{const s=JSON.stringify(o);let a=2166136261,b=5381;for(let i=0;i<s.length;i++){a=Math.imul(a^s.charCodeAt(i),16777619);b=Math.imul(b,33)^s.charCodeAt(i);}return(a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');};
 const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Fortaleza',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
 const defaults=()=>({enabled:true,suggestions:true,generative:false,minimumRelevance:'moderate'});
 const preferences=input=>{const p=defaults();for(const k of ['enabled','suggestions','generative'])if(typeof input?.[k]==='boolean')p[k]=input[k];if(['moderate','high'].includes(input?.minimumRelevance))p.minimumRelevance=input.minimumRelevance;return p;};
 const limits=freeze({settleMs:1500,daily:3,cooldownMs:45*60*1000,proposalMs:10*60*1000,retentionMs:30*86400000,maxSeen:100,maxFingerprints:80,maxDiagnostics:60,maxBytes:80000});
 const allowed=freeze(['read_indicators','read_memory','analyze_local','prepare_proposal','record_receipt','open_work_query']);
 function permission(action,{gesture=false,valid=false}={}){return allowed.includes(action)&&(action!=='open_work_query'||gesture&&valid);}
 function gesture(event,id,type='click'){const el=document.getElementById(id);return !!(typeof window.Event==='function'&&event instanceof window.Event&&event.isTrusted===true&&event.type===type&&el?.isConnected&&!el.disabled&&event.currentTarget===el);}
 function memoryPreferences(){try{return window.AuroraMemory?.getContext({period:'events',audience:'observa'}).preferences||{};}catch(_){return {};}}
 function communication(l,category){const p=memoryPreferences();if(p.intensity==='quiet'||p.maxObservationsPerDay===0||p.mutedCategories?.includes(category))return 'MEMORY_PREFERENCE';const cap=Math.min(limits.daily,Number.isInteger(p.maxObservationsPerDay)?p.maxObservationsPerDay:limits.daily),x=l.autonomy;if(x.presentDay===today()&&x.presentCount>=cap)return 'DAILY_LIMIT';if(x.lastPresentedAt&&Date.now()-x.lastPresentedAt<limits.cooldownMs)return 'COOLDOWN';return null;}
 function generation(l,legacy=false){if(!legacy&&!l.autonomy.preferences.generative)return 'GENERATION_NOT_AUTHORIZED';if(l.day===today()&&l.count>=limits.daily)return 'DAILY_LIMIT';if(l.lastAt&&Date.now()-l.lastAt<limits.cooldownMs)return 'COOLDOWN';if(!window.AuroraIntegrationAI?.available?.())return 'PROVIDER_UNAVAILABLE';return null;}
 const recent=[],counters={evaluations:0,baseline:0,silent:0,presented:0,generated:0,fallback:0,cancelled:0,proposed:0,executed:0,blocked:0,grouped:0,failures:0};
 function log(reason,details={}){const item={at:Date.now(),reason};for(const k of ['event','evidence','context','category','relevance','source','decision','permission','validity'])if(typeof details[k]==='string'&&/^[a-zA-Z0-9:_-]{1,90}$/.test(details[k]))item[k]=details[k];recent.push(item);while(recent.length>limits.maxDiagnostics)recent.shift();}
 A.U={freeze,copy,hash,today,date};A.Policy={defaults,preferences,limits,allowed,permission,gesture,communication,generation};A.D={log,counters,recent};
})();
