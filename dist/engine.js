(function(root){
function calculate(s,drop=0){
 const cash=Number(s.cash),other=Number(s.other),debtOther=Number(s.debtOther);
 const pools=s.pools.map(p=>{const value=p.value*(1-drop),collateral=p.value*(1-drop);const ratio=p.debt>0?collateral/p.debt*100:null;const trigger=1.3,target=1.66;return {...p,trigger:130,target:166,value,collateral,ratio,buffer:p.debt>0?(p.value-trigger*p.debt)/p.value:null,breach:p.debt>0&&collateral<trigger*p.debt,add:Math.max(0,target*p.debt-collateral),repay:Math.max(0,p.debt-collateral/target)};});
 const stock=pools.reduce((a,p)=>a+p.value,0)+other*(1-drop),debt=pools.reduce((a,p)=>a+p.debt,0)+debtOther,assets=stock+cash,equity=assets-debt;
 const breached=pools.filter(p=>p.breach),repay=breached.reduce((a,p)=>a+p.repay,0),add=breached.reduce((a,p)=>a+p.add,0);
 return {pools,stock,debt,assets,equity,leverage:equity>0?stock/equity:null,ltv:assets>0?debt/assets*100:null,repay,add,cashGap:Math.max(0,repay-cash),breached:breached.length};
}
function validate(s){if(!s||!Array.isArray(s.pools)||s.pools.length>100)throw Error('帳戶資料格式不正確');for(const key of ['cash','other','debtOther'])if(!Number.isFinite(s[key])||s[key]<0)throw Error('金額需為非負數');for(const p of s.pools){if(typeof p.name!=='string'||!['融資','質押'].includes(p.type))throw Error('帳戶名稱／種類不正確');for(const key of ['value','debt'])if(!Number.isFinite(p[key])||p[key]<0)throw Error('帳戶金額與門檻需為非負數');}return s;}
function family(members,drop=0){
 const rows=members.map(m=>({name:m.name,result:calculate(m.data,drop)}));
 const total={members:rows};for(const k of ['stock','debt','assets','equity','repay','add','cashGap','breached'])total[k]=rows.reduce((sum,m)=>sum+m.result[k],0);
 total.leverage=total.equity>0?total.stock/total.equity:null;return total;
}
function verdict(r){const negative=Array.isArray(r.members)?r.members.some(m=>m.result.equity<=0&&m.result.debt>0):r.equity<=0&&r.debt>0;return r.cashGap>0?{tone:'danger',label:'現金不足'}:negative?{tone:'danger',label:'淨資產非正'}:r.breached?{tone:'warning',label:'現金足以補款'}:{tone:'safe',label:'未觸發追繳'};}
root.RiskEngine={calculate,validate,family,verdict};if(typeof module!=='undefined')module.exports=root.RiskEngine;
})(typeof window!=='undefined'?window:globalThis);
