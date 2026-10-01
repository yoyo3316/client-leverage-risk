const assert=require('node:assert/strict'),M=require('./dist/market.js');
assert.equal(M.point(20000,.2),16000);assert.equal(M.point(20000,0),20000);assert.equal(M.point(20000,1),0);assert.equal(M.point(0,.2),null);assert.equal(M.point(20000,null),null);
assert.deepEqual(M.parseLive({msgArray:[{c:'t00',z:'20,000.50',d:'20261001',t:'13:30:00'}]}),{value:20000.5,date:'2026-10-01',time:'13:30:00',kind:'證交所行情'});
assert.throws(()=>M.parseLive({msgArray:[{c:'t00',z:'-',d:'20261001'}]}));
assert.equal(M.parseClose([{'指數':'發行量加權股價指數','日期':'1150930','收盤指數':'20,000.50'}]).date,'2026-09-30');
assert.throws(()=>M.parseClose([{'指數':'寶島股價指數','日期':'1150930','收盤指數':'20000'}]));
console.log('Passed: index point conversion, zero/no-debt handling, quote date parsing and missing live quote rejection.');
