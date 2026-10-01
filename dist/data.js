(function(root){
function normalize(raw){
 if(!raw||typeof raw!=='object')throw Error('資料格式不正確');
 const source=raw.version===2?raw.members:[{name:'客戶',data:raw}];
 if(!Array.isArray(source)||source.length<1||source.length>30)throw Error('成員需介於1至30位');
 const members=source.map(m=>{
  if(!m||typeof m.name!=='string'||m.name.length>60)throw Error('成員名稱最多60字');
  root.RiskEngine.validate(m.data);
  return {name:m.name,data:{cash:m.data.cash,other:m.data.other,debtOther:m.data.debtOther,...(m.data.usePledge!==undefined?{usePledge:!!m.data.usePledge}:{}),pools:m.data.pools.map(p=>{
   if(p.name.length>120)throw Error('帳戶名稱最多120字');
   return {name:p.name,type:p.type,value:p.value,debt:p.debt,trigger:130,target:166,...(p.pledge!==undefined?{pledge:p.pledge}:{})};
  })}};
 });
 const result={version:2,date:/^\d{4}-\d{2}-\d{2}$/.test(raw.date)?raw.date:'',mode:raw.mode==='示範'?'示範':'使用者輸入',drop:Number.isFinite(raw.drop)&&raw.drop>=0&&raw.drop<=60?raw.drop:20,members};
 if(new TextEncoder().encode(JSON.stringify(result)).length>1e6)throw Error('資料需小於1MB');
 return result;
}
root.RiskData={normalize};if(typeof module!=='undefined')module.exports=root.RiskData;
})(typeof globalThis!=='undefined'?globalThis:this);
