(function(root){
const number=x=>typeof x==='string'&&x.trim()===''?NaN:Number(String(x).replaceAll(',',''));
function date(x){const s=String(x||'');if(/^\d{7}$/.test(s))return String(Number(s.slice(0,3))+1911)+'-'+s.slice(3,5)+'-'+s.slice(5);if(/^\d{8}$/.test(s))return s.slice(0,4)+'-'+s.slice(4,6)+'-'+s.slice(6);if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;throw Error('指數日期無效');}
function validate(q){if(!q||!Number.isFinite(q.value)||q.value<=0||q.value>1000000)throw Error('指數無效');date(q.date);return q;}
function parseLive(data){const q=data?.msgArray?.find(x=>x.c==='t00'||x.ch==='t00.tw');if(!q)throw Error('無加權指數');const value=number(q.z);return validate({value,date:date(q.d),time:q.t||'',kind:'證交所行情'});}
function parseClose(data){if(!Array.isArray(data))throw Error('無收盤行情');const rows=data.filter(x=>x['指數']==='發行量加權股價指數').sort((a,b)=>String(b['日期']).localeCompare(String(a['日期'])));const q=rows[0];if(!q)throw Error('無加權指數');return validate({value:number(q['收盤指數']),date:date(q['日期']),time:'收盤',kind:'證交所收盤'});}
function point(level,drop){return Number.isFinite(level)&&level>0&&Number.isFinite(drop)&&drop>=0&&drop<=1?Math.round(level*(1-drop)*100)/100:null;}
async function get(url){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),6500);try{const r=await fetch(url,{signal:controller.signal,credentials:'omit',cache:'no-store'});if(!r.ok)throw Error('讀取失敗');return await r.json();}finally{clearTimeout(timer);}}
async function fetchQuote(refresh=false){if(refresh){for(const [url,parse] of [['https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_t00.tw&json=1&delay=0',parseLive],['https://openapi.twse.com.tw/v1/exchangeReport/MI_INDEX',parseClose]]){try{return parse(await get(url));}catch{}}}return validate(await get('taiex.json'));}
root.RiskMarket={point,parseLive,parseClose,validate,fetchQuote};if(typeof module!=='undefined')module.exports=root.RiskMarket;
})(typeof window!=='undefined'?window:globalThis);
