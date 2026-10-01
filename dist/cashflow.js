(function(root){
const monthPattern=/^\d{4}-(0[1-9]|1[0-2])$/;
function monthIndex(v){if(!monthPattern.test(v))throw Error('月份格式需為 YYYY-MM');const [y,m]=v.split('-').map(Number);return y*12+m-1;}
function monthAt(n){return String(Math.floor(n/12)).padStart(4,'0')+'-'+String(n%12+1).padStart(2,'0');}
function amount(v){if(!Number.isFinite(v)||v<0||v>1e12)throw Error('現金規劃金額需為有效非負數');return v;}
function normalize(raw={}){const out={startMonth:raw.startMonth??new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Taipei'}).slice(0,7),monthlyIncome:amount(raw.monthlyIncome??0),monthlyExpense:amount(raw.monthlyExpense??0),reserve:amount(raw.reserve??0),includePrincipal:raw.includePrincipal!==false};monthIndex(out.startMonth);if(!Array.isArray(raw.events??[])||(raw.events??[]).length>100)throw Error('單次收支最多100筆');out.events=(raw.events??[]).map(e=>{if(typeof e.name!=='string'||e.name.length>80)throw Error('收支名稱最多80字');monthIndex(e.month);if(!['income','expense'].includes(e.kind))throw Error('收支類型不正確');return {name:e.name,month:e.month,kind:e.kind,amount:amount(e.amount)};});return out;}
function calculate(s,raw={}){
 const plan=normalize(raw),start=monthIndex(plan.startMonth),debts=s.pools.map(p=>p.pledgeDebt??0),missing=[];
 s.pools.forEach(p=>{for(const k of ['pledgeRate','marginRate'])if(p[k]!==undefined&&(!Number.isFinite(p[k])||p[k]<0||p[k]>100))throw Error('年利率需介於0至100%');if(p.pledgeDebt>0){if(p.pledgeRate===undefined)missing.push(p.name+' 質押利率');if(!p.renewalMonth)missing.push(p.name+' 展延月份');}if(p.marginDebt>0&&p.marginRate===undefined)missing.push(p.name+' 融資利率');});
 let balance=s.cash;const rows=Array.from({length:12},(_,i)=>{const month=monthAt(start+i);let pledgeInterest=0,marginInterest=0,principal=0;const items=[];
 s.pools.forEach((p,j)=>{if(p.marginDebt>0&&p.marginRate!==undefined){amount(p.marginRate);marginInterest+=p.marginDebt*p.marginRate/100/12;}if(p.pledgeDebt>0&&p.renewalMonth){const delta=start+i-monthIndex(p.renewalMonth);if(delta>=0&&delta%6===0){const interest=p.pledgeRate===undefined?0:debts[j]*amount(p.pledgeRate)/100/2;pledgeInterest+=interest;const repay=plan.includePrincipal?Math.max(0,debts[j]-(p.pledgeValue??0)/1.66):0;principal+=repay;debts[j]-=repay;items.push(p.name+' 展延');}}});
 const events=plan.events.filter(e=>e.month===month),extraIncome=events.filter(e=>e.kind==='income').reduce((n,e)=>n+e.amount,0),extraExpense=events.filter(e=>e.kind==='expense').reduce((n,e)=>n+e.amount,0),income=plan.monthlyIncome+extraIncome,expense=plan.monthlyExpense+extraExpense+pledgeInterest+marginInterest+principal;balance+=income-expense;
 return {month,income,living:plan.monthlyExpense+extraExpense,pledgeInterest,marginInterest,principal,expense,net:income-expense,balance,shortfall:Math.max(0,plan.reserve-balance),items:[...items,...events.map(e=>e.name)]};});
 const total=k=>rows.reduce((n,r)=>n+r[k],0),minBalance=Math.min(s.cash,...rows.map(r=>r.balance)),first=rows.find(r=>r.balance<plan.reserve);return {plan,rows,missing,totalIncome:total('income'),totalExpense:total('expense'),interest:total('pledgeInterest')+total('marginInterest'),principal:total('principal'),endBalance:balance,minBalance,needed:Math.max(0,plan.reserve-minBalance),firstShortfall:first?.month??null};
}
root.RiskCashflow={normalize,calculate,monthIndex,monthAt};if(typeof module!=='undefined')module.exports=root.RiskCashflow;
})(globalThis);
