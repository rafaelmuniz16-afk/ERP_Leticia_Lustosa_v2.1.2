(() => {
  'use strict';
  const A = window.__auroraAnalyticsParts, S = A.S;
  const median = values => { const a = [...values].sort((a,b) => a-b), m = a.length >>> 1; return a.length % 2 ? a[m] : (a[m-1]+a[m])/2; };
  function classify(values, sufficient) {
    if (!sufficient) return { classification: 'insufficient_history', method: 'minimum_four_windows_and_thirty_records' };
    const n = values.length, mean = values.reduce((a,b) => a+b,0)/n, amplitude = Math.max(...values)-Math.min(...values);
    if (!mean || amplitude <= mean * .2) return { classification: 'stable', relativeChange: 0, method: 'range_at_most_twenty_percent_of_mean' };
    const prior = values.slice(0,-1), pm = median(prior);
    if (pm > 0 && Math.max(...prior)-Math.min(...prior) <= pm*.2 && Math.abs(values.at(-1)-pm) >= pm*.5) return { classification: 'abrupt_change', relativeChange: (values.at(-1)/pm-1)*100, method: 'last_window_fifty_percent_vs_stable_prior_median' };
    for (let i=1;i<n-2;i++) { const others=values.filter((_,j)=>i!==j), m=median(others); if(m>0 && Math.max(...others)-Math.min(...others)<=m*.2 && Math.abs(values[i]-m)>=m*.5) return { classification:'isolated_oscillation', at:i, relativeChange:(values[i]/m-1)*100, method:'interior_outlier_with_two_following_windows' }; }
    const xmean=(n-1)/2; let numerator=0,denominator=0;
    values.forEach((v,i)=>{numerator+=(i-xmean)*(v-mean);denominator+=(i-xmean)**2});
    const slope=numerator/denominator, relativeChange=slope*(n-1)/mean*100;
    const consistent=values.slice(1).filter((v,i)=>slope>=0?v>=values[i]:v<=values[i]).length;
    if(Math.abs(relativeChange)>=20 && consistent>=Math.ceil((n-1)*.75)) return { classification:slope>0?'gradual_growth':'gradual_decline', relativeChange, method:'linear_slope_twenty_percent_with_seventy_five_percent_directional_steps' };
    return { classification:'oscillation',relativeChange,method:'no_persistent_direction' };
  }
  function build(idx,p,snapshot) {
    let end=p.end===snapshot.today?S.shift(p.end,-1):p.end;
    if(p.trendUnit==='week') { const sunday=S.shift(S.monday(end),6); if(end!==sunday) end=S.shift(S.monday(end),-1); }
    if(p.trendUnit==='month' && end!==S.monthEnd(end)) end=S.shift(end.slice(0,7)+'-01',-1);
    const windows=[];
    for(let i=0;i<6;i++) { const start=p.trendUnit==='week'?S.shift(end,-6):p.trendUnit==='month'?end.slice(0,7)+'-01':end; if(snapshot.firstDate && start>=snapshot.firstDate) windows.unshift({start,end,metrics:idx({start,end})}); end=S.shift(start,-1); }
    const sufficient=windows.length>=4 && windows.filter(w=>w.metrics.registered>=5).length>=4 && windows.reduce((n,w)=>n+w.metrics.registered,0)>=30;
    const metrics={}; for(const k of ['registered','confirmed','refused',...S.types]) {
      const raw=windows.map(w=>S.types.includes(k)?w.metrics.types[k]:w.metrics[k]), values=raw.map((v,i)=>p.trendUnit==='month'?v/windows[i].metrics.days:v);
      let result=classify(values,sufficient);
      if(k==='refused' && raw.reduce((a,b)=>a+b,0)<6 && result.classification!=='stable') result={classification:'insufficient_history',method:'minimum_six_refusals_for_direction'};
      metrics[k]={...result,values,quality:A.M.quality(snapshot,windows.reduce((n,w)=>n+w.metrics.registered,0))};
    }
    return {unit:p.trendUnit,normalization:p.trendUnit==='month'?'per_calendar_day':'count',windows,metrics,limitations:['six_closed_calendar_windows_maximum','descriptive_not_statistical_significance','coverage_not_proof_of_external_completeness']};
  }
  A.T={build};
})();
