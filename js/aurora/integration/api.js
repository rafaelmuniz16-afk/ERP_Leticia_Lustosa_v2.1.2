(() => {
  'use strict';const I=window.__auroraIntegrationParts;delete window.__auroraIntegrationParts;
  if(!I?.N||!I.Adapters||!I.V)return;
  window.AuroraIntegration=Object.freeze({...I.Adapters,generate:I.N.generate,prompt:I.N.prompt,schema:I.N.schema,payload:I.N.payload,validate:I.V.validate,inspect:I.V.inspect,local:I.N.local,getStatus:I.N.getStatus,isCurrent:I.R.current,focus:I.R.focus});
})();
