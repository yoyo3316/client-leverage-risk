const assert=require('node:assert/strict'),E=require('./dist/engine.js'),{events}=require('./dist/history.js');
assert.deepEqual(events.map(e=>e.dropPercent),[56,28.72,31.63]);
for(const e of events){assert.ok(e.from<e.to);assert.equal(e.dropPercent,Number(((1-e.trough/e.peak)*100).toFixed(2)));}
const pool={name:'QA',type:'融資',value:300,debt:180,trigger:999,target:1};
const liquid={cash:100,other:200,debtOther:0,pools:[pool]};
const r=E.calculate(liquid,.2872);assert.equal(r.pools[0].trigger,130);assert.equal(r.pools[0].target,166);assert.equal(r.breached,1);assert.equal(r.cashGap,0);assert.equal(E.verdict(r).label,'現金足以補款');
assert.equal(E.verdict(E.calculate({...liquid,cash:0},.2872)).label,'現金不足');
assert.equal(E.verdict(E.calculate({cash:0,other:100,debtOther:0,pools:[]},.56)).label,'未觸發追繳');
assert.equal(E.verdict(E.calculate({cash:0,other:0,debtOther:0,pools:[]})).label,'未觸發追繳');
assert.equal(E.verdict(E.calculate({cash:0,other:100,debtOther:200,pools:[]})).label,'淨資產非正');
const family=[{name:'媽媽',data:{cash:1000,other:0,debtOther:0,pools:[]}},{name:'小孩',data:{cash:0,other:0,debtOther:0,pools:[pool]}}];
for(const event of events){const t=E.family(family,event.dropPercent/100);assert.ok(t.equity>0);assert.ok(t.cashGap>0);assert.equal(E.verdict(t).label,'現金不足');assert.equal(t.cashGap,t.members[1].result.cashGap);}
console.log('Passed: sourced event drawdowns, fixed thresholds, cash sufficiency, empty portfolios, financed non-positive equity, family cash isolation.');
