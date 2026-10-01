const $=id=>document.getElementById(id);
const fmt=n=>Number.isFinite(n)?n.toLocaleString('zh-TW',{maximumFractionDigits:2}):'—';
const pct=n=>Number.isFinite(n)?fmt(n)+'%':'—';
const copy=x=>JSON.parse(JSON.stringify(x));
const blank=()=>({cash:0,other:0,debtOther:0,pools:[]});
let mode='示範',active=0,broker=-1;
function selected(){return RiskData.scope(state,broker);}
function support(s){const ps=RiskEngine.calculate(s).pools.filter(p=>p.debt>0);return ps.length?Math.min(...ps.map(buffer)):null;}
function limitName(s,on){const ps=RiskEngine.calculate(allSupport(s,on)).pools.filter(p=>p.debt>0);if(!ps.length)return '無借款';const min=Math.min(...ps.map(buffer));return ps.filter(p=>Math.abs(buffer(p)-min)<1e-7).map(p=>p.name).join('、');}
function allSupport(s,on){return {...s,usePledge:on,pools:s.pools.map(p=>({...p,pledge:p.other??s.other,usePledge:on}))};}
const familyDemo=[{name:'媽媽',data:{cash:80,other:150,debtOther:0,pools:[{name:'中信',type:'融資',value:300,debt:180},{name:'凱基',type:'質押',value:400,debt:220}]}},{name:'小孩 A',data:{cash:20,other:80,debtOther:0,pools:[{name:'中信',type:'融資',value:150,debt:100}]}},{name:'小孩 B',data:{cash:30,other:100,debtOther:0,pools:[{name:'凱基',type:'質押',value:200,debt:90}]}}];
let family=copy(familyDemo),state=family[0].data;
$('date').value=new Date().toLocaleDateString('en-CA');
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function mark(){mode='使用者輸入';$('mode').textContent='使用者輸入｜萬元';}
function inputs(){
 family[active].data=state;family=family.map(m=>({name:m.name,data:RiskData.accounts(m.data)}));state=family[active].data;
 if(broker>=state.pools.length)broker=-1;
 $('member').innerHTML=family.map((m,i)=>`<option value="${i}" ${i===active?'selected':''}>${esc(m.name||'未命名成員')}</option>`).join('');
 $('memberName').value=family[active].name;
 $('reportMember').innerHTML=family.map((m,i)=>`<option value="${i}" ${i===active?'selected':''}>${esc(m.name||'未命名成員')}</option>`).join('');
 $('broker').innerHTML='<option value="-1">全部券商整合總覽</option>'+state.pools.map((p,i)=>`<option value="${i}">${esc(p.name)}</option>`).join('');$('broker').value=broker;
 $('brokerFields').hidden=broker<0;$('removeBroker').hidden=broker<0;
 $('cashLabel').textContent=broker<0?'成員現金合計（唯讀）':'此券商可用現金';$('otherLabel').textContent=broker<0?'未設質現股合計（唯讀）':'此券商未設質現股';
 const s=selected();$('usePledge').checked=broker>=0&&s.usePledge;$('usePledge').disabled=broker<0;
 for(const key of ['cash','other','debtOther']){$(key).value=s[key];$(key).disabled=broker<0;}
 $('brokerName').value=broker>=0?state.pools[broker].name:'';
 $('pools').innerHTML=broker<0?'<p class="notice">選擇券商即可編輯部位。</p>':`<article class="pool">${state.pools[broker].legacyCombined?'<p class="notice">舊合計暫列質押，請核對拆分。</p><button data-confirm-split="true">已核對質押與融資拆分</button>':''}${[['質押',[['pledgeValue','質押抵押品市值'],['pledgeDebt','質押借款金額']]],['融資',[['marginValue','融資股票市值'],['marginDebt','融資借款金額']]]].map(([title,fields])=>`<h3>${title}</h3><div class="fields">${fields.map(([key,label])=>`<label>${label}<input type="number" min="0" step="0.01" data-i="${broker}" data-key="${key}" value="${state.pools[broker][key]}"></label>`).join('')}</div>`).join('')}<p id="brokerAutoTotal" class="notice"></p><div id="result0" class="status"></div></article>`;
 render();
 renderBulk();
}
function buffer(p){return p.debt===0?null:p.value>0?Math.max(0,p.buffer*100):0;}
function viewVerdict(r){const v=RiskEngine.verdict(r);return {...v,label:v.label==='未觸發追繳'?'各券商擔保足夠':v.label==='現金足以補款'?'需補款，可用現金足夠':v.label};}
function render(){
 family[active].data=state;family.forEach(m=>RiskData.sync(m.data));
 const legacy=family.flatMap((m,i)=>m.data.pools.filter(p=>p.legacyCombined).map(p=>({member:i,name:m.name,broker:m.data.pools.indexOf(p),account:p.name})));
 $('dataChecks').hidden=legacy.length===0;$('dataChecks').innerHTML=legacy.length?'<strong>'+legacy.length+' 個舊合計部位待核對</strong>'+legacy.map(x=>`<button data-review-member="${x.member}" data-review-broker="${x.broker}">核對 ${esc(x.name)}／${esc(x.account)}</button>`).join(''):'';
 try{family.forEach(m=>RiskEngine.validate(m.data));$('error').textContent='';}
 catch(e){$('error').textContent=e.message;for(const id of ['memberCards','plainConclusion','familyAssets','brokerOverview','summary','overview','comparison','fundingChart','history','chart','currentIndicators'])$(id).innerHTML='';$('stress').textContent='請先修正輸入，再看試算結果。';$('familyStats').textContent='';$('selectedEvent').textContent='';$('historySource').textContent='';$('clientSummary').value='輸入有誤，請先修正再產生摘要。';$('summaryContext').textContent='';state.pools.forEach((p,i)=>{if($('result'+i))$('result'+i).textContent='請先修正輸入';});return;}
 if($('brokerAutoTotal'))$('brokerAutoTotal').textContent='自動合計：擔保市值 '+fmt(state.pools[broker].value)+' 萬／借款 '+fmt(state.pools[broker].debt)+' 萬';
 const scope=selected();const drop=Number($('drop').value)/100,now=RiskEngine.calculate(scope),r=RiskEngine.calculate(scope,drop),totalNow=RiskEngine.family(family),total=RiskEngine.family(family,drop);
 $('dropLabel').textContent=pct(drop*100);
 $('scenarioIndex').textContent=RiskMarket.point(Number($('indexLevel').value),drop)===null?'—':fmt(RiskMarket.point(Number($('indexLevel').value),drop));
 const bn=RiskEngine.calculate(state),br=RiskEngine.calculate(state,drop);
 $('brokerContext').textContent=family[active].name+' · 下跌 '+pct(drop*100)+' · 調用前缺口';
 $('brokerOverview').innerHTML='<thead><tr><th>券商／帳戶</th><th>借款</th><th>目前維持率</th><th>可跌</th><th>情境維持率</th><th>需還本金</th><th>調用前現金缺口</th></tr></thead><tbody>'+bn.pools.map((p,i)=>{const q=br.pools[i],gap=Math.max(0,(q.breach?q.repay:0)-p.cash);return `<tr><td><button class="memberLink" data-broker="${i}">${esc(p.name)}</button></td><td>${fmt(p.debt)}</td><td>${p.ratio===null?'無借款':pct(p.ratio)}</td><td>${p.debt?pct(buffer(p)):'無借款'}</td><td>${q.ratio===null?'無借款':pct(q.ratio)}</td><td>${fmt(q.breach?q.repay:0)}</td><td class="${gap>0?'gap':''}">${fmt(gap)}</td></tr>`;}).join('')+'</tbody>';
 const event=RiskHistory.events.find(e=>Math.abs(e.dropPercent-drop*100)<1e-7);
 $('selectedEvent').textContent=event?event.title+'｜'+event.from+' → '+event.to:'自訂跌幅情境';
 const distance=support(scope);
 const readiness=RiskEngine.readiness(scope,drop),verdict={label:readiness.label,tone:readiness.tone},name=(family[active].name||'未命名成員')+'／'+(broker<0?'全部券商':state.pools[broker].name);
 $('memberFocus').textContent='目前查看：'+name+'｜'+(broker<0?'依各券商追加設定，獨立計算':scope.usePledge?'已模擬本券商現股投入擔保':'本券商未追加現股');
 $('stressTitle').textContent='② '+name+'：下跌後需要補多少？';$('curveTitle').textContent=name+'的淨資產隨跌幅變化';$('historyTitle').textContent='③ '+name+'：歷史股災壓力測試';$('summaryTitle').textContent=name+'：風險摘要';
 const base=RiskEngine.calculate(allSupport(scope,false)),p=now.pools[0];
 $('currentIndicators').innerHTML=[['目前淨資產',fmt(now.equity)+' 萬'],['總借款',fmt(now.debt)+' 萬'],['借款／總資產',now.ltv===null?'—':pct(now.ltv)],['股票曝險倍數',now.leverage===null?'淨資產非正':fmt(now.leverage)+' 倍'],[broker<0?'券商帳戶數':'目前維持率',broker<0?scope.pools.length+' 個':p.ratio===null?'無借款':pct(p.ratio)],[broker<0?'最早券商追繳跌幅':'本券商可支援跌幅',distance===null?'無借款':pct(distance)]].map(([a,b])=>`<div class="metric"><span>${a}</span><strong>${b}</strong></div>`).join('');
 $('stress').innerHTML=`<div class="verdict ${verdict.tone}"><strong>${verdict.label}</strong><span>${esc(name)} · 股票下跌 ${pct(drop*100)} · 三種支援方式比較${readiness.stocks.cashGap>0?' · 資源用上後仍缺 '+fmt(readiness.stocks.cashGap)+' 萬':''}</span></div>`;
 $('summary').innerHTML=[['跌 '+pct(drop*100)+' 後淨資產',fmt(r.equity)+' 萬','本人目前 '+fmt(now.equity)+' 萬'],['原部位需還本金',fmt(readiness.original.repay)+' 萬','各低於130%的帳戶還款至166%（估算）'],['本人可用現金',fmt(scope.cash)+' 萬','不計其他成員資金'],['現股＋現金仍缺',fmt(readiness.stocks.cashGap)+' 萬','現股預先追加後，再用本人現金還款']].map(([a,b,c])=>`<div class="metric"><span>${a}</span><strong>${b}</strong><small>${esc(c)}</small></div>`).join('');
 now.pools.forEach((p,i)=>{const q=r.pools[i],el=$('result'+i);if(!el)return;el.className='status '+(q.breach?'danger':p.breach?'warning':'');el.innerHTML=`<div class="accountStatus"><span>${selected().usePledge?'追加後':'目前'}維持率 <b>${p.ratio===null?'無借款':pct(p.ratio)}</b></span><span>可跌 <b>${p.debt===0?'—':pct(buffer(p))}</b></span></div><small>跌 ${pct(drop*100)} 後 ${q.ratio===null?'無借款':pct(q.ratio)}${q.breach?' · 整體需補款':' · 整體擔保足夠'}</small>`;});

 drawCurve(now,r,drop,distance);
 renderOverview(totalNow,total,drop);
 renderHistory(event);
 const cap=RiskEngine.capacity(scope),dropText=n=>n===null?'無借款':pct(Math.floor(n*10000+1e-7)/100);
 $('plainConclusion').innerHTML=`<div class="capacityGrid">${[['目前：最早追繳',dropText(cap.current),'由 '+limitName(scope,false)+' 決定'],['各自加現股：最早追繳',dropText(cap.stocks),limitName(scope,true)+' 最先追繳'],['現股＋現金可支援',dropText(cap.cash),'低點補款估算']].map(([a,b,c])=>`<div class="metric"><span>${a}</span><strong>${b}</strong><small>${esc(c)}</small></div>`).join('')}</div><p><b>曝險 ${cap.leverage===null?'無法計算':fmt(cap.leverage)+' 倍'}：</b>${cap.leverage===null?'淨資產非正，須檢視借款。':'股票跌10%，淨資產約少 '+pct(cap.leverage*10)+'。'}</p><p><b>下跌 ${pct(drop*100)} 的情境：</b>${readiness.label}${readiness.stocks.cashGap>0?'，仍缺 '+fmt(readiness.stocks.cashGap)+' 萬':'。'}</p><details class="inlineNotes"><summary>計算說明</summary><p>股票含未設質現股皆同步下跌。現股只加入所在券商，現金可限同一人調用。前兩項是130%追繳門檻；第三項為還款至166%、淨資產未轉負的低點估算，未模擬沿途多次補款。曝險倍數不是安全保證。</p></details>`;
 $('clientSummary').value=RiskSummary.generate([{name,data:scope}],drop,$('date').value,event?.title||'');$('summaryContext').textContent=name+' · 下跌 '+pct(drop*100)+' · '+(broker<0?'依券商設定':scope.usePledge?'已追加現股':'未追加現股');$('copyStatus').textContent='';

}
function drawCurve(now,total,drop,distance){
 const values=Array.from({length:61},(_,i)=>RiskEngine.calculate(selected(),i/100).equity),lo=Math.min(0,...values),hi=Math.max(1,...values),pad=(hi-lo)*.08;
 const x=d=>62+d/60*548,y=v=>216-(v-lo+pad)/(hi-lo+pad*2)*180;
 const ticks=Array.from({length:4},(_,i)=>lo+(hi-lo)*i/3);
 const grid=ticks.map(v=>`<line x1="62" x2="610" y1="${y(v)}" y2="${y(v)}" stroke="#dce5ec"/><text x="53" y="${y(v)+4}" text-anchor="end" fill="#688092" font-size="12">${Math.round(v)}</text>`).join('');
 const line=values.map((v,i)=>(i?'L':'M')+x(i)+','+y(v)).join(' '),area=line+` L610,${y(lo)} L62,${y(lo)} Z`;
 const threshold=distance!==null&&distance<=60?`<line x1="${x(distance)}" x2="${x(distance)}" y1="30" y2="220" stroke="#b88730" stroke-dasharray="4 4"/><text x="${Math.min(600,Math.max(88,x(distance)))}" y="22" text-anchor="middle" font-size="11" fill="#8b651b">最早券商門檻 ${pct(distance)}</text>`:'';
 const cx=x(drop*100),cy=y(total.equity),labelX=Math.max(115,Math.min(555,cx)),labelY=Math.max(45,Math.min(202,cy-17));
 const axis=[0,10,20,30,40,50,60].map(d=>`<text x="${x(d)}" y="242" text-anchor="middle" font-size="12" fill="#688092">${d}%</text>`).join('');
 $('chart').innerHTML=`<title>股票跌 ${pct(drop*100)} 時，本人成員淨資產 ${fmt(total.equity)} 萬</title><defs><linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#169b8e" stop-opacity=".22"/><stop offset="1" stop-color="#169b8e" stop-opacity=".01"/></linearGradient></defs><text x="62" y="16" font-size="11" fill="#688092">萬元</text>${grid}<line x1="62" x2="610" y1="${y(0)}" y2="${y(0)}" stroke="#8297a8" stroke-dasharray="3"/><path d="${area}" fill="url(#equityFill)"/><path d="${line}" fill="none" stroke="#169b8e" stroke-width="3"/>${threshold}<line x1="${cx}" x2="${cx}" y1="30" y2="220" stroke="#244963" stroke-dasharray="2 4"/><circle cx="${cx}" cy="${cy}" r="6" fill="#244963" stroke="white" stroke-width="2"/><rect x="${labelX-62}" y="${labelY-14}" width="124" height="25" rx="5" fill="#244963"/><text x="${labelX}" y="${labelY+3}" text-anchor="middle" fill="white" font-size="12">${fmt(total.equity)} 萬</text>${axis}<text x="610" y="263" text-anchor="end" font-size="11" fill="#688092">股票跌幅</text>`;
}
function pointLabel(drop){const n=RiskMarket.point(Number($('indexLevel').value),drop);return n===null?'':fmt(n)+' 點';}
function renderOverview(now,total,drop){
 $('familyAssets').innerHTML=[['家族股票市值',fmt(now.stock)+' 萬'],['家族借款',fmt(now.debt)+' 萬'],['家族淨資產',fmt(now.equity)+' 萬'],['家族現金',fmt(family.reduce((n,m)=>n+m.data.cash,0))+' 萬']].map(([a,b])=>`<div class="metric"><span>${a}</span><strong>${b}</strong></div>`).join('');
 $('overviewContext').textContent='三種支援方式同時比較 · 不需勾選 · 現金限同一人調用';
 $('equityChartTitle').textContent='股票下跌 '+pct(drop*100)+' 後，淨資產保留多少';$('cashChartTitle').textContent='股票下跌 '+pct(drop*100)+' 後，補款需要與可用現金';
 const reviews=family.map(m=>RiskEngine.readiness(m.data,drop));
 $('familyStats').textContent=family.length+' 位成員 · '+reviews.filter(r=>r.tone==='danger').length+' 位資源仍不足';
 const t=v=>v===null?'無借款':pct(Math.floor(v*10000+1e-7)/100);
 $('memberCards').innerHTML=reviews.map((v,i)=>{const n=v.present,c=v.capacity,m=family[i],a=v.original,b=v.stocks;
 return `<article class="memberCard ${v.tone}"><div class="cardHead"><button class="memberLink" data-select-member="${i}">${esc(m.name)}</button><span class="presentRisk ${n.breached?'gap':''}">${n.breached?'目前需補擔保':'目前未追繳'}</span></div><div class="assetGrid">${[['股票市值',fmt(n.stock)],['淨資產',fmt(n.equity)],['借款',fmt(n.debt)],['可用現金',fmt(m.data.cash)],['未設質現股',fmt(m.data.other)],['曝險倍數',c.leverage===null?'淨資產非正':fmt(c.leverage)+' 倍']].map(([label,value])=>`<div><span>${label}</span><strong>${value}</strong></div>`).join('')}</div><div class="cardCapacity">${[['原部位追繳',t(c.current)],['加現股追繳',t(c.stocks)],['再加現金支援',t(c.cash)]].map(([label,value],idx)=>`<div><span>${label}</span><b>${value}</b><small>${pointLabel(c[['current','stocks','cash'][idx]])}</small></div>`).join('')}</div><div class="scenarioOutcome ${v.tone}"><small>跌 ${pct(drop*100)} 後</small><strong>${v.label}</strong></div><div class="stageRows"><div><span>原部位</span><b>${a.breached?'需還 '+fmt(a.repay)+' 萬':'不需補款'}</b></div><div><span>追加現股</span><b>${b.breached?'需還 '+fmt(b.repay)+' 萬':'不需補款'}</b></div><div><span>再用現金</span><b class="${b.cashGap>0?'gap':''}">${b.cashGap>0?'仍缺 '+fmt(b.cashGap)+' 萬':b.breached?'可補足':'無現金缺口'}</b></div></div><button class="cardEdit" data-select-member="${i}">查看／編輯</button></article>`;}).join('');
 $('overview').innerHTML='<thead><tr><th>成員</th><th>淨資產</th><th>曝險倍數</th><th>原部位追繳</th><th>加現股追繳</th><th>再加現金支援</th><th>加現股前需還</th><th>加現股後需還</th><th>再用現金仍缺</th></tr></thead><tbody>'+reviews.map((v,i)=>{const n=v.present,c=v.capacity;return `<tr><td><button class="memberLink" data-select-member="${i}">${esc(family[i].name)}</button></td><td>${fmt(n.equity)}</td><td>${c.leverage===null?'淨資產非正':fmt(c.leverage)+' 倍'}</td><td>${t(c.current)}</td><td>${t(c.stocks)}</td><td>${t(c.cash)}</td><td>${fmt(v.original.repay)}</td><td>${fmt(v.stocks.repay)}</td><td class="${v.stocks.cashGap>0?'gap':''}">${fmt(v.stocks.cashGap)}</td></tr>`;}).join('')+'</tbody>';
 const maxEq=Math.max(1,...now.members.flatMap((m,i)=>[Math.abs(m.result.equity),Math.abs(total.members[i].result.equity)]));
 $('comparison').innerHTML=total.members.map((m,i)=>{const a=now.members[i].result.equity,b=m.result.equity;return `<div class="compareRow"><strong>${esc(m.name||'未命名成員')}</strong><div>${bar(a,maxEq,'navy','目前')}${bar(b,maxEq,b<0?'red':'teal','情境後')}</div></div>`;}).join('');
 const maxCash=Math.max(1,...total.members.flatMap((m,i)=>[family[i].data.cash,reviews[i].original.repay,reviews[i].stocks.repay]));
 $('fundingChart').innerHTML=reviews.map((v,i)=>`<div class="compareRow"><strong>${esc(family[i].name)}</strong><div>${bar(family[i].data.cash,maxCash,'navy','現金')}${bar(v.original.repay,maxCash,'amber','原部位需還')}${bar(v.stocks.repay,maxCash,v.stocks.cashGap>0?'red':'teal','加現股後需還')}<span class="${v.stocks.cashGap>0?'gap':'fundingOk'}">${v.label}${v.stocks.cashGap>0?' · 仍缺 '+fmt(v.stocks.cashGap)+' 萬':''}</span></div></div>`).join('');

}
function bar(value,max,color,label){return `<div class="barlabel"><span>${label}</span><b>${fmt(value)} 萬${value<0?'（負值）':''}</b></div><div class="barTrack"><div class="bar ${color}" style="width:${Math.abs(value)/max*100}%"></div></div>`;}
function renderHistory(selectedEvent){
 $('history').innerHTML=RiskHistory.events.map(e=>{const review=RiskEngine.readiness(selected(),e.dropPercent/100),r=review.stocks,v=review;return `<button class="eventCard ${selectedEvent?.id===e.id?'selected':''}" data-event="${e.id}" aria-pressed="${selectedEvent?.id===e.id}"><span class="eventName">${e.title}</span><strong>−${pct(e.dropPercent)}</strong><span class="badge ${v.tone}">${v.label}</span><span class="eventNumbers">${esc(family[active].name)}情境後淨資產 <b>${fmt(r.equity)} 萬</b><br>現股＋現金仍缺 <b>${fmt(r.cashGap)} 萬</b></span><small>${e.from} → ${e.to}</small></button>`;}).join('');
 const list=selectedEvent?[selectedEvent]:RiskHistory.events;
 $('historySource').innerHTML=list.map(e=>`<div>${esc(e.title)}：${fmt(e.peak)} → ${fmt(e.trough)} 點（收盤跌幅 ${pct(e.dropPercent)}） · ${e.sources.map(s=>`<a href="${s.url}" target="_blank" rel="noopener noreferrer">${esc(s.label)}</a>`).join('、')}</div>`).join('');
}
for(const key of ['cash','other','debtOther'])$(key).addEventListener('input',e=>{if(broker<0)return;state.pools[broker][key]=e.target.value===''?NaN:Number(e.target.value);mark();render();});
$('pools').addEventListener('input',e=>{const {i,key}=e.target.dataset;if(key){state.pools[+i][key]=['name','type'].includes(key)?e.target.value:e.target.value===''?NaN:Number(e.target.value);mark();render();}});
$('pools').addEventListener('click',e=>{if(e.target.dataset.confirmSplit){state.pools[broker].legacyCombined=false;mark();inputs();document.dispatchEvent(new Event('change',{bubbles:true}));return;}if(e.target.dataset.remove!==undefined){state.pools.splice(+e.target.dataset.remove,1);mark();inputs();}});
$('add').onclick=()=>{if(state.pools.length>=100){$('error').textContent='每位成員最多100個帳戶';return;}state.pools.push({name:'新券商',type:'質押',value:0,debt:0,cash:0,other:0,usePledge:false});broker=state.pools.length-1;mark();inputs();};
$('usePledge').onchange=e=>{if(broker<0)return;state.pools[broker].usePledge=e.target.checked;mark();inputs();};
$('drop').oninput=render;
$('history').onclick=e=>{const button=e.target.closest('[data-event]');if(!button)return;const event=RiskHistory.events.find(x=>x.id===button.dataset.event);$('drop').value=event.dropPercent;render();$('drop').dispatchEvent(new Event('change',{bubbles:true}));};
function openMember(e){const button=e.target.closest('[data-select-member]');if(!button)return;active=Number(button.dataset.selectMember);broker=-1;state=family[active].data;inputs();$('reportMember').focus();}
$('overview').onclick=openMember;$('memberCards').onclick=openMember;
$('demo').onclick=()=>{family=copy(familyDemo);active=0;broker=-1;state=family[0].data;mode='示範';$('mode').textContent='示範資料｜萬元';inputs();};
$('clear').onclick=()=>{family=[{name:'客戶',data:blank()}];active=0;broker=-1;state=family[0].data;mark();inputs();};
$('export').onclick=()=>{try{const payload=RiskData.normalize({version:2,date:$('date').value,mode,drop:Number($('drop').value),members:family});const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='client-risk.json';a.click();URL.revokeObjectURL(url);}catch(e){$('error').textContent=e.message;}};
$('import').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>1e6)throw Error('檔案需小於1MB');const payload=RiskData.normalize(JSON.parse(await file.text()));family=payload.members;active=0;broker=-1;state=family[0].data;if(payload.date)$('date').value=payload.date;$('drop').value=payload.drop;mark();inputs();window.dispatchEvent(new Event('workspace-replaced'));}catch(e){$('error').textContent='匯入失敗：'+e.message;}e.target.value='';};
$('member').onchange=e=>{family[active].data=state;active=Number(e.target.value);broker=-1;state=family[active].data;inputs();};
$('memberName').oninput=e=>{family[active].name=e.target.value;$('member').options[active].textContent=e.target.value||'未命名成員';mark();render();};
$('addMember').onclick=()=>{if(family.length>=30){$('error').textContent='最多30位成員';return;}family[active].data=state;family.push({name:'新成員 '+(family.length+1),data:blank()});active=family.length-1;state=family[active].data;broker=-1;mark();inputs();};
$('removeMember').onclick=()=>{if(family.length===1){$('error').textContent='至少保留一位成員；可使用清空移除數據';return;}if(!confirm('刪除「'+(family[active].name||'未命名成員')+'」與其帳戶？'))return;family.splice(active,1);active=Math.min(active,family.length-1);state=family[active].data;broker=-1;mark();inputs();};
$('date').addEventListener('input',render);
$('copySummary').onclick=async()=>{if($('error').textContent){$('copyStatus').textContent='請先修正輸入。';return;}try{await navigator.clipboard.writeText($('clientSummary').value);$('copyStatus').textContent='已複製摘要，可貼給客戶。';}catch{$('clientSummary').focus();$('clientSummary').select();$('copyStatus').textContent='請長按或使用 Ctrl+C 複製選取文字。';}};
$('dataChecks').onclick=e=>{const b=e.target.closest('[data-review-member]');if(b){active=Number(b.dataset.reviewMember);state=family[active].data;broker=Number(b.dataset.reviewBroker);showPage(true);document.querySelector('.singleEditor').open=true;inputs();$('broker').focus();}};
$('brokerOverview').onclick=e=>{const b=e.target.closest('[data-broker]');if(b){broker=Number(b.dataset.broker);showPage(true);document.querySelector('.singleEditor').open=true;inputs();$('broker').focus();}};
$('broker').onchange=e=>{broker=Number(e.target.value);inputs();};
$('brokerName').oninput=e=>{state.pools[broker].name=e.target.value;$('broker').options[broker+1].textContent=e.target.value||'未命名券商';mark();render();};
$('removeBroker').onclick=()=>{if(state.pools.length===1){$('error').textContent='至少保留一個券商帳戶';return;}if(!confirm('移除此券商及其部位？'))return;state.pools.splice(broker,1);broker=-1;mark();inputs();};
const bulkFields=[['cash','現金'],['other','未設質現股'],['pledgeValue','質押市值'],['pledgeDebt','質押借款'],['marginValue','融資市值'],['marginDebt','融資借款']];
function renderBulk(){
 $('bulkMembers').innerHTML=family.map((m,mi)=>`<section class="bulkMember"><div class="bulkHeading"><label>成員<input aria-label="成員 ${mi+1} 名稱" data-bulk-member="${mi}" data-bulk-key="memberName" value="${esc(m.name)}" maxlength="80"></label><span id="bulkTotal${mi}"></span><button data-bulk-add="${mi}">＋券商</button></div><div class="tablewrap"><table><thead><tr><th>券商／帳戶</th>${bulkFields.map(([k,l])=>`<th>${l}</th>`).join('')}<th>核對</th></tr></thead><tbody>${m.data.pools.map((p,pi)=>`<tr><td><input aria-label="${esc(m.name)} 帳戶 ${pi+1} 名稱" data-bulk-member="${mi}" data-bulk-pool="${pi}" data-bulk-key="name" value="${esc(p.name)}" maxlength="80"></td>${bulkFields.map(([k,l])=>`<td><input aria-label="${esc(m.name)} ${esc(p.name)} ${l}" type="number" min="0" step="0.01" data-bulk-member="${mi}" data-bulk-pool="${pi}" data-bulk-key="${k}" value="${p[k]}"></td>`).join('')}<td>${p.legacyCombined?`<button data-bulk-confirm="${mi}" data-bulk-pool="${pi}">確認拆分</button>`:'—'}</td></tr>`).join('')}</tbody></table></div></section>`).join('');
 updateBulkTotals();
}
function updateBulkTotals(){family.forEach((m,i)=>{const r=RiskEngine.calculate(m.data),el=$('bulkTotal'+i);if(el)el.textContent='股票 '+fmt(r.stock)+' · 借款 '+fmt(r.debt)+' · 淨資產 '+fmt(r.equity);});}
function showPage(entry){$('entryView').hidden=!entry;$('dashboardView').hidden=entry;document.querySelector('.advancedEditor').hidden=entry;$('entryTab').setAttribute('aria-selected',String(entry));$('dashboardTab').setAttribute('aria-selected',String(!entry));inputs();}
$('reportMember').onchange=e=>{active=Number(e.target.value);broker=-1;state=family[active].data;inputs();};
$('entryTab').onclick=()=>showPage(true);$('dashboardTab').onclick=()=>showPage(false);
$('bulkMembers').addEventListener('input',e=>{const d=e.target.dataset;if(d.bulkMember===undefined)return;const m=family[Number(d.bulkMember)],key=d.bulkKey;if(key==='memberName')m.name=e.target.value;else {const p=m.data.pools[Number(d.bulkPool)];p[key]=key==='name'?e.target.value:e.target.value===''?NaN:Number(e.target.value);}state=family[active].data;mark();render();updateBulkTotals();});
$('bulkMembers').onclick=e=>{const b=e.target.closest('button');if(!b)return;const d=b.dataset;if(d.bulkAdd!==undefined){const m=family[Number(d.bulkAdd)];if(m.data.pools.length>=100){$('error').textContent='每位成員最多100個帳戶';return;}m.data.pools.push({name:'新券商',type:'質押',value:0,debt:0,cash:0,other:0,usePledge:false});}else if(d.bulkConfirm!==undefined){family[Number(d.bulkConfirm)].data.pools[Number(d.bulkPool)].legacyCombined=false;}else return;state=family[active].data;mark();inputs();document.dispatchEvent(new Event('change',{bubbles:true}));};
$('bulkAddMember').onclick=()=>{$('addMember').click();document.dispatchEvent(new Event('change',{bubbles:true}));};
$('indexLevel').addEventListener('input',()=>{indexGeneration++;$('indexStatus').textContent='手動參考點位';render();});
let indexGeneration=0;
async function loadIndex(refresh=false){const generation=++indexGeneration;$('refreshIndex').disabled=true;try{const q=await RiskMarket.fetchQuote(refresh);if(generation!==indexGeneration)return;$('indexLevel').value=q.value;$('indexStatus').textContent=q.date+' '+(q.time||'收盤')+' · '+q.kind+(q.cached?'（上次取得）':'');render();}catch(e){if(generation===indexGeneration){$('indexStatus').textContent='指數暫無法取得，請手動輸入';$('indexLevel').placeholder='手動輸入';}}finally{$('refreshIndex').disabled=false;}}
$('refreshIndex').onclick=()=>loadIndex(true);
inputs();
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'read_leverage_risk',description:'Read household margin and pledge risks using fixed 130% trigger and 166% restoration target.',inputSchema:{type:'object',properties:{declinePercent:{type:'number',minimum:0,maximum:60}},required:['declinePercent'],additionalProperties:false},annotations:{readOnlyHint:true},execute(input){if(typeof input?.declinePercent!=='number'||!Number.isFinite(input.declinePercent)||input.declinePercent<0||input.declinePercent>60)throw Error('跌幅需介於0至60');family.forEach(m=>RiskEngine.validate(m.data));return RiskEngine.family(family,input.declinePercent/100);}})).catch(()=>{});}catch{}}

loadIndex();
