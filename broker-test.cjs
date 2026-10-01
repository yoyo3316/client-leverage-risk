const assert=require('node:assert/strict');global.RiskEngine=require('./dist/engine.js');const D=require('./dist/data.js');
const s=D.accounts({cash:100,other:50,debtOther:20,pools:[{name:'A',type:'質押',value:100,debt:100},{name:'B',type:'融資',value:1000,debt:100}]});
assert.equal(s.pools.length,2);assert.equal(s.pools[0].debt,120);assert.equal(s.cash,100);assert.equal(s.other,50);
const r=RiskEngine.calculate(s,.2);assert.equal(r.breached,1);assert.equal(r.repay,120-80/1.3);assert.equal(RiskEngine.calculate(s,.2,true).repay,120-80/1.66);
s.pools[0].cash=0;s.pools[1].cash=100;D.sync(s);assert.equal(RiskEngine.calculate(s,.2).cashGap,0);
const equity=RiskEngine.calculate(s).equity;s.pools[0].usePledge=true;D.sync(s);assert.equal(RiskEngine.calculate(s).equity,equity);
const saved=D.normalize({version:2,members:[{name:'QA',data:s}]});assert.deepEqual(RiskEngine.calculate(D.accounts(saved.members[0].data)),RiskEngine.calculate(D.normalize({version:2,members:[{name:"QA",data:s}]}).members[0].data));
assert.equal(D.scope(s,1).cash,100);assert.equal(D.scope(s,1).pools.length,1);
assert.equal(RiskEngine.calculate(D.scope(s,0)).equity+RiskEngine.calculate(D.scope(s,1)).equity,equity);
s.pools[0].marginValue=200;s.pools[0].marginDebt=50;D.sync(s);assert.equal(s.pools[0].value,300);assert.equal(s.pools[0].debt,170);
console.log('Passed: broker migration, same-member cash pooling, scoped views, pledge without double counting and cloud round-trip.');

const members=[{name:"A",data:s},{name:"B",data:D.accounts({cash:0,other:0,debtOther:0,pools:[{name:"B",type:"質押",value:10,debt:100}]})}];assert.ok(RiskEngine.family(members,.2).cashGap>0);
