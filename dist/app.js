const $=id=>document.getElementById(id);
const fmt=n=>Number.isFinite(n)?n.toLocaleString('zh-TW',{maximumFractionDigits:2}):'—';
const pct=n=>Number.isFinite(n)?fmt(n)+'%':'—';
const copy=x=>JSON.parse(JSON.stringify(x));
const blank=()=>({cash:0,other:0,debtOther:0,pools:[]});
let mode='示範',active=0,broker=-1;
function selected(){return RiskData.scope(state,broker);}
function support(s){const ps=RiskEngine.calculate(s).pools.filter(p=>p.debt>0);return ps.length?Math.min(...ps.map(buffer)):null;}
function allSupport(s,on){return {...s,usePledge:on,pools:s.pools.map(p=>({...p,pledge:p.other??s.other,usePledge:on}))};}
const familyDemo=[{name:'媽媽',data:{cash:80,other:150,debtOther:0,pools:[{name:'中信',type:'融資',value:300,debt:180},{name:'凱基',type:'質押',value:400,debt:220}]}},{name:'小孩 A',data:{cash:20,other:80,debtOther:0,pools:[{name:'中信',type:'融資',value:150,debt:100}]}},{name:'小孩 B',data:{cash:30,other:100,debtOther:0,pools:[{name:'凱基',type:'質押',value:200,debt:90}]}}];
let family=copy(familyDemo),state=family[0].data;
$('date').value=new Date().toLocaleDateString('en-CA');
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function mark(){mode='使用者輸入';$('mode').textContent='目前為使用者輸入；請核對實際部位。金額單位：萬元。';}
function inputs(){
 family[active].data=state;family=family.map(m=>({name:m.name,data:RiskData.accounts(m.data)}));state=family[active].data;
 if(broker>=state.pools.length)broker=-1;
 $('member').innerHTML=family.map((m,i)=>`<option value="${i}" ${i===active?'selected':''}>${esc(m.name||'未命名成員')}</option>`).join('');
 $('memberName').value=family[active].name;
 $('broker').innerHTML='<option value="-1">全部券商整合總覽</option>'+state.pools.map((p,i)=>`<option value="${i}">${esc(p.name)}</option>`).join('');$('broker').value=broker;
 $('brokerFields').hidden=broker<0;$('removeBroker').hidden=broker<0;
 $('cashLabel').textContent=broker<0?'成員現金合計（唯讀）':'此券商可用現金';$('otherLabel').textContent=broker<0?'未設質現股合計（唯讀）':'此券商未設質現股';
 const s=selected();$('usePledge').checked=broker>=0&&s.usePledge;$('usePledge').disabled=broker<0;
 for(const key of ['cash','other','debtOther']){$(key).value=s[key];$(key).disabled=broker<0;}
 $('brokerName').value=broker>=0?state.pools[broker].name:'';
 $('pools').innerHTML=broker<0?'<p class="notice">整合模式只供查閱。選擇券商後分別輸入現金、現股、質押與融資，系統自動加總。</p>':`<article class="pool">${state.pools[broker].legacyCombined?'<p class="notice">舊合計部位暫列質押欄，請依實際資料拆分；總市值與借款沒有改變。</p>':''}${[['質押',[['pledgeValue','質押抵押品市值'],['pledgeDebt','質押借款金額']]],['融資',[['marginValue','融資股票市值'],['marginDebt','融資借款金額']]]].map(([title,fields])=>`<h3>${title}</h3><div class="fields">${fields.map(([key,label])=>`<label>${label}<input type="number" min="0" step="0.01" data-i="${broker}" data-key="${key}" value="${state.pools[broker][key]}"></label>`).join('')}</div>`).join('')}<p id="brokerAutoTotal" class="notice"></p><div id="result0" class="status"></div></article>`;
 render();
}
function buffer(p){return p.debt===0?null:p.value>0?Math.max(0,p.buffer*100):0;}
function viewVerdict(r){const v=RiskEngine.verdict(r);return {...v,label:v.label==='未觸發追繳'?'各券商擔保足夠':v.label==='現金足以補款'?'需補款，可用現金足夠':v.label};}
function render(){
 family[active].data=state;family.forEach(m=>RiskData.sync(m.data));
 try{family.forEach(m=>RiskEngine.validate(m.data));$('error').textContent='';}
 catch(e){$('error').textContent=e.message;for(const id of ['plainConclusion','familyAssets','brokerOverview','summary','overview','comparison','fundingChart','history','chart','pledgeComparison','currentIndicators'])$(id).innerHTML='';$('stress').textContent='請先修正輸入，再看試算結果。';$('familyStats').textContent='';$('selectedEvent').textContent='';$('historySource').textContent='';$('clientSummary').value='輸入有誤，請先修正再產生摘要。';$('summaryContext').textContent='';state.pools.forEach((p,i)=>{if($('result'+i))$('result'+i).textContent='請先修正輸入';});return;}
 if($('brokerAutoTotal'))$('brokerAutoTotal').textContent='自動合計：擔保市值 '+fmt(state.pools[broker].value)+' 萬／借款 '+fmt(state.pools[broker].debt)+' 萬';
 const scope=selected();const drop=Number($('drop').value)/100,now=RiskEngine.calculate(scope),r=RiskEngine.calculate(scope,drop),totalNow=RiskEngine.family(family),total=RiskEngine.family(family,drop);
 $('dropLabel').textContent=pct(drop*100);
 const bn=RiskEngine.calculate(state),br=RiskEngine.calculate(state,drop);
 $('brokerContext').textContent=family[active].name+'：股票下跌 '+pct(drop*100)+'；表內為調用前缺口，整合總覽可調用同一人現金，股票仍不跨券商互抵。';
 $('brokerOverview').innerHTML='<thead><tr><th>券商／帳戶</th><th>借款</th><th>目前維持率</th><th>可跌</th><th>情境維持率</th><th>需還本金</th><th>調用前現金缺口</th></tr></thead><tbody>'+bn.pools.map((p,i)=>{const q=br.pools[i],gap=Math.max(0,(q.breach?q.repay:0)-p.cash);return `<tr><td><button class="memberLink" data-broker="${i}">${esc(p.name)}</button></td><td>${fmt(p.debt)}</td><td>${p.ratio===null?'無借款':pct(p.ratio)}</td><td>${p.debt?pct(buffer(p)):'無借款'}</td><td>${q.ratio===null?'無借款':pct(q.ratio)}</td><td>${fmt(q.breach?q.repay:0)}</td><td class="${gap>0?'gap':''}">${fmt(gap)}</td></tr>`;}).join('')+'</tbody>';
 const event=RiskHistory.events.find(e=>Math.abs(e.dropPercent-drop*100)<1e-7);
 $('selectedEvent').textContent=event?event.title+'｜'+event.from+' → '+event.to:'自訂跌幅情境';
 const distance=support(scope);
 const verdict=viewVerdict(r),name=(family[active].name||'未命名成員')+'／'+(broker<0?'全部券商':state.pools[broker].name);
 $('memberFocus').textContent='目前查看：'+name+'｜'+(broker<0?'依各券商追加設定，獨立計算':scope.usePledge?'已模擬本券商現股投入擔保':'本券商未追加現股');
 $('stressTitle').textContent='② '+name+'：下跌後需要補多少？';$('curveTitle').textContent=name+'的淨資產隨跌幅變化';$('historyTitle').textContent='③ '+name+'：歷史股災壓力測試';$('summaryTitle').textContent='④ '+name+'：給客戶的摘要';
 const base=RiskEngine.calculate(allSupport(scope,false)),p=now.pools[0];
 $('currentIndicators').innerHTML=[['目前淨資產',fmt(now.equity)+' 萬'],['總借款',fmt(now.debt)+' 萬'],['借款／總資產',now.ltv===null?'—':pct(now.ltv)],['股票曝險倍數',now.leverage===null?'淨資產非正':fmt(now.leverage)+' 倍'],[broker<0?'券商帳戶數':'目前維持率',broker<0?scope.pools.length+' 個':p.ratio===null?'無借款':pct(p.ratio)],[broker<0?'最早券商追繳跌幅':'本券商可支援跌幅',distance===null?'無借款':pct(distance)]].map(([a,b])=>`<div class="metric"><span>${a}</span><strong>${b}</strong></div>`).join('');
 $('stress').innerHTML=`<div class="verdict ${verdict.tone}"><strong>${verdict.label}</strong><span>${esc(name)} · 股票下跌 ${pct(drop*100)} · ${broker<0?'各券商獨立計算':scope.usePledge?'已追加本券商現股':'未追加現股'}${r.cashGap>0?' · 缺口 '+fmt(r.cashGap)+' 萬':''}</span></div>`;
 $('summary').innerHTML=[['跌 '+pct(drop*100)+' 後淨資產',fmt(r.equity)+' 萬','本人目前 '+fmt(now.equity)+' 萬'],['本人需還本金',fmt(r.repay)+' 萬','各低於130%的帳戶還款至166%（估算）'],['本人可用現金',fmt(scope.cash)+' 萬','不計其他成員資金'],['本人現金缺口',fmt(r.cashGap)+' 萬',broker<0?'各券商需還本金減同一人現金合計':'單券商缺口；整合時可用本人其他券商現金']].map(([a,b,c])=>`<div class="metric"><span>${a}</span><strong>${b}</strong><small>${c}</small></div>`).join('');
 now.pools.forEach((p,i)=>{const q=r.pools[i],el=$('result'+i);if(!el)return;el.className='status '+(q.breach?'danger':p.breach?'warning':'');el.innerHTML=`<div class="accountStatus"><span>${selected().usePledge?'追加後':'目前'}維持率 <b>${p.ratio===null?'無借款':pct(p.ratio)}</b></span><span>可跌 <b>${p.debt===0?'—':pct(buffer(p))}</b></span></div><small>跌 ${pct(drop*100)} 後 ${q.ratio===null?'無借款':pct(q.ratio)}${q.breach?' · 整體需補款':' · 整體擔保足夠'}</small>`;});
 const a=support(allSupport(scope,false)),b=support(allSupport(scope,true));
 $('pledgeComparison').innerHTML=`<div class="supportCompare"><div><span>目前擔保可支援跌幅</span><strong>${a===null?'無借款':pct(a)}</strong></div><span class="supportArrow">→</span><div><span>全部現股投入後</span><strong>${b===null?'無借款':pct(b)}</strong></div></div><p class="hint">${esc(name)}本人未設質現股 ${fmt(scope.other)} 萬 · ${broker<0?'依各券商設定':scope.usePledge?'目前已套用全投入':'目前未套用全投入'}。此為從目前價格起算的130%門檻，不含現金還款，不隨情境滑桿改變。</p>`;
 drawCurve(now,r,drop,distance);
 renderOverview(totalNow,total,drop);
 renderHistory(event);
 const cap=RiskEngine.capacity(scope),dropText=n=>n===null?'無借款':pct(Math.floor(n*10000+1e-7)/100);
 $('plainConclusion').innerHTML=`<div class="capacityGrid">${[['不追加：何時追繳',dropText(cap.current),'只看目前擔保'],['加現股：何時追繳',dropText(cap.stocks),'全部未設質現股加入擔保'],['再加現金：可支援到',dropText(cap.cash),'補款快照估算，淨資產未轉負']].map(([a,b,c])=>`<div class="metric"><span>${a}</span><strong>${b}</strong><small>${c}</small></div>`).join('')}</div><p><b>曝險 ${cap.leverage===null?'無法計算':fmt(cap.leverage)+' 倍'}：</b>${cap.leverage===null?'淨資產非正，須檢視借款。':'股票跌10%，淨資產約少 '+pct(cap.leverage*10)+'。'+(cap.leverage>1?'損失會被放大；倍數越高，縮水越快。':'現金減少了淨資產的波動。')}</p><p><b>下跌 ${pct(drop*100)} 的情境：</b>${r.cashGap>0?'目前現金不足，缺 '+fmt(r.cashGap)+' 萬。':r.equity<=0&&r.debt>0?'淨資產非正，資產耗盡風險需優先處理。':r.breached?'需補款 '+fmt(r.repay)+' 萬，本人可用現金足夠。':'目前尚未觸及補款門檻。'}</p><p class="hint">前兩項為130%追繳門檻；第三項包含現金還款至166%的能力，限制淨資產不可轉負。第三項是一次低點試算，未模擬沿途多次補款，不保證能扛到該跌幅。曝險倍數不是安全保證。</p>`;
 $('clientSummary').value=RiskSummary.generate([{name,data:scope}],drop,$('date').value,event?.title||'');$('summaryContext').textContent=name+' · 股票同步下跌 '+pct(drop*100)+' · '+(event?.title||'自訂情境')+' · '+(broker<0?'依各券商追加設定':scope.usePledge?'已追加本券商現股':'未追加現股');$('copyStatus').textContent='';

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
function renderOverview(now,total,drop){
 $('familyAssets').innerHTML=[['家族股票市值',fmt(now.stock)+' 萬'],['家族借款',fmt(now.debt)+' 萬'],['家族淨資產',fmt(now.equity)+' 萬'],['家族現金',fmt(family.reduce((n,m)=>n+m.data.cash,0))+' 萬']].map(([a,b])=>`<div class="metric"><span>${a}</span><strong>${b}</strong></div>`).join('');
 $('overviewContext').textContent='本區情境：全部股票下跌 '+pct(drop*100)+'。追加設定依各成員勾選狀態。';
 $('equityChartTitle').textContent='股票下跌 '+pct(drop*100)+' 後，淨資產保留多少';$('cashChartTitle').textContent='股票下跌 '+pct(drop*100)+' 後，補款需要與可用現金';
 $('familyStats').textContent=family.length+' 位成員 · '+total.breached+' 個券商帳戶需補款';
 $('overview').innerHTML='<thead><tr><th>成員</th><th>淨資產</th><th>借款</th><th>曝險倍數</th><th>目前可跌</th><th>加現股後可跌</th><th>再加現金可支援</th><th>情境現金缺口</th></tr></thead><tbody>'+family.map((m,i)=>{const c=RiskEngine.capacity(m.data),r=total.members[i].result,n=now.members[i].result,t=v=>v===null?'無借款':pct(Math.floor(v*10000+1e-7)/100);return `<tr><td><button class="memberLink" data-select-member="${i}">${esc(m.name)}${i===active?' · 查看中':''}</button></td><td>${fmt(n.equity)}</td><td>${fmt(n.debt)}</td><td>${c.leverage===null?'淨資產非正':fmt(c.leverage)+' 倍'}</td><td>${t(c.current)}</td><td>${t(c.stocks)}</td><td>${t(c.cash)}</td><td class="${r.cashGap>0?'gap':''}">${fmt(r.cashGap)}</td></tr>`;}).join('')+'</tbody>';
 const maxEq=Math.max(1,...now.members.flatMap((m,i)=>[Math.abs(m.result.equity),Math.abs(total.members[i].result.equity)]));
 $('comparison').innerHTML=total.members.map((m,i)=>{const a=now.members[i].result.equity,b=m.result.equity;return `<div class="compareRow"><strong>${esc(m.name||'未命名成員')}</strong><div>${bar(a,maxEq,'navy','目前')}${bar(b,maxEq,b<0?'red':'teal','情境後')}</div></div>`;}).join('');
 const maxCash=Math.max(1,...total.members.flatMap((m,i)=>[family[i].data.cash,m.result.repay]));
 $('fundingChart').innerHTML=total.members.map((m,i)=>`<div class="compareRow"><strong>${esc(m.name||'未命名成員')}</strong><div>${bar(family[i].data.cash,maxCash,'navy','現金')}${bar(m.result.repay,maxCash,m.result.cashGap>0?'red':'amber','需還')}${m.result.cashGap>0?`<span class="gap">不足 ${fmt(m.result.cashGap)} 萬</span>`:'<span class="fundingOk">無現金缺口</span>'}</div></div>`).join('');

}
function bar(value,max,color,label){return `<div class="barlabel"><span>${label}</span><b>${fmt(value)} 萬${value<0?'（負值）':''}</b></div><div class="barTrack"><div class="bar ${color}" style="width:${Math.abs(value)/max*100}%"></div></div>`;}
function renderHistory(selectedEvent){
 $('history').innerHTML=RiskHistory.events.map(e=>{const r=RiskEngine.calculate(selected(),e.dropPercent/100),v=viewVerdict(r);return `<button class="eventCard ${selectedEvent?.id===e.id?'selected':''}" data-event="${e.id}" aria-pressed="${selectedEvent?.id===e.id}"><span class="eventName">${e.title}</span><strong>−${pct(e.dropPercent)}</strong><span class="badge ${v.tone}">${v.label}</span><span class="eventNumbers">${esc(family[active].name)}情境後淨資產 <b>${fmt(r.equity)} 萬</b><br>本人現金缺口 <b>${fmt(r.cashGap)} 萬</b></span><small>${e.from} → ${e.to}</small></button>`;}).join('');
 const list=selectedEvent?[selectedEvent]:RiskHistory.events;
 $('historySource').innerHTML=list.map(e=>`<div>${esc(e.title)}：${fmt(e.peak)} → ${fmt(e.trough)} 點（收盤跌幅 ${pct(e.dropPercent)}） · ${e.sources.map(s=>`<a href="${s.url}" target="_blank" rel="noopener noreferrer">${esc(s.label)}</a>`).join('、')}</div>`).join('');
}
for(const key of ['cash','other','debtOther'])$(key).addEventListener('input',e=>{if(broker<0)return;state.pools[broker][key]=e.target.value===''?NaN:Number(e.target.value);mark();render();});
$('pools').addEventListener('input',e=>{const {i,key}=e.target.dataset;if(key){state.pools[+i][key]=['name','type'].includes(key)?e.target.value:e.target.value===''?NaN:Number(e.target.value);state.pools[+i].legacyCombined=false;mark();render();}});
$('pools').addEventListener('click',e=>{if(e.target.dataset.remove!==undefined){state.pools.splice(+e.target.dataset.remove,1);mark();inputs();}});
$('add').onclick=()=>{if(state.pools.length>=100){$('error').textContent='每位成員最多100個帳戶';return;}state.pools.push({name:'新券商',type:'質押',value:0,debt:0,cash:0,other:0,usePledge:false});broker=state.pools.length-1;mark();inputs();};
$('usePledge').onchange=e=>{if(broker<0)return;state.pools[broker].usePledge=e.target.checked;mark();inputs();};
$('drop').oninput=render;
$('history').onclick=e=>{const button=e.target.closest('[data-event]');if(!button)return;const event=RiskHistory.events.find(x=>x.id===button.dataset.event);$('drop').value=event.dropPercent;render();$('drop').dispatchEvent(new Event('change',{bubbles:true}));};
$('overview').onclick=e=>{const button=e.target.closest('[data-select-member]');if(!button)return;active=Number(button.dataset.selectMember);broker=-1;state=family[active].data;inputs();$('member').focus();};
$('demo').onclick=()=>{family=copy(familyDemo);active=0;broker=-1;state=family[0].data;mode='示範';$('mode').textContent='目前為示範數據，不代表客戶真實部位。金額單位：萬元。';inputs();};
$('clear').onclick=()=>{family=[{name:'客戶',data:blank()}];active=0;broker=-1;state=family[0].data;mark();inputs();};
$('export').onclick=()=>{try{const payload=RiskData.normalize({version:2,date:$('date').value,mode,drop:Number($('drop').value),members:family});const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='client-risk.json';a.click();URL.revokeObjectURL(url);}catch(e){$('error').textContent=e.message;}};
$('import').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>1e6)throw Error('檔案需小於1MB');const payload=RiskData.normalize(JSON.parse(await file.text()));family=payload.members;active=0;broker=-1;state=family[0].data;if(payload.date)$('date').value=payload.date;$('drop').value=payload.drop;mark();inputs();window.dispatchEvent(new Event('workspace-replaced'));}catch(e){$('error').textContent='匯入失敗：'+e.message;}e.target.value='';};
$('member').onchange=e=>{family[active].data=state;active=Number(e.target.value);broker=-1;state=family[active].data;inputs();};
$('memberName').oninput=e=>{family[active].name=e.target.value;$('member').options[active].textContent=e.target.value||'未命名成員';mark();render();};
$('addMember').onclick=()=>{if(family.length>=30){$('error').textContent='最多30位成員';return;}family[active].data=state;family.push({name:'新成員 '+(family.length+1),data:blank()});active=family.length-1;state=family[active].data;broker=-1;mark();inputs();};
$('removeMember').onclick=()=>{if(family.length===1){$('error').textContent='至少保留一位成員；可使用清空移除數據';return;}if(!confirm('刪除「'+(family[active].name||'未命名成員')+'」與其帳戶？'))return;family.splice(active,1);active=Math.min(active,family.length-1);state=family[active].data;broker=-1;mark();inputs();};
$('date').addEventListener('input',render);
$('copySummary').onclick=async()=>{if($('error').textContent){$('copyStatus').textContent='請先修正輸入。';return;}try{await navigator.clipboard.writeText($('clientSummary').value);$('copyStatus').textContent='已複製摘要，可貼給客戶。';}catch{$('clientSummary').focus();$('clientSummary').select();$('copyStatus').textContent='請長按或使用 Ctrl+C 複製選取文字。';}};
$('brokerOverview').onclick=e=>{const b=e.target.closest('[data-broker]');if(b){broker=Number(b.dataset.broker);inputs();$('broker').focus();}};
$('broker').onchange=e=>{broker=Number(e.target.value);inputs();};
$('brokerName').oninput=e=>{state.pools[broker].name=e.target.value;$('broker').options[broker+1].textContent=e.target.value||'未命名券商';mark();render();};
$('removeBroker').onclick=()=>{if(state.pools.length===1){$('error').textContent='至少保留一個券商帳戶';return;}if(!confirm('移除此券商及其部位？'))return;state.pools.splice(broker,1);broker=-1;mark();inputs();};
inputs();
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'read_leverage_risk',description:'Read household margin and pledge risks using fixed 130% trigger and 166% restoration target.',inputSchema:{type:'object',properties:{declinePercent:{type:'number',minimum:0,maximum:60}},required:['declinePercent'],additionalProperties:false},annotations:{readOnlyHint:true},execute(input){if(typeof input?.declinePercent!=='number'||!Number.isFinite(input.declinePercent)||input.declinePercent<0||input.declinePercent>60)throw Error('跌幅需介於0至60');family.forEach(m=>RiskEngine.validate(m.data));return RiskEngine.family(family,input.declinePercent/100);}})).catch(()=>{});}catch{}}
