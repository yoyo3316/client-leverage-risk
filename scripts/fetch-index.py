"""Refresh only public TAIEX data for the static Pages build."""
import json, urllib.request, datetime
from pathlib import Path
path=Path('dist/taiex.json')
def get(url):
 req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Accept':'application/json'})
 with urllib.request.urlopen(req,timeout=8) as r:return json.load(r)
def date(s):
 s=str(s);return f'{int(s[:-4])+(1911 if len(s)==7 else 0):04}-{s[-4:-2]}-{s[-2:]}'
quote=None
try:
 data=get('https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_t00.tw&json=1&delay=0')
 q=next(x for x in data['msgArray'] if x.get('c')=='t00' or x.get('ch')=='t00.tw')
 value=float(q['z'].replace(',',''));quote={'value':value,'date':date(q['d']),'time':q.get('t',''),'kind':'證交所行情（定時更新）'}
except Exception:pass
if not quote:
 try:
  data=get('https://openapi.twse.com.tw/v1/exchangeReport/MI_INDEX')
  q=max((x for x in data if x.get('指數')=='發行量加權股價指數'),key=lambda x:x['日期'])
  quote={'value':float(q['收盤指數'].replace(',','')),'date':date(q['日期']),'time':'收盤','kind':'證交所收盤'}
 except Exception:pass
if quote and 0<quote['value']<1000000:
 quote.update(fetchedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),cached=False)
 path.write_text(json.dumps(quote,ensure_ascii=False))
 print('Updated public index:',quote['date'],quote['time'])
else:
 old=json.loads(path.read_text());old['cached']=True;path.write_text(json.dumps(old,ensure_ascii=False));print('Source unavailable; retained dated previous index.')
