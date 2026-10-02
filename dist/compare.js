(function(){
let baseline=null,label='';
const metrics=[['淨資產',m=>RiskEngine.calculate(m.data).equity,'萬'],['股票',m=>RiskEngine.calculate(m.data).stock,'萬'],['借款',m=>RiskEngine.calculate(m.data).debt,'萬'],['現金',m=>m.data.cash,'萬'],['曝險倍數',m=>RiskEngine.capacity(m.data).leverage,'倍'],['原部位可扛',m=>{const c=RiskEngine.capacity(m.data).current;return c===null?null:c*100;},'%'],['現金＋現股可扛',m=>RiskEngine.capacity(m.data).cash*100,'%']];
function paint(){
 if(!baseline){$('snapshotResults').innerHTML='';$('compareStatus').textContent='尚未選擇比較資料';return;}
 $('compareStatus').textContent=(baseline.date||'未填日期')+' '+label+' → '+($('date').value||'目前')+' · 同一門檻重算';
 const names=[...new Set([...baseline.members,...family].map(m=>m.name))];
 $('snapshotResults').innerHTML=names.map(name=>{const old=baseline.members.filter(m=>m.name===name),now=family.filter(m=>m.name===name);if(old.length!==1||now.length!==1)return '<p>'+esc(name)+'：'+(old.length>1||now.length>1?'名稱重複，請使用唯一成員名称':'僅存在於其中一份資料')+'</p>';
 return '<h3>'+esc(name)+'</h3><div class="tablewrap"><table><thead><tr><th>指標</th><th>比較日</th><th>目前</th><th>變化</th></tr></thead><tbody>'+metrics.map(([n,get,unit])=>{const a=get(old[0]),b=get(now[0]),diff=a===null||b===null?null:b-a;return `<tr><td>${n}</td><td>${a===null?'—':fmt(a)+unit}</td><td>${b===null?'—':fmt(b)+unit}</td><td>${diff===null?'—':(diff>0?'+':'')+fmt(diff)+(unit==='%'?'個百分點':unit)}</td></tr>`;}).join('')+'</tbody></table></div>';}).join('');
}
function clear(){baseline=null;label='';paint();}
window.RiskCompare={set(payload,name=''){baseline=RiskData.normalize(payload);label=name;paint();},clear};
const originalRender=render;render=function(){originalRender();paint();};
$('all130').onchange=()=>{RiskEngine.setPolicy($('all130').checked);render();window.RiskExtras?.render(true);};
$('date').addEventListener('change',paint);$('clearCompare').onclick=clear;
$('chooseCompareCloud').onclick=()=>{showPage('entry');document.querySelector('.cloudPanel').open=true;$('caseList').focus();};
$('compareImport').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;if(f.size>2000000)throw Error('檔案過大');RiskCompare.set(JSON.parse(await f.text()),f.name);}catch(err){$('compareStatus').textContent='比較失敗：'+err.message;}finally{e.target.value='';}};
})();
