/* Supabase publishable key is public; access is enforced by database RLS. */
(async function(){
 const el=id=>document.getElementById(id);
 const status=(text,bad=false)=>{el('cloudStatus').textContent=text;el('cloudStatus').classList.toggle('cloudError',bad);};
 const snapshot=()=>RiskData.normalize({version:2,date:el('date').value,mode,drop:Number(el('drop').value),members:family});
 let client,user=null,current=null,baseline='',baselineName='',busy=false,cases=[],epoch=0;
 const fingerprint=()=>{try{return JSON.stringify(snapshot());}catch{return 'invalid';}};
 const dirty=()=>fingerprint()!==baseline||el('caseName').value.trim()!==baselineName;
 function controls(){
  el('passwordLogin').hidden=!!user;el('passwordHint').hidden=!!user;el('linkLoginTools').hidden=!!user;el('cloudLogin').hidden=!!user;if(user)el('cloudVerify').hidden=true;el('cloudWorkspace').hidden=!user;el('signOut').hidden=!user;
  el('cloudAccount').textContent=user?'已登入：'+user.email:'未登入';
  if(el('cloudSummaryStatus'))el('cloudSummaryStatus').textContent=user?(dirty()?'尚有未儲存變更':'已登入 · 可儲存／載入'):'登入後可儲存';
  const changed=dirty(),draft=!current;el('saveBadge').textContent=mode==='示範'&&draft&&!changed?'示範資料':changed?'尚有未儲存變更':current?'已儲存至雲端':'尚未儲存至雲端';el('saveState').classList.toggle('unsaved',changed);
  el('lastSaved').textContent=current?'編輯中：'+current.name+'｜最後儲存：'+new Date(current.updated_at).toLocaleString('zh-TW'):(user?'新草稿｜按下儲存才會上傳':'尚未登入｜輸入只留在此頁面');
  el('passwordSignIn').disabled=busy||!!user;el('setPassword').disabled=busy||!user;el('sendLogin').disabled=busy||!!user;el('verifyLogin').disabled=busy||!!user;
  for(const id of ['saveCloud','saveCopy','loadCloud','refreshCloud','newCloud','signOut'])el(id).disabled=busy||!user;
  el('caseList').disabled=busy;el('caseArea').disabled=busy||!user;
  const trash=el('caseArea').value==='trash',selected=cases.find(c=>c.id===el('caseList').value);el('deleteCloud').hidden=trash;el('restoreCloud').hidden=!trash;el('deleteCloud').disabled=busy||!user||!selected||archived(selected);el('restoreCloud').disabled=busy||!user||!selected||!archived(selected);el('loadCloud').disabled=busy||!user||trash||!selected;
  el('saveCloud').textContent=current?'更新這份檔案':'儲存新檔案';
  el('cloudDirty').textContent=dirty()?'尚有未儲存變更':'目前頁面沒有待儲存變更';
 }
 function newDraft(){current=null;el('caseName').value='';controls();}
 function resetPrivate(){
  el('caseArea').value='active';
  family=[{name:'客戶',data:{cash:0,other:0,debtOther:0,pools:[]}}];active=0;state=family[0].data;mark();inputs();
  current=null;cases=[];el('caseList').innerHTML='<option value="">選擇已存檔案</option>';el('caseName').value='';baselineName='';baseline=fingerprint();
 }
 function archived(c){return c.trashed===true||c.trashed==='true';}
 function showCases(selected=''){
  const select=el('caseList');select.replaceChildren(new Option('選擇已存檔案',''));
  cases.filter(c=>archived(c)===(el('caseArea').value==='trash')).forEach(c=>select.add(new Option(c.name+' · '+new Date(c.updated_at).toLocaleString('zh-TW'),c.id)));
  select.value=selected;
 }
 async function list(selected=''){
  const account=user.id,version=epoch;
  const {data,error}=await client.from('risk_cases').select('id,name,revision,updated_at,trashed:payload->>_trashed').eq('user_id',account).order('updated_at',{ascending:false}).limit(200);
  if(error)throw error;
  if(version!==epoch||user?.id!==account)return;
  cases=data||[];showCases(selected);
 }
 async function action(work){if(busy)return;busy=true;controls();try{await work();}catch(e){status(message(e),true);}finally{busy=false;controls();}}
 function message(e){
  if(e.code==='invalid_credentials')return 'Email 或密碼不正確。若尚未設定密碼，請先在已登入的裝置設定。';
  if(e.code==='reauthentication_needed')return '請用登入信重新驗證身分，再設定密碼。';
  if(e.code==='weak_password')return '密碼不符合要求，請使用更長且較難猜的密碼。';
  if(e.code==='otp_expired')return '登入連結已使用或過期，請重新寄送，並在要登入的裝置驗證。';
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
   if(previous!==next?.id){for(const id of ['loginPassword','newPassword','confirmPassword'])el(id).value='';epoch++;if(previous)resetPrivate();}
   controls();
   if(event==='SIGNED_OUT'){resetPrivate();status('已登出，頁面上的私人資料已清除。');}
   if(next&&['SIGNED_IN','INITIAL_SESSION'].includes(event))setTimeout(()=>action(async()=>{await list();status('已登入。請選擇檔案載入，或填寫資料後手動儲存。');}),0);
  });
  const {data,error}=await client.auth.getSession();if(error)throw error;user=data.session?.user||null;controls();
  if(user)await action(async()=>{await list();status('已登入。請選擇雲端檔案再按載入。');});else status('登入後可手動儲存；輸入不會自動上傳。');
 }catch(e){status(message(e),true);for(const id of ['sendLogin','passwordSignIn','setPassword','verifyLogin'])el(id).disabled=true;return;}
 el('passwordLogin').onsubmit=e=>{e.preventDefault();return action(async()=>{
  const email=el('passwordEmail').value.trim();if(!email||!el('passwordEmail').checkValidity())throw Error('請填寫有效 Email');
  const password=el('loginPassword').value;if(!password)throw Error('請輸入密碼');
  try{const {error}=await client.auth.signInWithPassword({email,password});if(error)throw error;status('已登入此裝置。請選擇雲端檔案載入。');}finally{el('loginPassword').value='';}
 });};
 el('passwordSetup').onsubmit=e=>{e.preventDefault();return action(async()=>{
  if(!user)throw Error('請先登入');const password=el('newPassword').value;
  if(password.length<8)throw Error('新密碼至少8字');if(password!==el('confirmPassword').value)throw Error('兩次密碼不一致');
  try{const {error}=await client.auth.updateUser({password});if(error)throw error;status('登入密碼已設定。其他裝置現在可用相同 Email＋密碼登入。');}finally{el('newPassword').value='';el('confirmPassword').value='';}
 });};
 el('cloudLogin').onsubmit=e=>{e.preventDefault();return action(async()=>{
  const email=el('loginEmail').value.trim();if(!email||!el('loginEmail').checkValidity())throw Error('請填寫有效 Email');
  const {error}=await client.auth.signInWithOtp({email,options:{shouldCreateUser:true,emailRedirectTo:'https://yoyo3316.github.io/client-leverage-risk/'}});
  if(error)throw error;el('cloudVerify').hidden=false;status('驗證信已寄出。請在電腦開啟信中連結，或把尚未使用的信中連結貼到下方。');
 });};
 el('cloudVerify').onsubmit=e=>{e.preventDefault();return action(async()=>{let link;try{link=new URL(el('loginToken').value.trim());}catch{throw Error('請貼上信中的完整登入連結');}if(link.protocol!=='https:'||link.hostname!=='wusjzebqdzcdoichuhcd.supabase.co'||link.pathname!=='/auth/v1/verify'||!['magiclink','signup'].includes(link.searchParams.get('type'))||!link.searchParams.get('token'))throw Error('請使用此網站寄出的原始登入連結，不接受其他網址');const token_hash=link.searchParams.get('token'),type=link.searchParams.get('type');el('loginToken').value='';const {error}=await client.auth.verifyOtp({token_hash,type});if(error)throw error;el('loginToken').value='';status('此裝置已完成登入。');});};
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
  current=data[0];el('caseArea').value='active';baseline=atSave;baselineName=name;try{await list(current.id);}catch{status('已儲存「'+name+'」，但清單重新整理失敗，請稍後重試。');return;}status('已儲存「'+name+'」。'+(dirty()?'儲存期間的新變更尚未上傳。':'可在其他裝置登入後載入。'));
 }
 el('saveCloud').onclick=()=>action(()=>save(false));el('saveCopy').onclick=()=>action(()=>save(true));
 el('refreshCloud').onclick=()=>action(async()=>{await list(el('caseList').value);status('已更新雲端檔案清單。');});
 el('loadCloud').onclick=()=>action(async()=>{
  const id=el('caseList').value;if(!id)throw Error('請先選擇雲端檔案');if(el('caseArea').value==='trash')throw Error('請先還原垃圾桶檔案再載入');
  if(dirty()&&!confirm('載入會取代目前頁面未儲存的資料，確定載入？'))return;
  const beforeLoad=fingerprint(),beforeName=el('caseName').value,account=user.id,version=epoch;
  const {data,error}=await client.from('risk_cases').select('id,name,payload,revision,updated_at').eq('id',id).eq('user_id',account).maybeSingle();if(error)throw error;
  if(version!==epoch||user?.id!==account)return;if(!data)throw Error('檔案不存在或無存取權限');if(data.payload?._trashed)throw Error('檔案已移至垃圾桶，請重新整理清單並先還原');
  if((fingerprint()!==beforeLoad||el('caseName').value!==beforeName)&&!confirm('載入期間頁面又有變更，確定取代這些資料？'))return;
  const payload=RiskData.normalize(data.payload);
  family=payload.members;active=0;state=family[0].data;mode=payload.mode;el('date').value=payload.date;el('drop').value=payload.drop;
  el('mode').textContent=mode==='示範'?'雲端示範資料｜萬元':'雲端資料｜萬元';inputs();
  current={id:data.id,name:data.name,revision:data.revision,updated_at:data.updated_at};el('caseName').value=data.name;baselineName=data.name;baseline=fingerprint();status('已載入「'+data.name+'」，最後儲存 '+new Date(data.updated_at).toLocaleString('zh-TW')+'。');
 });
 async function moveTrash(restore){
  if(!user)throw Error('請先登入');const selected=cases.find(c=>c.id===el('caseList').value);if(!selected)throw Error('請先選擇檔案');
  if(!confirm((restore?'還原「':'將「')+selected.name+(restore?'」到已存檔案？':'」移至垃圾桶？可稍後還原。')+(!restore&&current?.id===selected.id?'\n目前頁面部位將保留為尚未儲存的新草稿。':'')))return;
  const account=user.id,version=epoch;
  const {data:row,error:readError}=await client.from('risk_cases').select('id,name,payload,revision,updated_at').eq('id',selected.id).eq('user_id',account).eq('revision',selected.revision).maybeSingle();if(readError)throw readError;
  if(version!==epoch||user?.id!==account)return;if(!row)throw Error('檔案已在其他視窗更新，請重新整理清單後再操作');
  const payload={...row.payload};if(restore){delete payload._trashed;delete payload._trashedAt;}else{payload._trashed=true;payload._trashedAt=new Date().toISOString();}
  const {data,error}=await client.from('risk_cases').update({payload}).eq('id',row.id).eq('user_id',account).eq('revision',row.revision).select('id,name,revision,updated_at');if(error)throw error;
  if(version!==epoch||user?.id!==account)return;if(!data?.length)throw Error('檔案已在其他視窗更新，請重新整理清單後再操作');
  if(!restore&&current?.id===row.id){current=null;baseline='';baselineName='';}
  if(restore)el('caseArea').value='active';
  try{await list(restore?row.id:'');}catch{status('「'+row.name+'」已'+(restore?'還原':'移至垃圾桶')+'，清單更新失敗，請重新整理。');return;}
  status('「'+row.name+'」已'+(restore?'還原，可回到已存檔案載入。':'移至垃圾桶，可切換檔案區域還原。'));
 }
 el('deleteCloud').onclick=()=>action(()=>moveTrash(false));el('restoreCloud').onclick=()=>action(()=>moveTrash(true));
 el('caseArea').onchange=()=>{showCases();controls();};el('caseList').onchange=controls;
 el('newCloud').onclick=()=>{newDraft();status('目前頁面將儲存為新檔案；原有雲端檔案保留。');};
 for(const id of ['demo','clear'])el(id).addEventListener('click',()=>{newDraft();controls();});
 window.addEventListener('workspace-replaced',newDraft);
 document.addEventListener('input',controls);document.addEventListener('change',controls);
 window.addEventListener('beforeunload',e=>{if(dirty()&&(mode!=='示範'||current||el('caseName').value.trim())){e.preventDefault();e.returnValue='';}});
})();
