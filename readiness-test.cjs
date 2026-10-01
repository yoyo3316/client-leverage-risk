const assert=require('node:assert/strict');const E=require('./dist/engine.js');
const s={cash:0,other:100,debtOther:0,pools:[{name:'QA',type:'質押',value:100,debt:80,cash:0,other:100}]};
let r=E.readiness(s,.3);assert.equal(r.label,'現金不足，需現股抵繳');assert.ok(r.original.cashGap>0);assert.equal(r.stocks.cashGap,0);assert.equal(r.stocks.breached,0);
assert.deepEqual(E.readiness({...s,usePledge:true},.3),r);assert.equal(r.original.equity,r.stocks.equity);
const b={cash:10,other:10,debtOther:0,pools:[{name:'QA',type:'質押',value:150,debt:100,cash:10,other:10}]};r=E.readiness(b,.3);assert.equal(r.label,'現金＋現股仍不足');assert.ok(r.stocks.cashGap>0);assert.equal(r.tone,'danger');
r=E.readiness({...b,cash:100,pools:[{...b.pools[0],cash:100}]},.3);assert.equal(r.label,'現金即可補足');assert.equal(r.stocks.cashGap,0);
assert.equal(E.readiness({...s,pools:[{...s.pools[0],debt:50}]},0).label,'原部位可承受');
console.log('Passed: before/after stock support and pooled cash outcomes, no checkbox dependency, no asset double counting.');
