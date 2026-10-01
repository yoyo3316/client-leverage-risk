const assert=require('node:assert/strict');const E=require('./dist/engine.js');
const s={cash:20,other:50,debtOther:0,usePledge:false,pools:[{name:'QA',type:'質押',value:100,debt:50,cash:20,other:50}]};
const c=E.capacity(s);assert.ok(Math.abs(c.current-.35)<1e-8);assert.ok(Math.abs(c.stocks-(1-65/150))<1e-8);assert.ok(Math.abs(c.cash-.668)<1e-7);
assert.equal(E.calculate({...s,usePledge:true,pools:[{...s.pools[0],pledge:50}]},c.cash-.00001).cashGap,0);assert.ok(E.calculate({...s,usePledge:true,pools:[{...s.pools[0],pledge:50}]},c.cash+.00001).cashGap>0);
assert.deepEqual(E.capacity({...s,usePledge:true}),c);assert.ok(E.capacity({...s,cash:100}).cash<=E.capacity({...s,cash:100}).equityLimit+1e-7);
assert.equal(E.capacity({cash:0,other:0,debtOther:0,pools:[{name:'zero',type:'質押',value:0,debt:10}]}).cash,0);
require('./dist/data.js');const S=require('./dist/summary.js');const modern=RiskData.accounts(s);const text=S.generate([{name:'QA',data:modern}],.2);assert.match(text,/目前不追加/);assert.match(text,/再動用現金/);assert.match(text,/股票跌10%/);assert.match(text,/未模擬沿途多次補款/);assert.doesNotMatch(text,/NaN|Infinity/);
console.log('Passed: three support stages, cash boundary, unchanged checkbox basis, equity cap and plain-language summary.');
