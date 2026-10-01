(function(root){
const events=[
 {id:'gfc2008',title:'2008 金融海嘯',short:'金融海嘯',from:'2008-05-19',to:'2008-11-20',peak:9295.20,trough:4089.93,sources:[{label:'證交所 2009 Fact Book',url:'https://www.twse.com.tw/downloads/zh/about/company/factbook/2009/0.01-5.htm'}]},
 {id:'covid2020',title:'2020 疫情急跌',short:'疫情急跌',from:'2020-01-14',to:'2020-03-19',peak:12179.81,trough:8681.34,sources:[{label:'證交所 2020年1月成交資訊',url:'https://wwwc.twse.com.tw/exchangeReport/FMTQIK?date=20200110&response=html'},{label:'證交所 2021 Fact Book',url:'https://www.twse.com.tw/downloads/zh/about/company/factbook/2021/0.0105.html'}]},
 {id:'bear2022',title:'2022 升息熊市',short:'升息熊市',from:'2022-01-04',to:'2022-10-25',peak:18526.35,trough:12666.12,sources:[{label:'證交所 2023 Fact Book',url:'https://www.twse.com.tw/downloads/zh/about/company/factbook/2023/0.0105.html'}]}
].map(e=>({...e,dropPercent:Number(((1-e.trough/e.peak)*100).toFixed(2))}));
root.RiskHistory={events};if(typeof module!=='undefined')module.exports=root.RiskHistory;
})(typeof window!=='undefined'?window:globalThis);
