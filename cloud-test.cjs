const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const elements=new Map(),requests=[],plans=[],listeners={};
function el(id){if(!elements.has(id))elements.set(id,{value:'',hidden:false,disabled:false,textContent:'',classList:{toggle(){}},replaceChildren(...x){this.options=x;},add(x){(this.options||=[]).push(x);},addEventListener(){},checkValidity(){return true;}});return elements.get(id);}
el('date').value='2026-10-01';el('drop').value='20';
const sdk={auth:{onAuthStateChange(){},async getSession(){return {data:{session:{user:{id:'owner-id',email:'qa@example.invalid'}}}};},async signOut(){return {};},async signInWithOtp(){return {};}},from(table){const q={table,op:'select',filters:[]};const chain={select(columns){q.columns=columns;return chain;},eq(k,v){q.filters.push([k,v]);return chain;},order(){return chain;},limit(){return chain;},maybeSingle(){return chain;},insert(row){q.op='insert';q.row=row;return chain;},update(row){q.op='update';q.row=row;return chain;},then(resolve,reject){requests.push(q);let plan=plans.shift()||{data:[],error:null};try{Promise.resolve(typeof plan==='function'?plan(q):plan).then(resolve,reject);}catch(e){reject(e);}}};return chain;}};
const context=vm.createContext({console,TextEncoder,setTimeout,Option:function(text,value){this.text=text;this.value=value;},confirm:()=>true,document:{getElementById:el,addEventListener(type,fn){listeners[type]=fn;}},mode:'使用者輸入',family:[{name:'家庭QA',data:{cash:10,other:50,debtOther:0,pools:[{name:'QA',type:'融資',value:100,debt:50,trigger:130,target:166,fixed:500}]}}],active:0,mark(){context.mode='使用者輸入';},inputs(){},addEventListener(){},supabase:{createClient(){return sdk;}}});context.window=context;
vm.runInContext(fs.readFileSync('dist/engine.js','utf8'),context);vm.runInContext(fs.readFileSync('dist/data.js','utf8'),context);
const meta={id:'case-1',name:'QA',revision:7,updated_at:'2026-10-01T00:00:00Z'};
(async()=>{
 await vm.runInContext(fs.readFileSync('dist/cloud.js','utf8'),context);
 assert.equal(el('cloudWorkspace').hidden,false);
 const originalRequestCount=requests.length;listeners.input();assert.equal(requests.length,originalRequestCount,'editing never auto-uploads');
 el('caseName').value=' QA ';plans.push({data:[meta]},{data:[meta]});await el('saveCloud').onclick();
 const insert=requests.find(q=>q.op==='insert');assert.equal(insert.row.user_id,'owner-id');assert.equal(insert.row.name,'QA');assert.equal(insert.row.payload.members[0].data.pools[0].fixed,undefined);assert.match(el('cloudStatus').textContent,/已儲存/);
 context.family[0].data.cash=11;plans.push({data:[]});await el('saveCloud').onclick();const update=requests.at(-1);assert.equal(update.op,'update');assert.ok(update.filters.some(([k,v])=>k==='revision'&&v===7));assert.match(el('cloudStatus').textContent,/其他視窗更新/);
 context.family[0].data.cash=NaN;const beforeInvalid=requests.length;await el('saveCloud').onclick();assert.equal(requests.length,beforeInvalid);assert.match(el('cloudStatus').textContent,/非負數/);context.family[0].data.cash=11;
 el('caseList').value='case-1';plans.push({data:{...meta,payload:{version:2,members:[]}}});await el('loadCloud').onclick();assert.equal(context.family[0].data.cash,11,'invalid remote data must not replace workspace');
 const payload={version:2,date:'2026-09-30',mode:'使用者輸入',drop:35,members:[{name:'載入QA',data:{cash:88,other:0,debtOther:0,pools:[]}}]};plans.push({data:{...meta,payload}});await el('loadCloud').onclick();assert.equal(context.family[0].data.cash,88);assert.equal(el('drop').value,35);assert.equal(el('date').value,'2026-09-30');assert.match(el('cloudStatus').textContent,/已載入/);
 let release;plans.push(()=>new Promise(resolve=>{release=resolve;}),{data:[{...meta,revision:8}]});el('caseName').value='QA';const pending=el('saveCloud').onclick();await new Promise(resolve=>setImmediate(resolve));context.family[0].data.cash=99;release({data:[{...meta,revision:8}]});await pending;assert.match(el('cloudStatus').textContent,/新變更尚未上傳/);
 await el('signOut').onclick();assert.equal(context.family[0].data.cash,0);assert.equal(el('cloudWorkspace').hidden,true);
 console.log('Passed: manual-only cloud writes, ownership filters, stale revision conflict, invalid remote data, in-flight edit retention, sign-out clearing.');
})().catch(e=>{console.error(e);process.exitCode=1;});
