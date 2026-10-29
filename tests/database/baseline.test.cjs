const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
test('real PostgreSQL baseline: roles, tenancy, booking conflict and rollback',async()=>{
 const db=new PGlite();
 const owner='10000000-0000-4000-8000-000000000001',customer='20000000-0000-4000-8000-000000000002',other='30000000-0000-4000-8000-000000000003';
 const runAs=async(id,fn)=>{await db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${id}',false);`);try{return await fn();}finally{await db.exec('reset role;');}};
 try {
  await db.exec(`create role anon;create role authenticated;create schema auth;grant usage on schema auth to public;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;`);
  await db.exec(fs.readFileSync(path.join(__dirname,'../../supabase/archive/202610270001_operational_baseline.sql'),'utf8'));
  await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2),($3,$4),($5,$6)',[owner,{full_name:'Owner',account_type:'professional'},customer,{full_name:'Customer'},other,{full_name:'Other',account_type:'platform_admin'}]);
  assert.deepEqual((await db.query('select role from public.user_roles where user_id=$1',[other])).rows.map(x=>x.role),['customer']);
  const space=await runAs(owner,async()=> (await db.query("insert into public.beauty_spaces(owner_id,name,slug,city,state_code) values($1,'Real Space','real-space','Recife','PE') returning id",[owner])).rows[0].id);
  const {service,member}=await runAs(owner,async()=>{
   await db.query('update public.beauty_spaces set is_published=true where id=$1',[space]);
   const service=(await db.query("insert into public.services(space_id,name,duration_minutes,price) values($1,'Corte',60,70) returning id",[space])).rows[0].id;
   const member=(await db.query("insert into public.space_members(space_id,display_name) values($1,'Profissional') returning id",[space])).rows[0].id;
   await db.query("select public.beauty_save_hours($1,array[0,1,2,3,4,5,6],'09:00','18:00')",[space]);return {service,member};
  });
  const day=(await db.query("select (current_date+2)::text as test_day")).rows[0].test_day;
  const slot=await runAs(customer,async()=> (await db.query('select * from public.beauty_slots($1,$2,$3,$4)',[space,member,day,[service]])).rows[0].starts_at);
  const book=()=>db.query('select public.beauty_book($1,$2,$3,$4) id',[space,member,slot,[service]]);
  const booking=await runAs(customer,async()=> (await book()).rows[0].id);
  await runAs(other,async()=>{
   assert.equal((await db.query('select * from public.appointments')).rows.length,0);
   await assert.rejects(book,/Horário indisponível/);
   await assert.rejects(()=>db.query("select public.beauty_set_status($1,'cancelled')",[booking]),/Acesso negado/);
   await assert.rejects(()=>db.query("insert into public.user_roles values($1,'professional')",[other]),/permission denied/);
  });
  await runAs(customer,async()=>{
   assert.equal((await db.query('select * from public.appointments')).rows.length,1);
   await assert.rejects(()=>db.query("update public.appointments set total_price=0 where id=$1",[booking]),/permission denied/);
   await assert.rejects(()=>db.query("select public.beauty_set_status($1,'completed')",[booking]),/Aguarde/);
   await assert.rejects(()=>db.query('select public.beauty_book($1,$2,$3,$4,$5,$6)',[space,member,new Date(0),[service],'',booking]),/Horário indisponível/);
   assert.equal((await db.query('select status from public.appointments where id=$1',[booking])).rows[0].status,'confirmed');
   await db.query("select public.beauty_set_status($1,'cancelled')",[booking]);
  });
  await runAs(other,book);
  await runAs(owner,async()=>assert.equal((await db.query('select * from public.appointments')).rows.length,2));
  assert.equal((await db.query("select count(*)::int n from pg_tables where schemaname='public' and not rowsecurity")).rows[0].n,0);
 } finally {await db.close();}
});
