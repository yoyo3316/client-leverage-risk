(function(root){

function conservativePool(p,drop,enabled,planning=false){
 const rows=[{type:'質押',value:p.pledgeValue,debt:p.pledgeDebt,threshold:planning?1.66:1.3},{type:'融資',value:p.marginValue,debt:p.marginDebt,threshold:1.3}].filter(x=>x.value||x.debt);
 const extra=enabled?(p.pledge||0):0,factor=1-drop;
 const needed=d=>rows.reduce((n,x)=>n+(x.debt>0?Math.max(0,x.threshold*x.debt/(1-d)-x.value):0),0);
 const hasDebt=rows.some(x=>x.debt>0);let lo=0,hi=1;
 if(hasDebt&&needed(0)<=extra){for(let i=0;i<60;i++){const mid=(lo+hi)/2;if(needed(mid)<=extra)lo=mid;else hi=mid;}}
 // Same-broker free stock is allocated where it reduces required cash most.
 let available=extra*factor;
 const components=rows.map(x=>({...x,collateral:x.value*factor,stockAdded:0}));
 for(const x of [...components].sort((a,b)=>a.threshold-b.threshold)){
  const use=Math.min(available,Math.max(0,x.threshold*x.debt-x.collateral));x.collateral+=use;x.stockAdded=use;available-=use;
 }
 if(available>1e-8){
  const funded=components.filter(x=>x.debt>0),weight=funded.reduce((n,x)=>n+x.threshold*x.debt,0);
  if(weight>0){let low=1,high=Math.max(1,(funded.reduce((n,x)=>n+x.collateral,0)+available)/weight);
   for(let i=0;i<60;i++){const mid=(low+high)/2,need=funded.reduce((n,x)=>n+Math.max(0,mid*x.threshold*x.debt-x.collateral),0);if(need<=available)low=mid;else high=mid;}
   for(const x of funded){const use=Math.max(0,low*x.threshold*x.debt-x.collateral);x.collateral+=use;x.stockAdded+=use;}
  }
 }
 for(const x of components){x.ratio=x.debt>0?x.collateral/x.debt*100:null;x.breach=x.debt>0&&x.collateral+1e-8<x.threshold*x.debt;x.repay=Math.max(0,x.debt-x.collateral/x.threshold);}
 const value=(p.value+extra)*factor;
 return {...p,value,collateral:value,ratio:p.debt>0?value/p.debt*100:null,trigger:rows.filter(x=>x.debt>0).map(x=>x.threshold*100).join('/'),target:null,buffer:hasDebt?lo:null,breach:components.some(x=>x.breach),add:components.reduce((n,x)=>n+Math.max(0,x.threshold*x.debt-x.collateral),0),repay:components.reduce((n,x)=>n+x.repay,0),components};
}

function calculate(s,drop=0,planning=true){
 const cash=Number(s.cash),other=Number(s.other),debtOther=Number(s.debtOther);
 const allocated=s.usePledge?s.pools.reduce((n,p)=>n+(p.pledge||0),0):0;
 const legacyPool=p=>{const base=p.value+(s.usePledge?(p.pledge||0):0);const value=base*(1-drop),collateral=value;const ratio=p.debt>0?collateral/p.debt*100:null;const trigger=1.3,target=1.66;return {...p,trigger:130,target:166,value,collateral,ratio,buffer:p.debt>0?(base-trigger*p.debt)/base:null,breach:p.debt>0&&collateral<trigger*p.debt,add:Math.max(0,target*p.debt-collateral),repay:Math.max(0,p.debt-collateral/target)};};
 const pools=s.pools.map(p=>p.pledgeValue!==undefined?conservativePool(p,drop,s.usePledge,planning):legacyPool(p));
 const stock=pools.reduce((a,p)=>a+p.value,0)+(other-allocated)*(1-drop),debt=pools.reduce((a,p)=>a+p.debt,0)+debtOther,assets=stock+cash,equity=assets-debt;
 const breached=pools.filter(p=>p.breach),repay=breached.reduce((a,p)=>a+p.repay,0),add=breached.reduce((a,p)=>a+p.add,0);
 return {pools,stock,debt,assets,equity,leverage:equity>0?stock/equity:null,ltv:assets>0?debt/assets*100:null,repay,add,cashGap:Math.max(0,repay-cash),breached:breached.length};
}
function validate(s){if(!s||!Array.isArray(s.pools)||s.pools.length>100)throw Error('帳戶資料格式不正確');for(const key of ['cash','other','debtOther'])if(!Number.isFinite(s[key])||s[key]<0)throw Error('金額需為非負數');for(const p of s.pools){if(typeof p.name!=='string'||!['融資','質押'].includes(p.type))throw Error('帳戶名稱／種類不正確');if(p.pledgeValue!==undefined)for(const key of ['pledgeValue','pledgeDebt','marginValue','marginDebt'])if(!Number.isFinite(p[key])||p[key]<0)throw Error('質押與融資金額需為非負數');for(const key of (p.cash!==undefined?['value','debt','cash','other']:['value','debt']))if(!Number.isFinite(p[key])||p[key]<0)throw Error('帳戶金額與門檻需為非負數');}for(const p of s.pools)if(p.pledge!==undefined&&(!Number.isFinite(p.pledge)||p.pledge<0))throw Error('追加擔保需為非負數');if(s.pools.reduce((n,p)=>n+(p.pledge||0),0)>s.other+1e-8)throw Error('追加股票合計不可超過這位成員的未設質現股');return s;}
function family(members,drop=0){
 const rows=members.map(m=>({name:m.name,result:calculate(m.data,drop)}));
 const total={members:rows};for(const k of ['stock','debt','assets','equity','repay','add','cashGap','breached'])total[k]=rows.reduce((sum,m)=>sum+m.result[k],0);
 total.leverage=total.equity>0?total.stock/total.equity:null;return total;
}
function verdict(r){const negative=Array.isArray(r.members)?r.members.some(m=>m.result.equity<=0&&m.result.debt>0):r.equity<=0&&r.debt>0;return r.cashGap>0?{tone:'danger',label:'現金不足'}:negative?{tone:'danger',label:'淨資產非正'}:r.breached?{tone:'warning',label:'現金足以補款'}:{tone:'safe',label:'未觸發追繳'};}
function capacity(s){
 const set=on=>({...s,usePledge:on,pools:s.pools.map(p=>({...p,pledge:p.other??p.pledge??0}))});
 const first=t=>{const ps=calculate(t).pools.filter(p=>p.debt>0);return ps.length?Math.max(0,Math.min(...ps.map(p=>p.value>0?p.buffer:0))):null;};
 const base=set(false),extra=set(true),now=calculate(base);
 const limit=t=>{let lo=0,hi=1;const passes=d=>{const r=calculate(t,d,true);return r.cashGap<=1e-8&&r.equity>=-1e-8;};if(passes(0)){for(let i=0;i<60;i++){const mid=(lo+hi)/2;if(passes(mid))lo=mid;else hi=mid;}}return lo;};
 const cashOnly=limit(base),lo=limit(extra);
 const equityLimit=now.stock>0?Math.max(0,Math.min(1,now.equity/now.stock)):1;
 return {current:first(base),stocks:first(extra),cash:lo,cashOnly,equityLimit,leverage:now.leverage,cashAmount:s.cash,stockAmount:s.other};
}
function readiness(s,drop){
 const staged=on=>({...s,usePledge:on,pools:s.pools.map(p=>({...p,pledge:p.other??p.pledge??0}))});
 const original=calculate(staged(false),drop),stocks=calculate(staged(true),drop),present=calculate(staged(false)),support=calculate(staged(true),drop,true);
 let label,tone;
 if(support.equity<=0&&support.debt>0){label='淨資產非正';tone='danger';}
 else if(!original.breached){label='原部位可承受';tone='safe';}
 else if(original.cashGap<=1e-8){label='現金即可補足';tone='warning';}
 else if(support.cashGap<=1e-8){label='現金不足，需現股抵繳';tone='warning';}
 else{label='現金＋現股仍不足';tone='danger';}

 return {original,stocks,support,present,cashUsed:Math.min(s.cash,original.repay),afterCashGap:original.cashGap,needsStock:original.cashGap>1e-8,label,tone,capacity:capacity(s)};
}
root.RiskEngine={calculate,validate,family,verdict,capacity,readiness};if(typeof module!=='undefined')module.exports=root.RiskEngine;
})(typeof window!=='undefined'?window:globalThis);
