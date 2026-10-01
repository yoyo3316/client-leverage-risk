(function(root){
function calculate(s,drop=0){
 const cash=Number(s.cash),other=Number(s.other),debtOther=Number(s.debtOther);
 const pools=s.pools.map(p=>{const value=p.value*(1-drop),collateral=p.collateral*(1-drop)+p.fixed;const ratio=p.debt>0?collateral/p.debt*100:null;const trigger=p.trigger/100,target=p.target/100;return {...p,value,collateral,ratio,buffer:p.debt>0?(p.collateral+p.fixed-trigger*p.debt)/p.collateral:null,breach:p.debt>0&&collateral<trigger*p.debt,add:Math.max(0,target*p.debt-collateral),repay:Math.max(0,p.debt-collateral/target)};});
 const stock=pools.reduce((a,p)=>a+p.value,0)+other*(1-drop),debt=pools.reduce((a,p)=>a+p.debt,0)+debtOther,assets=stock+cash,equity=assets-debt;
 const breached=pools.filter(p=>p.breach),repay=breached.reduce((a,p)=>a+p.repay,0),add=breached.reduce((a,p)=>a+p.add,0);
 return {pools,stock,debt,assets,equity,leverage:equity>0?stock/equity:null,ltv:assets>0?debt/assets*100:null,repay,add,cashGap:Math.max(0,repay-cash),breached:breached.length};
}
function validate(s){if(!s||!Array.isArray(s.pools)||s.pools.length>100)throw Error('帳戶資料格式不正確');for(const key of ['cash','other','debtOther'])if(!Number.isFinite(s[key])||s[key]<0)throw Error('金額需為非負數');for(const p of s.pools){if(typeof p.name!=='string'||!['融資','質押'].includes(p.type))throw Error('帳戶名稱／種類不正確');for(const key of ['value','collateral','fixed','debt','trigger','target'])if(!Number.isFinite(p[key])||p[key]<0)throw Error('帳戶金額與門檻需為非負數');if(p.trigger<=0||p.target<p.trigger||p.collateral>p.value)throw Error('回復目標不得低於追繳門檻；計值不得高於股票市值');}return s;}
function family(members,drop=0){
 const rows=members.map(m=>({name:m.name,result:calculate(m.data,drop)}));
 const total={members:rows};for(const k of ['stock','debt','assets','equity','repay','add','cashGap','breached'])total[k]=rows.reduce((sum,m)=>sum+m.result[k],0);
 total.leverage=total.equity>0?total.stock/total.equity:null;return total;
}
root.RiskEngine={calculate,validate,family};if(typeof module!=='undefined')module.exports=root.RiskEngine;
})(typeof window!=='undefined'?window:globalThis);
