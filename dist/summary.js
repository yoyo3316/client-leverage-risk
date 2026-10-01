(function(root){
function generate(members,drop,date='',eventName=''){
 const E=root.RiskEngine,fmt=n=>Number.isFinite(n)?n.toLocaleString('zh-TW',{maximumFractionDigits:2}):'無法計算',pct=n=>fmt(n)+'%',total=E.family(members,drop);
 const lines=[`部位風險摘要｜基準日：${date||'未填寫'}`,`情境：全部股票同步下跌 ${pct(drop*100)}${eventName?'（'+eventName+'）':''}。金額單位：萬元。`,''];
 for(const m of members){
  if(m.data.pools.every(p=>p.cash!==undefined)){
   const s=m.data,now=E.calculate(s),r=E.calculate(s,drop),c=E.capacity(s);
   const threshold=n=>n===null?'沒有借款，不會因維持率追繳':n<=0?'目前已到追繳門檻':`約下跌 ${pct(n*100)} 才碰到追繳門檻`;
   lines.push(`【${m.name}】`,
    `① 目前不追加股票、不動用現金：${threshold(c.current)}。`,
    `② 把未設質現股 ${fmt(c.stockAmount)} 萬全部加入各自券商擔保後：${threshold(c.stocks)}。`,
    `③ 再動用現金 ${fmt(c.cashAmount)} 萬還款：估計可支援到股票下跌 ${pct(Math.floor(c.cash*10000+1e-7)/100)}。此時可能已追繳，但模型內現金仍足以補款，且淨資產未轉負。`,
    `④ 曝險倍數：${c.leverage===null?'淨資產非正，無法計算，需優先檢視借款。':`${fmt(c.leverage)} 倍。股票跌10%，目前淨資產約減少 ${pct(c.leverage*10)}。${c.leverage>1?'損失會被放大；倍數越高，淨資產縮水越快。':'現金降低了股票對整體淨資產的影響。'}`}`,
    '安全判斷：倍數本身不能保證安全，要一起看可跌幅、現金缺口與持股集中程度。',
    `本次股票下跌 ${pct(drop*100)} 的情境，依目前勾選設定：${r.cashGap>0?`還需準備 ${fmt(r.cashGap)} 萬，現金不足。`:r.equity<=0&&r.debt>0?'淨資產已非正，即使可補款仍有資產耗盡風險。':r.breached?`已碰到補款門檻，需還 ${fmt(r.repay)} 萬，目前現金足夠。`:'未碰到補款門檻。'}`,
    `目前股票 ${fmt(now.stock)} 萬、借款 ${fmt(now.debt)} 萬、淨資產 ${fmt(now.equity)} 萬。`,
    '前兩項為最早追繳；現金支援是低點估算，未模擬沿途多次補款。',
    '股票含未設質現股同步下跌；現金限同一人調用。實際追繳依契約與到帳時間。','');continue;
  }
  const s=m.data,base=E.calculate({...s,usePledge:false}),now=E.calculate(s),r=E.calculate(s,drop),a=base.pools[0],b=now.pools[0];
  const ratio=p=>p?.ratio===null?'無借款':pct(p.ratio);
  const buffer=p=>p?.debt?pct(Math.max(0,p.value>0?p.buffer*100:0)):'無借款';
  const risk=r.cashGap>0?'情境現金不足':r.equity<=0&&r.debt>0?'情境淨資產非正':r.breached?'整體擔保不足，現金足以支援':'情境下整體擔保足夠';
  lines.push(`【${m.name||'未命名成員'}｜${risk}】`,
   `目前股票總市值 ${fmt(base.stock)}、總借款 ${fmt(base.debt)}、淨資產 ${fmt(base.equity)}、可動用現金 ${fmt(s.cash)}。`,
   `借款／總資產 ${base.ltv===null?'無資產，無法計算':pct(base.ltv)}；股票曝險／淨資產 ${base.leverage===null?'淨資產非正，無法計算':fmt(base.leverage)+' 倍'}。`,
   `原始整體維持率 ${ratio(a)}；目前擔保可支援跌幅 ${buffer(a)}。`,
   `未設質現股 ${fmt(s.other)}；全部投入後可支援跌幅 ${buffer(E.calculate({...s,usePledge:true}).pools[0])}。本次情境${s.usePledge?'已套用全部現股投入':'未套用追加股票'}。`,
   `股票下跌 ${pct(drop*100)} 後：淨資產 ${fmt(r.equity)}、整體維持率 ${ratio(r.pools[0])}；估計需還本金 ${fmt(r.repay)}、現金缺口 ${fmt(r.cashGap)}。`,
   r.cashGap>0?'需確認補款來源與各券商期限；合計缺口不代表個別券商實際通知金額。':r.breached?'需核對現金可用時間與各券商實際補繳要求。':'合計擔保足夠仍須查看個別券商維持率及追繳通知。','');
 }
 if(members.every(m=>m.data.pools.every(p=>p.cash!==undefined)))return lines.join('\n');
 lines.push(`${members.length===1?'此成員合計':'家庭合計'}：股票下跌 ${pct(drop*100)} 後淨資產 ${fmt(total.equity)}、需還本金 ${fmt(total.repay)}、各成員現金缺口合計 ${fmt(total.cashGap)}（不跨成員互抵）。`,
 '指標說明：借款比例＝借款÷（股票＋現金）；股票曝險倍數＝股票÷淨資產；可支援跌幅為整體維持率碰到130%的位置，不含現金還款效果。',
 '各券商帳戶獨立計算；未分券商的舊合計資料無法判斷個別券商風險。假設股票同步下跌、擔保按市值100%認列，追加股票可及時投入；未計利息、個股差異與轉入等待時間。歷史情境是跌幅壓力快照，非逐日回測。');
 return lines.join('\n');
}
root.RiskSummary={generate};if(typeof module!=='undefined')module.exports=root.RiskSummary;
})(typeof globalThis!=='undefined'?globalThis:this);
