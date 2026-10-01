(function(root){
function calculate(s,drop=0){
 const cash=Number(s.cash),other=Number(s.other),debtOther=Number(s.debtOther);
 const allocated=s.usePledge?s.pools.reduce((n,p)=>n+(p.pledge||0),0):0;
 const pools=s.pools.map(p=>{const base=p.value+(s.usePledge?(p.pledge||0):0);const value=base*(1-drop),collateral=value;const ratio=p.debt>0?collateral/p.debt*100:null;const trigger=1.3,target=1.66;return {...p,trigger:130,target:166,value,collateral,ratio,buffer:p.debt>0?(base-trigger*p.debt)/base:null,breach:p.debt>0&&collateral<trigger*p.debt,add:Math.max(0,target*p.debt-collateral),repay:Math.max(0,p.debt-collateral/target)};});
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
 let lo=0,hi=1;
 const passes=d=>{const r=calculate(extra,d);return r.cashGap<=1e-8&&r.equity>=-1e-8;};
 if(passes(0)){for(let i=0;i<60;i++){const mid=(lo+hi)/2;if(passes(mid))lo=mid;else hi=mid;}}
 const equityLimit=now.stock>0?Math.max(0,Math.min(1,now.equity/now.stock)):1;
 return {current:first(base),stocks:first(extra),cash:lo,equityLimit,leverage:now.leverage,cashAmount:s.cash,stockAmount:s.other};
}
function readiness(s,drop){
 const staged=on=>({...s,usePledge:on,pools:s.pools.map(p=>({...p,pledge:p.other??p.pledge??0}))});
 const original=calculate(staged(false),drop),stocks=calculate(staged(true),drop),present=calculate(staged(false));
 let label,tone;
 if(stocks.equity<=0&&stocks.debt>0){label='淨資產非正';tone='danger';}
 else if(!original.breached){label='原部位可承受';tone='safe';}
 else if(!stocks.breached){label='追加現股後足夠';tone='warning';}
 else if(stocks.cashGap<=1e-8){label='現股＋現金可支援';tone='warning';}
 else{label='現股＋現金仍不足';tone='danger';}
 return {original,stocks,present,label,tone,capacity:capacity(s)};
}
root.RiskEngine={calculate,validate,family,verdict,capacity,readiness};if(typeof module!=='undefined')module.exports=root.RiskEngine;
})(typeof window!=='undefined'?window:globalThis);
