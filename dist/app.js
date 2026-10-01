const $=id=>document.getElementById(id);
const fmt=n=>Number.isFinite(n)?n.toLocaleString('zh-TW',{maximumFractionDigits:2}):'—';
const pct=n=>Number.isFinite(n)?fmt(n)+'%':'—';
const copy=x=>JSON.parse(JSON.stringify(x));
const blank=()=>({cash:0,other:0,debtOther:0,pools:[]});
let mode='示範',active=0;
const familyDemo=[{name:'媽媽',data:{cash:80,other:150,debtOther:0,pools:[{name:'中信',type:'融資',value:300,debt:180},{name:'凱基',type:'質押',value:400,debt:220}]}},{name:'小孩 A',data:{cash:20,other:80,debtOther:0,pools:[{name:'中信',type:'融資',value:150,debt:100}]}},{name:'小孩 B',data:{cash:30,other:100,debtOther:0,pools:[{name:'凱基',type:'質押',value:200,debt:90}]}}];
let family=copy(familyDemo),state=family[0].data;
$('date').value=new Date().toLocaleDateString('en-CA');
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function mark(){mode='使用者輸入';$('mode').textContent='目前為使用者輸入；請核對實際部位。金額單位：萬元。';}
function inputs(){
 family[active].data=state;family=family.map(m=>({name:m.name,data:RiskData.consolidate(m.data)}));state=family[active].data;
 $('member').innerHTML=family.map((m,i)=>`<option value="${i}" ${i===active?'selected':''}>${esc(m.name||'未命名成員')}</option>`).join('');
 $('memberName').value=family[active].name;
 $('usePledge').checked=!!state.usePledge;
 for(const key of ['cash','other','debtOther'])$(key).value=state[key];
 $('pools').innerHTML=`<article class="pool"><div class="fields">${[['value','已作擔保股票總市值'],['debt','總借款']].map(([key,label])=>`<label>${label}<input type="number" min="0" step="0.01" data-i="0" data-key="${key}" value="${state.pools[0][key]}"></label>`).join('')}</div><div id="result0" class="status"></div></article>`;render();
}
function buffer(p){return p.debt===0?null:p.value>0?Math.max(0,p.buffer*100):0;}
function viewVerdict(r){const v=RiskEngine.verdict(r);return {...v,label:v.label==='未觸發追繳'?'整體擔保足夠':v.label==='現金足以補款'?'整體現金足以支援':v.label};}
function render(){
 family[active].data=state;family.forEach(m=>{m.data.pools[0].pledge=m.data.other;});
 try{family.forEach(m=>RiskEngine.validate(m.data));$('error').textContent='';}
 catch(e){$('error').textContent=e.message;for(const id of ['summary','overview','comparison','fundingChart','history','accountOverview','scenarios','chart','pledgeComparison'])$(id).innerHTML='';$('stress').textContent='請先修正輸入，再看試算結果。';$('familyStats').textContent='';$('selectedEvent').textContent='';$('historySource').textContent='';state.pools.forEach((p,i)=>{if($('result'+i))$('result'+i).textContent='請先修正輸入';});return;}
 const drop=Number($('drop').value)/100,now=RiskEngine.calculate(state),r=RiskEngine.calculate(state,drop),totalNow=RiskEngine.family(family),total=RiskEngine.family(family,drop);
 $('dropLabel').textContent=pct(drop*100);
 const event=RiskHistory.events.find(e=>Math.abs(e.dropPercent-drop*100)<1e-7);
 $('selectedEvent').textContent=event?event.title+'｜'+event.from+' → '+event.to:'自訂跌幅情境';
 const pools=totalNow.members.flatMap(m=>m.result.pools).filter(p=>p.debt>0);
 const distance=pools.length?Math.min(...pools.map(buffer)):null;
 const verdict=viewVerdict(total);
 const zeroOwners=total.members.filter(m=>m.result.equity<=0&&m.result.debt>0).map(m=>m.name||'未命名成員');
 $('stress').innerHTML=`<div class="verdict ${verdict.tone}"><strong>${verdict.label}</strong><span>${total.breached?total.breached+' 位成員整體低於130%':''}${total.cashGap>0?' · 缺口 '+fmt(total.cashGap)+' 萬':''}${zeroOwners.length?' · '+esc(zeroOwners.join('、'))+'淨資產非正':''}${!total.breached&&!zeroOwners.length?'合計擔保高於門檻；仍可能有個別券商追繳':''}</span></div>`;
 $('summary').innerHTML=[['情境後家庭淨資產',fmt(total.equity)+' 萬','目前 '+fmt(totalNow.equity)+' 萬'],['需償還本金',fmt(total.repay)+' 萬','合計部位不足時還款至166%（估算）'],['各成員現金缺口',fmt(total.cashGap)+' 萬','不跨成員互抵'],['整體可支援跌幅（最低成員）',distance===null?'無借款':pct(distance),'包含已啟用的追加股票擔保']].map(([a,b,c])=>`<div class="metric"><span>${a}</span><strong>${b}</strong><small>${c}</small></div>`).join('');
 now.pools.forEach((p,i)=>{const q=r.pools[i],el=$('result'+i);el.className='status '+(q.breach?'danger':p.breach?'warning':'');el.innerHTML=`<div class="accountStatus"><span>${state.usePledge?'追加後':'目前'}維持率 <b>${p.ratio===null?'無借款':pct(p.ratio)}</b></span><span>可跌 <b>${p.debt===0?'—':pct(buffer(p))}</b></span></div><small>跌 ${pct(drop*100)} 後 ${q.ratio===null?'無借款':pct(q.ratio)}${q.breach?' · 整體需補款':' · 整體擔保足夠'}</small>`;});
 $('pledgeComparison').innerHTML='<div class="tablewrap"><table><thead><tr><th>成員</th><th>目前整體維持率</th><th>全部現股投入後</th><th>目前可支援跌幅</th><th>全投入可支援跌幅</th><th>可投入現股</th></tr></thead><tbody>'+family.map(m=>{const a=RiskEngine.calculate({...m.data,usePledge:false}).pools[0],b=RiskEngine.calculate({...m.data,usePledge:true}).pools[0];return `<tr><td>${esc(m.name)}${m.data.usePledge?' · 已套用全投入':''}</td><td>${a.ratio===null?'無借款':pct(a.ratio)}</td><td>${b.ratio===null?'無借款':pct(b.ratio)}</td><td>${a.debt?pct(buffer(a)):'—'}</td><td>${b.debt?pct(buffer(b)):'—'}</td><td>${fmt(m.data.other)}</td></tr>`;}).join('')+'</tbody></table></div>';
 drawCurve(totalNow,total,drop,distance);
 renderOverview(totalNow,total,drop);
 renderHistory(event);
 $('scenarios').innerHTML=[0,.1,.2,.3,.4,.5,.6].map(d=>{const t=RiskEngine.calculate(state,d);return `<tr class="${t.cashGap>0?'danger':''}"><td>${pct(d*100)}</td><td>${fmt(t.equity)}</td><td>${t.breached}</td><td>${fmt(t.repay)}</td><td>${fmt(t.cashGap)}</td></tr>`;}).join('');
}
function drawCurve(now,total,drop,distance){
 const values=Array.from({length:61},(_,i)=>RiskEngine.family(family,i/100).equity),lo=Math.min(0,...values),hi=Math.max(1,...values),pad=(hi-lo)*.08;
 const x=d=>62+d/60*548,y=v=>216-(v-lo+pad)/(hi-lo+pad*2)*180;
 const ticks=Array.from({length:4},(_,i)=>lo+(hi-lo)*i/3);
 const grid=ticks.map(v=>`<line x1="62" x2="610" y1="${y(v)}" y2="${y(v)}" stroke="#dce5ec"/><text x="53" y="${y(v)+4}" text-anchor="end" fill="#688092" font-size="12">${Math.round(v)}</text>`).join('');
 const line=values.map((v,i)=>(i?'L':'M')+x(i)+','+y(v)).join(' '),area=line+` L610,${y(lo)} L62,${y(lo)} Z`;
 const threshold=distance!==null&&distance<=60?`<line x1="${x(distance)}" x2="${x(distance)}" y1="30" y2="220" stroke="#b88730" stroke-dasharray="4 4"/><text x="${Math.min(600,Math.max(88,x(distance)))}" y="22" text-anchor="middle" font-size="11" fill="#8b651b">整體門檻 ${pct(distance)}</text>`:'';
 const cx=x(drop*100),cy=y(total.equity),labelX=Math.max(115,Math.min(555,cx)),labelY=Math.max(45,Math.min(202,cy-17));
 const axis=[0,10,20,30,40,50,60].map(d=>`<text x="${x(d)}" y="242" text-anchor="middle" font-size="12" fill="#688092">${d}%</text>`).join('');
 $('chart').innerHTML=`<title>股票跌 ${pct(drop*100)} 時，家庭淨資產 ${fmt(total.equity)} 萬</title><defs><linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#169b8e" stop-opacity=".22"/><stop offset="1" stop-color="#169b8e" stop-opacity=".01"/></linearGradient></defs><text x="62" y="16" font-size="11" fill="#688092">萬元</text>${grid}<line x1="62" x2="610" y1="${y(0)}" y2="${y(0)}" stroke="#8297a8" stroke-dasharray="3"/><path d="${area}" fill="url(#equityFill)"/><path d="${line}" fill="none" stroke="#169b8e" stroke-width="3"/>${threshold}<line x1="${cx}" x2="${cx}" y1="30" y2="220" stroke="#244963" stroke-dasharray="2 4"/><circle cx="${cx}" cy="${cy}" r="6" fill="#244963" stroke="white" stroke-width="2"/><rect x="${labelX-62}" y="${labelY-14}" width="124" height="25" rx="5" fill="#244963"/><text x="${labelX}" y="${labelY+3}" text-anchor="middle" fill="white" font-size="12">${fmt(total.equity)} 萬</text>${axis}<text x="610" y="263" text-anchor="end" font-size="11" fill="#688092">股票跌幅</text>`;
}
function renderOverview(now,total,drop){
 $('familyStats').textContent=family.length+' 位成員 · '+total.breached+' 位成員整體擔保不足';
 $('overview').innerHTML='<thead><tr><th>成員</th><th>目前淨資產</th><th>情境後淨資產</th><th>需還本金</th><th>現金缺口</th><th>情境結果</th></tr></thead><tbody>'+total.members.map((m,i)=>{const v=viewVerdict(m.result);return `<tr><td><button class="memberLink" data-select-member="${i}">${esc(m.name||'未命名成員')}${i===active?' · 編輯中':''}</button></td><td>${fmt(now.members[i].result.equity)}</td><td>${fmt(m.result.equity)}</td><td>${fmt(m.result.repay)}</td><td class="${m.result.cashGap>0?'gap':''}">${fmt(m.result.cashGap)}</td><td><span class="badge ${v.tone}">${v.label}</span></td></tr>`;}).join('')+`<tr class="totalrow"><td>家庭合計</td><td>${fmt(now.equity)}</td><td>${fmt(total.equity)}</td><td>${fmt(total.repay)}</td><td>${fmt(total.cashGap)}</td><td>逐成員計算</td></tr></tbody>`;
 const maxEq=Math.max(1,...now.members.flatMap((m,i)=>[Math.abs(m.result.equity),Math.abs(total.members[i].result.equity)]));
 $('comparison').innerHTML=total.members.map((m,i)=>{const a=now.members[i].result.equity,b=m.result.equity;return `<div class="compareRow"><strong>${esc(m.name||'未命名成員')}</strong><div>${bar(a,maxEq,'navy','目前')}${bar(b,maxEq,b<0?'red':'teal','情境後')}</div></div>`;}).join('');
 const maxCash=Math.max(1,...total.members.flatMap((m,i)=>[family[i].data.cash,m.result.repay]));
 $('fundingChart').innerHTML=total.members.map((m,i)=>`<div class="compareRow"><strong>${esc(m.name||'未命名成員')}</strong><div>${bar(family[i].data.cash,maxCash,'navy','現金')}${bar(m.result.repay,maxCash,m.result.cashGap>0?'red':'amber','需還')}${m.result.cashGap>0?`<span class="gap">不足 ${fmt(m.result.cashGap)} 萬</span>`:'<span class="fundingOk">無現金缺口</span>'}</div></div>`).join('');
 $('accountOverview').innerHTML='<table><thead><tr><th>成員／帳戶</th><th>市值</th><th>借款</th><th>目前維持率</th><th>可跌</th><th>情境後維持率</th><th>需還本金</th></tr></thead><tbody>'+now.members.map((m,i)=>m.result.pools.map((p,j)=>{const q=total.members[i].result.pools[j];return `<tr class="${q.breach?'danger':''}"><td>${esc(m.name)}／合計部位</td><td>${fmt(p.value)}</td><td>${fmt(p.debt)}</td><td>${p.ratio===null?'無借款':pct(p.ratio)}</td><td>${p.debt===0?'—':pct(buffer(p))}</td><td>${q.ratio===null?'無借款':pct(q.ratio)}</td><td>${q.breach?fmt(q.repay):'0'}</td></tr>`;}).join('')).join('')+'</tbody></table>';
}
function bar(value,max,color,label){return `<div class="barlabel"><span>${label}</span><b>${fmt(value)} 萬${value<0?'（負值）':''}</b></div><div class="barTrack"><div class="bar ${color}" style="width:${Math.abs(value)/max*100}%"></div></div>`;}
function renderHistory(selected){
 $('history').innerHTML=RiskHistory.events.map(e=>{const r=RiskEngine.family(family,e.dropPercent/100),v=viewVerdict(r),affected=r.members.filter(m=>m.result.cashGap>0||(m.result.equity<=0&&m.result.debt>0)&&m.result.debt>0).map(m=>m.name||'未命名成員');return `<button class="eventCard ${selected?.id===e.id?'selected':''}" data-event="${e.id}" aria-pressed="${selected?.id===e.id}"><span class="eventName">${e.title}</span><strong>−${pct(e.dropPercent)}</strong><span class="badge ${v.tone}">${v.label}</span><span class="eventNumbers">情境後淨資產 <b>${fmt(r.equity)} 萬</b><br>現金缺口 <b>${fmt(r.cashGap)} 萬</b></span><span class="eventAffected">${affected.length?'缺口／非正淨資產：'+esc(affected.join('、')):r.breached?r.breached+' 位成員整體需補款':'各成員整體擔保足夠'}</span><small>${e.from} → ${e.to}</small></button>`;}).join('');
 const list=selected?[selected]:RiskHistory.events;
 $('historySource').innerHTML=list.map(e=>`<div>${esc(e.title)}：${fmt(e.peak)} → ${fmt(e.trough)} 點（收盤跌幅 ${pct(e.dropPercent)}） · ${e.sources.map(s=>`<a href="${s.url}" target="_blank" rel="noopener noreferrer">${esc(s.label)}</a>`).join('、')}</div>`).join('');
}
for(const key of ['cash','other','debtOther'])$(key).addEventListener('input',e=>{state[key]=e.target.value===''?NaN:Number(e.target.value);mark();render();});
$('pools').addEventListener('input',e=>{const {i,key}=e.target.dataset;if(key){state.pools[+i][key]=['name','type'].includes(key)?e.target.value:e.target.value===''?NaN:Number(e.target.value);mark();render();}});
$('pools').addEventListener('click',e=>{if(e.target.dataset.remove!==undefined){state.pools.splice(+e.target.dataset.remove,1);mark();inputs();}});
$('add').onclick=()=>{if(state.pools.length>=100){$('error').textContent='每位成員最多100個帳戶';return;}state.pools.push({name:'新帳戶',type:'融資',value:0,debt:0});mark();inputs();};
$('usePledge').onchange=e=>{state.usePledge=e.target.checked;mark();inputs();};
$('drop').oninput=render;
$('history').onclick=e=>{const button=e.target.closest('[data-event]');if(!button)return;const event=RiskHistory.events.find(x=>x.id===button.dataset.event);$('drop').value=event.dropPercent;render();$('drop').dispatchEvent(new Event('change',{bubbles:true}));};
$('overview').onclick=e=>{const button=e.target.closest('[data-select-member]');if(!button)return;active=Number(button.dataset.selectMember);state=family[active].data;inputs();$('member').focus();};
$('demo').onclick=()=>{family=copy(familyDemo);active=0;state=family[0].data;mode='示範';$('mode').textContent='目前為示範數據，不代表客戶真實部位。金額單位：萬元。';inputs();};
$('clear').onclick=()=>{family=[{name:'客戶',data:blank()}];active=0;state=family[0].data;mark();inputs();};
$('export').onclick=()=>{try{const payload=RiskData.normalize({version:2,date:$('date').value,mode,drop:Number($('drop').value),members:family});const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='client-risk.json';a.click();URL.revokeObjectURL(url);}catch(e){$('error').textContent=e.message;}};
$('import').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>1e6)throw Error('檔案需小於1MB');const payload=RiskData.normalize(JSON.parse(await file.text()));family=payload.members;active=0;state=family[0].data;if(payload.date)$('date').value=payload.date;$('drop').value=payload.drop;mark();inputs();window.dispatchEvent(new Event('workspace-replaced'));}catch(e){$('error').textContent='匯入失敗：'+e.message;}e.target.value='';};
$('member').onchange=e=>{family[active].data=state;active=Number(e.target.value);state=family[active].data;inputs();};
$('memberName').oninput=e=>{family[active].name=e.target.value;$('member').options[active].textContent=e.target.value||'未命名成員';mark();render();};
$('addMember').onclick=()=>{if(family.length>=30){$('error').textContent='最多30位成員';return;}family[active].data=state;family.push({name:'新成員 '+(family.length+1),data:blank()});active=family.length-1;state=family[active].data;mark();inputs();};
$('removeMember').onclick=()=>{if(family.length===1){$('error').textContent='至少保留一位成員；可使用清空移除數據';return;}if(!confirm('刪除「'+(family[active].name||'未命名成員')+'」與其帳戶？'))return;family.splice(active,1);active=Math.min(active,family.length-1);state=family[active].data;mark();inputs();};
inputs();
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'read_leverage_risk',description:'Read household margin and pledge risks using fixed 130% trigger and 166% restoration target.',inputSchema:{type:'object',properties:{declinePercent:{type:'number',minimum:0,maximum:60}},required:['declinePercent'],additionalProperties:false},annotations:{readOnlyHint:true},execute(input){if(typeof input?.declinePercent!=='number'||!Number.isFinite(input.declinePercent)||input.declinePercent<0||input.declinePercent>60)throw Error('跌幅需介於0至60');family.forEach(m=>RiskEngine.validate(m.data));return RiskEngine.family(family,input.declinePercent/100);}})).catch(()=>{});}catch{}}
