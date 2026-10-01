/* Supabase publishable key is public; access is enforced by database RLS. */
(async function(){
 const el=id=>document.getElementById(id);
 const status=(text,bad=false)=>{el('cloudStatus').textContent=text;el('cloudStatus').classList.toggle('cloudError',bad);};
 const snapshot=()=>RiskData.normalize({version:2,date:el('date').value,mode,drop:Number(el('drop').value),members:family});
 let client,user=null,current=null,baseline='',baselineName='',busy=false,cases=[],epoch=0;
 const fingerprint=()=>{try{return JSON.stringify(snapshot());}catch{return 'invalid';}};
 const dirty=()=>fingerprint()!==baseline||el('caseName').value.trim()!==baselineName;
 function controls(){
  el('cloudLogin').hidden=!!user;el('cloudWorkspace').hidden=!user;el('signOut').hidden=!user;
  el('cloudAccount').textContent=user?'已登入：'+user.email:'未登入';
  if(el('cloudSummaryStatus'))el('cloudSummaryStatus').textContent=user?'已登入 · 可儲存／載入':'登入後可儲存';
  for(const id of ['saveCloud','saveCopy','loadCloud','refreshCloud','newCloud','signOut'])el(id).disabled=busy||!user;
  el('caseList').disabled=busy;
  el('saveCloud').textContent=current?'更新這份檔案':'儲存新檔案';
  el('cloudDirty').textContent=dirty()?'尚有未儲存變更':'目前頁面沒有待儲存變更';
 }
 function newDraft(){current=null;el('caseName').value='';controls();}
 function resetPrivate(){
  family=[{name:'客戶',data:{cash:0,other:0,debtOther:0,pools:[]}}];active=0;state=family[0].data;mark();inputs();
  current=null;cases=[];el('caseList').innerHTML='<option value="">選擇已存檔案</option>';el('caseName').value='';baselineName='';baseline=fingerprint();
 }
 function showCases(selected=''){
  const select=el('caseList');select.replaceChildren(new Option('選擇已存檔案',''));
  cases.forEach(c=>select.add(new Option(c.name+' · '+new Date(c.updated_at).toLocaleString('zh-TW'),c.id)));
  select.value=selected;
 }
 async function list(selected=''){
  const account=user.id,version=epoch;
  const {data,error}=await client.from('risk_cases').select('id,name,revision,updated_at').eq('user_id',account).order('updated_at',{ascending:false}).limit(200);
  if(error)throw error;
  if(version!==epoch||user?.id!==account)return;
  cases=data||[];showCases(selected);
 }
 async function action(work){if(busy)return;busy=true;controls();try{await work();}catch(e){status(message(e),true);}finally{busy=false;controls();}}
 function message(e){
  if(e.code==='42501')return '此登入帳號沒有雲端存取權限，請使用管理者 Email。';
  if(e.code==='PGRST205'||e.code==='42P01')return '雲端資料庫尚未完成啟用。';
  if(e.code==='over_email_send_rate_limit')return '登入信寄送次數已達限制，請稍後再試。';
  if(e.code==='email_address_not_authorized')return '請使用 Supabase 管理者 Email 登入。';
  return e.message||'連線失敗，請稍後重試。';
 }
 try{
  if(!window.supabase)throw Error('登入元件載入失敗，仍可使用下方試算與JSON匯出。');
  client=window.supabase.createClient('https://wusjzebqdzcdoichuhcd.supabase.co','sb_publishable_dVoPExBEC0wbVX-Zy903ZQ_T6QXprNT',{auth:{storageKey:'leverage-risk-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  baseline=fingerprint();
  client.auth.onAuthStateChange((event,session)=>{
   const previous=user?.id,next=session?.user||null;user=next;
   if(previous!==next?.id){epoch++;if(previous)resetPrivate();}
   controls();
   if(event==='SIGNED_OUT'){resetPrivate();status('已登出，頁面上的私人資料已清除。');}
   if(next&&['SIGNED_IN','INITIAL_SESSION'].includes(event))setTimeout(()=>action(async()=>{await list();status('已登入。請選擇檔案載入，或填寫資料後手動儲存。');}),0);
  });
  const {data,error}=await client.auth.getSession();if(error)throw error;user=data.session?.user||null;controls();
  if(user)await action(async()=>{await list();status('已登入。請選擇雲端檔案再按載入。');});else status('登入後可手動儲存；輸入不會自動上傳。');
 }catch(e){status(message(e),true);el('sendLogin').disabled=true;return;}
 el('cloudLogin').onsubmit=e=>{e.preventDefault();action(async()=>{
  const email=el('loginEmail').value.trim();if(!email||!el('loginEmail').checkValidity())throw Error('請填寫有效 Email');
  const {error}=await client.auth.signInWithOtp({email,options:{shouldCreateUser:true,emailRedirectTo:'https://yoyo3316.github.io/client-leverage-risk/'}});
  if(error)throw error;status('登入信已寄出，請開啟信中的連結。請勿把登入連結分享給他人。');
 });};
 el('signOut').onclick=()=>action(async()=>{
  if(dirty()&&!confirm('尚有未儲存變更。確定登出並清除頁面資料？'))return;
  const {error}=await client.auth.signOut({scope:'local'});if(error)throw error;user=null;epoch++;resetPrivate();status('已登出，頁面上的私人資料已清除。');
 });
 async function save(copy=false){
  if(!user)throw Error('請先登入');const name=el('caseName').value.trim();if(!name||name.length>80)throw Error('請填寫1至80字的檔案名稱');
  const payload=snapshot(),atSave=JSON.stringify(payload),account=user.id,version=epoch;
  let query;
  if(current&&!copy){query=client.from('risk_cases').update({name,payload}).eq('id',current.id).eq('user_id',account).eq('revision',current.revision);}
  else query=client.from('risk_cases').insert({user_id:account,name,payload});
  const {data,error}=await query.select('id,name,revision,updated_at');if(error)throw error;
  if(version!==epoch||user?.id!==account)return;
  if(!data?.length)throw Error('這份檔案已在其他視窗更新，或沒有存取權限。請先匯出目前資料，再重新載入雲端檔案。');
  current=data[0];baseline=atSave;baselineName=name;try{await list(current.id);}catch{status('已儲存「'+name+'」，但清單重新整理失敗，請稍後重試。');return;}status('已儲存「'+name+'」。'+(dirty()?'儲存期間的新變更尚未上傳。':'可在其他裝置登入後載入。'));
 }
 el('saveCloud').onclick=()=>action(()=>save(false));el('saveCopy').onclick=()=>action(()=>save(true));
 el('refreshCloud').onclick=()=>action(async()=>{await list(el('caseList').value);status('已更新雲端檔案清單。');});
 el('loadCloud').onclick=()=>action(async()=>{
  const id=el('caseList').value;if(!id)throw Error('請先選擇雲端檔案');
  if(dirty()&&!confirm('載入會取代目前頁面未儲存的資料，確定載入？'))return;
  const beforeLoad=fingerprint(),beforeName=el('caseName').value,account=user.id,version=epoch;
  const {data,error}=await client.from('risk_cases').select('id,name,payload,revision,updated_at').eq('id',id).eq('user_id',account).maybeSingle();if(error)throw error;
  if(version!==epoch||user?.id!==account)return;if(!data)throw Error('檔案不存在或無存取權限');
  if((fingerprint()!==beforeLoad||el('caseName').value!==beforeName)&&!confirm('載入期間頁面又有變更，確定取代這些資料？'))return;
  const payload=RiskData.normalize(data.payload);
  family=payload.members;active=0;state=family[0].data;mode=payload.mode;el('date').value=payload.date;el('drop').value=payload.drop;
  el('mode').textContent=mode==='示範'?'已載入雲端示範數據，不代表客戶真實部位。金額單位：萬元。':'已載入雲端資料，請核對基準日與實際部位。金額單位：萬元。';inputs();
  current={id:data.id,name:data.name,revision:data.revision,updated_at:data.updated_at};el('caseName').value=data.name;baselineName=data.name;baseline=fingerprint();status('已載入「'+data.name+'」，最後儲存 '+new Date(data.updated_at).toLocaleString('zh-TW')+'。');
 });
 el('newCloud').onclick=()=>{newDraft();status('目前頁面將儲存為新檔案；原有雲端檔案保留。');};
 for(const id of ['demo','clear'])el(id).addEventListener('click',()=>{newDraft();controls();});
 window.addEventListener('workspace-replaced',newDraft);
 document.addEventListener('input',controls);document.addEventListener('change',controls);
 window.addEventListener('beforeunload',e=>{if(mode!=='示範'&&dirty()){e.preventDefault();e.returnValue='';}});
})();
