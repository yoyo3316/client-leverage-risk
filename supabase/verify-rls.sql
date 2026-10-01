-- Admin-only verification using disposable fixtures in a rolled-back transaction.
-- Replace OWNER_EMAIL with the same email used during setup. Never commit that value.
begin;
insert into auth.users(id,email,aud,role) values
 ('99da06ba-c2c6-4b34-9d23-c906cb005101','risk-qa-owner@example.invalid','authenticated','authenticated'),
 ('99da06ba-c2c6-4b34-9d23-c906cb005102','risk-qa-other@example.invalid','authenticated','authenticated');
insert into public.risk_cases(id,user_id,name,payload) values
 ('99da06ba-c2c6-4b34-9d23-c906cb005201','99da06ba-c2c6-4b34-9d23-c906cb005101','QA own','{"version":2,"members":[{"name":"QA","data":{"cash":1,"other":0,"debtOther":0,"pools":[]}}]}'),
 ('99da06ba-c2c6-4b34-9d23-c906cb005202','99da06ba-c2c6-4b34-9d23-c906cb005102','QA other','{"version":2,"members":[{"name":"QA","data":{"cash":1,"other":0,"debtOther":0,"pools":[]}}]}');
select set_config('request.jwt.claims','{"sub":"99da06ba-c2c6-4b34-9d23-c906cb005101","email":"OWNER_EMAIL","role":"authenticated"}',true);
set local role authenticated;
do $$
declare count_rows integer;
begin
 select count(*) into count_rows from public.risk_cases;
 if count_rows <> 1 then raise exception 'FAIL: owner row isolation'; end if;
 insert into public.risk_cases(user_id,name,payload) values
 ('99da06ba-c2c6-4b34-9d23-c906cb005101','QA insert','{"version":2,"members":[{}]}');
 begin
  insert into public.risk_cases(user_id,name,payload) values
  ('99da06ba-c2c6-4b34-9d23-c906cb005102','QA denied','{"version":2,"members":[{}]}');
  raise exception 'FAIL: foreign owner insert allowed';
 exception when insufficient_privilege then null; end;
 update public.risk_cases set name='QA revision 2' where id='99da06ba-c2c6-4b34-9d23-c906cb005201' and revision=1;
 get diagnostics count_rows = row_count;
 if count_rows <> 1 then raise exception 'FAIL: owner update'; end if;
 if (select revision from public.risk_cases where id='99da06ba-c2c6-4b34-9d23-c906cb005201') <> 2 then raise exception 'FAIL: revision trigger'; end if;
 update public.risk_cases set name='QA stale' where id='99da06ba-c2c6-4b34-9d23-c906cb005201' and revision=1;
 get diagnostics count_rows = row_count;
 if count_rows <> 0 then raise exception 'FAIL: stale revision write'; end if;
 update public.risk_cases set name='QA denied update' where id='99da06ba-c2c6-4b34-9d23-c906cb005202';
 get diagnostics count_rows = row_count;
 if count_rows <> 0 then raise exception 'FAIL: foreign owner update allowed'; end if;
 begin
  update public.risk_cases set user_id='99da06ba-c2c6-4b34-9d23-c906cb005102' where id='99da06ba-c2c6-4b34-9d23-c906cb005201';
  raise exception 'FAIL: ownership transfer allowed';
 exception when insufficient_privilege then null; end;
end;
$$;
reset role;
select set_config('request.jwt.claims','{"sub":"99da06ba-c2c6-4b34-9d23-c906cb005101","email":"risk-not-owner@example.invalid","role":"authenticated"}',true);
set local role authenticated;
do $$
begin
 if exists (select 1 from public.risk_cases) then raise exception 'FAIL: non-owner email read'; end if;
 begin
  insert into public.risk_cases(user_id,name,payload) values ('99da06ba-c2c6-4b34-9d23-c906cb005101','QA denied','{"version":2,"members":[{}]}');
  raise exception 'FAIL: non-owner email insert';
 exception when insufficient_privilege then null; end;
end;
$$;
reset role;
set local role anon;
do $$
begin
 begin
  perform 1 from public.risk_cases;
  raise exception 'FAIL: anonymous read allowed';
 exception when insufficient_privilege then null; end;
end;
$$;
reset role;
rollback;
select 'PASS: owner read/write, foreign row isolation, non-owner email denied, anon denied, revision conflicts' as verification,
 (select count(*) from public.risk_cases where user_id in ('99da06ba-c2c6-4b34-9d23-c906cb005101','99da06ba-c2c6-4b34-9d23-c906cb005102')) as remaining_test_cases,
 (select count(*) from auth.users where id in ('99da06ba-c2c6-4b34-9d23-c906cb005101','99da06ba-c2c6-4b34-9d23-c906cb005102')) as remaining_test_users;
