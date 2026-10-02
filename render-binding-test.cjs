const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('dist/app.js','utf8'),nodes={drop:{},date:{addEventListener(event,fn){this[event]=fn;}}};let base=0,modern=0;
const ctx={$:id=>nodes[id],render(){base++;}};vm.createContext(ctx);
for(const pattern of [/\$\('drop'\)\.oninput=.*?;/,/\$\('date'\)\.addEventListener\('input',.*?\);/]){const match=source.match(pattern);assert.ok(match);vm.runInContext(match[0],ctx);}
// Later modules extend render with the live hero and snapshot comparison.
ctx.render=()=>{base++;modern++;};nodes.drop.oninput();nodes.date.input();assert.equal(base,2);assert.equal(modern,2,'input must call the current renderer, including modern hero');console.log('Live render binding regression passed');
