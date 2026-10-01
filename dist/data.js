(function(root){
function normalize(raw){
 if(!raw||typeof raw!=='object')throw Error('資料格式不正確');
 const source=raw.version===2?raw.members:[{name:'客戶',data:raw}];
 if(!Array.isArray(source)||source.length<1||source.length>30)throw Error('成員需介於1至30位');
 const members=source.map(m=>{
  if(!m||typeof m.name!=='string'||m.name.length>60)throw Error('成員名稱最多60字');
  root.RiskEngine.validate(m.data);
  return {name:m.name,...(m.planning?{planning:root.RiskPlanning.normalize(m.planning)}:{}),data:{cash:m.data.cash,other:m.data.other,debtOther:m.data.debtOther,...(m.data.usePledge!==undefined?{usePledge:!!m.data.usePledge}:{}),pools:m.data.pools.map(p=>{
   if(p.name.length>120)throw Error('帳戶名稱最多120字');
   if(p.pledgeRate!==undefined&&(!Number.isFinite(p.pledgeRate)||p.pledgeRate<0||p.pledgeRate>100))throw Error('質押年利率需介於0至100%');
   return {...(p.pledgeRate!==undefined?{pledgeRate:p.pledgeRate}:{}),name:p.name,type:p.type,value:p.value,debt:p.debt,...(p.pledgeValue!==undefined?{pledgeValue:p.pledgeValue,pledgeDebt:p.pledgeDebt,marginValue:p.marginValue,marginDebt:p.marginDebt,legacyCombined:!!p.legacyCombined}:{}),...(p.cash!==undefined?{cash:p.cash,other:p.other,usePledge:!!p.usePledge}:{}),trigger:130,target:166,...(p.pledge!==undefined?{pledge:p.pledge}:{})};
  })}};
 });
 const result={version:2,date:/^\d{4}-\d{2}-\d{2}$/.test(raw.date)?raw.date:'',mode:raw.mode==='示範'?'示範':'使用者輸入',drop:Number.isFinite(raw.drop)&&raw.drop>=0&&raw.drop<=60?raw.drop:20,members};
 if(new TextEncoder().encode(JSON.stringify(result)).length>1e6)throw Error('資料需小於1MB');
 return result;
}
function consolidate(s){
 root.RiskEngine.validate(s);
 const value=s.pools.reduce((n,p)=>n+p.value,0),debt=s.debtOther+s.pools.reduce((n,p)=>n+p.debt,0);
 return {cash:s.cash,other:s.other,debtOther:0,usePledge:!!s.usePledge,pools:[{name:'合計部位',type:'質押',value,debt,pledge:s.other}]};
}
function accounts(s){
 const pools=s.pools.length?s.pools:[{name:'待分配／原合計',type:'質押',value:0,debt:0}];
 const modern=pools.every(p=>p.cash!==undefined);
 const result={...s,pools:pools.map((p,i)=>({...p,cash:modern?p.cash:(i===0?s.cash:0),other:modern?p.other:(i===0?s.other:0),usePledge:modern?!!p.usePledge:!!s.usePledge,pledge:0,debt:p.debt+(!modern&&i===0?s.debtOther:0)})),debtOther:0};
 return sync(result);
}
function sync(s){s.pools.forEach(p=>{
 if(p.pledgeValue===undefined){const margin=p.type==='融資';p.pledgeValue=margin?0:p.value;p.pledgeDebt=margin?0:p.debt;p.marginValue=margin?p.value:0;p.marginDebt=margin?p.debt:0;p.legacyCombined=!!(p.cash!==undefined&&p.type==='質押'&&(p.value||p.debt));}
 p.value=p.pledgeValue+p.marginValue;p.debt=p.pledgeDebt+p.marginDebt;
 });s.cash=s.pools.reduce((n,p)=>n+p.cash,0);s.other=s.pools.reduce((n,p)=>n+p.other,0);s.pools.forEach(p=>p.pledge=p.usePledge?p.other:0);s.usePledge=true;return s;}
function scope(s,index){if(index<0)return s;const p=s.pools[index];return {cash:p.cash,other:p.other,debtOther:0,usePledge:!!p.usePledge,pools:[{...p,pledge:p.other}]};}
root.RiskData={normalize,consolidate,accounts,sync,scope};if(typeof module!=='undefined')module.exports=root.RiskData;
})(typeof globalThis!=='undefined'?globalThis:this);
