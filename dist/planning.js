(function(root){
const fields={exposure:['borrow','buy','repay','drop'],estate:['otherAssets','gifts','otherDebt','children','minorYears','parents','disability','otherDeductions','credits']};
function normalize(raw={}){const out={};for(const [group,keys] of Object.entries(fields)){out[group]={};for(const k of keys){const v=raw[group]?.[k]??0;if(!Number.isFinite(v)||v<0||v>1e12)throw Error('規劃資料需為有效非負數');if(['children','minorYears','parents','disability'].includes(k)&&!Number.isInteger(v))throw Error('人數與年數需為整數');out[group][k]=v;} }if(out.exposure.drop>100||out.estate.parents>2)throw Error('規劃資料超過有效範圍');out.exposure.broker=raw.exposure?.broker??0;if(!Number.isInteger(out.exposure.broker)||out.exposure.broker<0||out.exposure.broker>=100)throw Error("請選有效券商");out.exposure.loanType=raw.exposure?.loanType==='margin'?'margin':'pledge';out.exposure.buyType=['pledge','margin'].includes(raw.exposure?.buyType)?raw.exposure.buyType:'other';if(raw.cashflow)out.cashflow=root.RiskCashflow.normalize(raw.cashflow);out.estate.spouse=!!raw.estate?.spouse;out.estate.provenDebt=raw.estate?.provenDebt!==false;return out;}
function interest(p){const rate=p.pledgeRate;return rate===undefined||rate===null||rate===''?null:p.pledgeDebt*rate/100/2;}
function exposure(s,x){const stock=s.other+s.pools.reduce((n,p)=>n+p.value,0),debt=s.debtOther+s.pools.reduce((n,p)=>n+p.debt,0);const cash=s.cash+x.borrow-x.buy-x.repay,D=debt+x.borrow-x.repay,S=stock+x.buy,equity=S+cash-D;if(cash<0||D<0)throw Error('買股／還款超過可用現金或借款');const stressed=S*(1-x.drop/100)+cash-D;return {stock:S,cash,debt:D,equity,leverage:equity>0?S/equity:null,stressed,loss:S*x.drop/100};}
function exposurePortfolio(s,x){
 const totals=exposure(s,x),index=x.broker??0,loan=x.loanType==='margin'?'margin':'pledge',buy=x.buyType??'other';
 if(!s.pools[index])throw Error('請選有效券商');
 const pools=s.pools.map(p=>({...p})),p=pools[index];
 if(p.pledgeDebt===undefined)throw Error('請先核對質押／融資拆分');
 if(x.repay>p[loan+'Debt']+x.borrow)throw Error('還款超過所選券商的借款');
 p[loan+'Debt']+=x.borrow-x.repay;
 if(buy==='other')p.other=(p.other??0)+x.buy;else p[buy+'Value']+=x.buy;
 pools.forEach(p=>{p.value=p.pledgeValue+p.marginValue;p.debt=p.pledgeDebt+p.marginDebt;p.pledge=p.other??0;});
 const portfolio={...s,cash:totals.cash,other:s.other+(buy==='other'?x.buy:0),usePledge:false,pools};
 return {portfolio,capacity:root.RiskEngine.capacity(portfolio),readiness:root.RiskEngine.readiness(portfolio,x.drop/100)};
}
function estate(s,x){const gross=s.cash+s.other+s.pools.reduce((n,p)=>n+p.value,0)+x.otherAssets+x.gifts;const debt=(x.provenDebt?s.debtOther+s.pools.reduce((n,p)=>n+p.debt,0):0)+x.otherDebt;const deductions=debt+138+(x.spouse?553:0)+56*x.children+56*x.minorYears+138*x.parents+693*x.disability+x.otherDeductions;const taxable=Math.max(0,gross-1333-deductions),rate=taxable<=5621?.1:taxable<=11242?.15:.2,quick=taxable<=5621?0:taxable<=11242?281.05:843.15;return {gross,debt,deductions,taxable,rate,tax:Math.max(0,taxable*rate-quick-x.credits)};}
root.RiskPlanning={normalize,interest,exposure,exposurePortfolio,estate};if(typeof module!=='undefined')module.exports=root.RiskPlanning;
})(globalThis);
