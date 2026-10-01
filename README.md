# 客戶槓桿風險儀表板

繁體中文、靜態前端，使用 Supabase Auth 與資料庫提供私人雲端儲存。供營業員與客戶共同檢視中信、凱基及其他機構融資／質押借款。示範數字為虛構。

## 功能
- 每一融資或質押擔保池獨立計算維持率、追繳距離。
- 彙總股票曝險倍數、淨資產與債務資產比。
- 0–60% 同步下跌試算與情境表、淨資產圖。
- 分別估算新增合格擔保及現金還本金至目標所需金額。
- JSON匯入匯出、列印、手機版。

## 本機使用與測試
直接開啟 `dist/index.html`，或 `python3 -m http.server 8000 --directory dist`。
執行 `node test.cjs && node data-test.cjs && node cloud-test.cjs`。

## GitHub Pages
將專案上傳至自己的GitHub repository，Settings → Pages → Source 選 GitHub Actions。本專案已有 `.github/workflows/pages.yml`，以 `dist` 為靜態發布目錄。啟用後重新執行 workflow 即可。Github Pages網址可能公開，不要把真實客戶JSON、截圖或報告提交進repository。

## 計算邏輯
所有金額單位為新台幣萬元。每筆擔保股票只能歸屬一個池；未設質現股不得重複列計。融資借款與質押借款都只列本金，不能將同筆借款重複填入「其他借款」。

維持率分母為該池借款，分子為擔保股票市值。擔保股票按當下市值100%認列，不乘核貸成數；不適用另外折價認列的契約。

股價下跌只影響股票市值。還款需求只彙總壓力後低於門檻的池；假設全數可動用現金能在期限內調度。新增擔保與償還本金兩方案不可加總；出售擔保股票還款不是本工具模擬方案。融券、期貨、選擇權及負債幣別風險不適用此模型。

130%／166%是可修改的示範門檻，不適用所有銀行契約。門檻碰觸不等於立即斷頭，應查實際追繳通知、期限、除權息設算、利息與擔保品規則。風險色彩僅代表門檻距離（少於20%為提示），不是投資安全評級或倒閉預測。

官方參考（2026/10/01）：
- https://www.kgi.com.tw/zh-tw/support-index/faq
- https://investoredu.twse.com.tw/pages/TWSE_InvestmentQA.aspx?ID=4

## 隱私與雲端儲存
使用者按下儲存時才將部位上傳至 Supabase；未儲存的部位只在頁面記憶體中。公開 GitHub 專案不包含客戶資料、管理者Email、資料庫密碼或service-role key。前端publishable key是公開連線識別，不授予資料存取權。

資料庫RLS同時檢查登入者UID與私人管理者名單。未登入訪客、其他登入帳號無法讀取或寫入檔案。登入狀態保存在此裝置的localStorage；登出會清除頁面部位。共用裝置使用完請登出。自行匯出檔案及列印內容由使用者保管。

每份檔案包含所有家庭成員、各券商帳戶、基準日及跌幅。可建立多份檔案、更新或另存新檔；載入不會自動覆寫未儲存變更。更新以revision檢查衝突，其他視窗修改過的版本不會被直接覆蓋。雲端不提供永久刪除按鈕。

## Supabase 初次設定
1. 使用免費專案，啟用Data API及自動RLS，關閉Automatically expose new tables。
2. 在SQL Editor執行`supabase/schema.sql`，先將OWNER_EMAIL換成管理者Email（不可提交含真實Email的SQL至公開repo）。
3. Authentication的Site URL設為正式GitHub Pages網址，Email登入連結回到同一網址。
4. 預設郵件服務限專案團隊成員；管理者可使用相同Email登入。擴大使用者前應另外設定SMTP、私人授權名單與信件送達測試。
5. `dist/cloud.js`只放專案URL與publishable key。資料庫密碼、secret/service-role key不可放在前端。

SDK固定為Supabase JS 2.117.1，瀏覽器UMD檔隨本站部署於`dist/supabase.js`，不依赖訪客載入第三方CDN。SDK授權見`SUPABASE-LICENSE`。

## 授權
MIT，見 LICENSE。

## 家庭多帳號
新增成員後，可在其名下增加多個券商融資／質押擔保池。家庭总覽逐帳戶顯示維持率與追繳距離，並比較各成員淨資產。現金缺口逐成員計算後加總，不假設跨持有人資金可即時調度。JSON v2含members；舊版v1資料可匯入為單一成員。未儲存的數據仍只存在頁面記憶體。

股票擔保計值欄位已移除。舊JSON中的collateral欄位忽略，统一依value（股票市值）計算維持率與追繳距離。

固定擔保欄位已移除，舊JSON的fixed欄位忽略。
