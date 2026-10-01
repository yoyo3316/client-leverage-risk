const assert=require('node:assert/strict');require('./dist/engine.js');const S=require('./dist/summary.js');
const m=[{name:'QA',data:{cash:10,other:100,debtOther:0,usePledge:false,pools:[{name:'合計',type:'質押',value:200,debt:150,pledge:100}]}}];
let text=S.generate(m,.3,'2026-10-01');assert.match(text,/股票下跌 30% 後/);assert.match(text,/情境現金不足/);assert.match(text,/借款／總資產 48.39%/);assert.match(text,/1.88 倍/);assert.match(text,/未套用追加股票/);assert.match(text,/無法判斷個別券商/);
m[0].data.usePledge=true;text=S.generate(m,.3);assert.match(text,/情境下整體擔保足夠/);assert.match(text,/已套用全部現股投入/);
m[0].data.pools[0].debt=400;text=S.generate(m,.56);assert.match(text,/淨資產非正，無法計算/);assert.match(text,/下跌 56%/);assert.doesNotMatch(text,/Infinity|NaN/);
console.log('Passed: summary risk indicators, exact selected decline, cash gaps, stock support switch and non-positive equity.');
