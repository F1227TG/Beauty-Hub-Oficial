const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const {btree_gist}=require('@electric-sql/pglite/contrib/btree_gist');
test('existing production schema: tenant isolation, quotes, home visits, booking conflicts and rollback',async()=>{
 const db=new PGlite({extensions:{btree_gist}});
 const owner='10000000-0000-4000-8000-000000000001',customer='20000000-0000-4000-8000-000000000002',other='30000000-0000-4000-8000-000000000003';
 const as=async(id,fn)=>{await db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${id}',false);`);try{return await fn();}finally{await db.exec('reset role');}};
 const rpc=async(name,args)=>{const r=await db.query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) value`,args);return r.rows[0]?.value;};
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create schema storage;create schema extensions;
   grant usage on schema auth,storage to public;
   create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   create function extensions.gen_random_uuid() returns uuid language sql as $$select pg_catalog.gen_random_uuid()$$;
   create function public.rls_auto_enable() returns event_trigger language plpgsql as $$begin end$$;
   create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
   create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
   create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;`);
  const dir=path.join(__dirname,'../../supabase/migrations');
  for(const file of fs.readdirSync(dir).filter(f=>f.endsWith('.sql')).sort()) await db.exec(fs.readFileSync(path.join(dir,file),'utf8'));
  await db.query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3),($4,$5,$6),($7,$8,$9)',[owner,'owner@example.test',{full_name:'Profissional Teste',account_type:'professional'},customer,'client@example.test',{full_name:'Cliente Teste'},other,'other@example.test',{full_name:'Outro Teste',account_type:'platform_admin'}]);
  assert.deepEqual((await db.query('select role from public.user_roles where user_id=$1',[other])).rows.map(x=>x.role),['customer']);
  const business={name:'Espaço Teste',city:'Recife',state_code:'PE',attendance_mode:'both',travel_fee:20,status:'published'};
  const space=await as(owner,()=>rpc('beauty_save_business',[business,null]));
  const category=(await db.query('select id from public.categories limit 1')).rows[0].id;
  const serviceData={name:'Serviço Teste',category_id:category,duration_minutes:60,price:80,pricing_mode:'fixed'};
  const service=await as(owner,()=>rpc('beauty_save_service',[space,serviceData,null]));
  const quoted=await as(owner,()=>rpc('beauty_save_service',[space,{...serviceData,name:'Orçamento Teste',pricing_mode:'quote'},null]));
  const member=(await db.query('select id from public.space_members where space_id=$1',[space])).rows[0].id;
  await as(owner,()=>rpc('beauty_save_hours',[space,[0,1,2,3,4,5,6].map(weekday=>({weekday,start:'09:00',end:'18:00'}))]));
  const day=(await db.query('select (current_date+2)::text as test_day')).rows[0].test_day;
  const slots=(await db.query('select * from public.beauty_slots($1,$2,$3,$4)',[space,member,service,day])).rows;
  assert.ok(slots.length>0);
  const book=(svc,start,mode='onsite',addr='',quote=null,reschedule=null)=>rpc('beauty_book',[space,member,svc,start,mode,addr,'',quote,reschedule]);
  await as(customer,async()=>{
   await assert.rejects(()=>book(service,slots[0].starts_at,'home',''),/endereço/);
   await assert.rejects(()=>book(quoted,slots[0].starts_at),/orçamento/);
  });
  const booking=await as(customer,()=>book(service,slots[0].starts_at,'home','Rua de Teste, 123, Recife'));
  assert.equal(Number((await db.query('select total_amount from public.appointments where id=$1',[booking])).rows[0].total_amount),100);
  await as(other,async()=>{
   assert.equal((await db.query('select * from public.appointments')).rows.length,0);
   await assert.rejects(()=>book(service,slots[0].starts_at),/Horário/);
   await assert.rejects(()=>rpc('beauty_save_business',[business,space]),/edição/);
   await assert.rejects(()=>rpc('beauty_appointment_action',[booking,'cancelled']),/Acesso/);
   await assert.rejects(()=>rpc('beauty_clients',[space]),/Acesso/);
  });
  await as(customer,async()=>{
   await assert.rejects(()=>db.query('update public.appointments set total_amount=0 where id=$1',[booking]),/permission denied/);
   await assert.rejects(()=>db.query('select public.create_booking($1,$2,$3,$4,$5)',[space,member,slots[0].starts_at,'',[]]),/permission denied/);
   await assert.rejects(()=>book(service,new Date(0),'onsite','',null,booking),/Horário/);
   assert.equal((await db.query('select status from public.appointments where id=$1',[booking])).rows[0].status,'confirmed');
   await rpc('beauty_appointment_action',[booking,'cancelled']);
  });
  const quote=await as(customer,()=>rpc('beauty_request_quote',[space,quoted,'Preciso de atendimento em casa','home']));
  await as(other,async()=>assert.equal((await db.query('select * from public.quote_requests')).rows.length,0));
  await as(owner,()=>rpc('beauty_quote_action',[quote,'offer',150,'Inclui materiais']));
  await as(customer,()=>rpc('beauty_quote_action',[quote,'accept',null,'']));
  const qb=await as(customer,()=>book(quoted,slots[0].starts_at,'home','Rua de Teste, 123, Recife',quote));
  assert.equal(Number((await db.query('select total_amount from public.appointments where id=$1',[qb])).rows[0].total_amount),170);
  await as(customer,()=>assert.rejects(()=>book(quoted,slots[8].starts_at,'home','Rua de Teste, 123, Recife',quote),/orçamento/));
  await as(owner,async()=>{
   await assert.rejects(()=>db.query('update public.beauty_spaces set rating=5 where id=$1',[space]),/permission denied/);
   await assert.rejects(()=>rpc('beauty_appointment_action',[qb,'completed']),/horário/);
   assert.equal((await db.query('select * from public.beauty_clients($1)',[space])).rows.length,1);
  });
  assert.equal((await db.query("select count(*)::int n from pg_tables where schemaname='public' and not rowsecurity")).rows[0].n,0);
 }finally{await db.close();}
});
