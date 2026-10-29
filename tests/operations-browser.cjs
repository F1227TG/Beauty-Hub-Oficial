const {chromium,expect}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const uid='20000000-0000-4000-8000-000000000002',sid='40000000-0000-4000-8000-000000000004',service='50000000-0000-4000-8000-000000000005',member='60000000-0000-4000-8000-000000000006';
function sdk(){
 let authenticated=true;
 const uid='20000000-0000-4000-8000-000000000002',sid='40000000-0000-4000-8000-000000000004',service='50000000-0000-4000-8000-000000000005',member='60000000-0000-4000-8000-000000000006';
 const me={id:uid,display_name:'Pessoa Teste',status:'active',city:'Recife',state_code:'PE'};
 const space={id:sid,owner_id:uid,name:'Espaço Teste',slug:'espaco-teste',status:'published',city:'Recife',state_code:'PE',kind:'independent',attendance_mode:'both',travel_fee:20,rating:0,review_count:0};
 const tables={profiles:[me],beauty_spaces:[space],categories:[{id:'70000000-0000-4000-8000-000000000007',name:'Cabelos',is_active:true}],services:[{id:service,space_id:sid,name:'Serviço Teste',duration_minutes:60,price:80,pricing_mode:'fixed',status:'active'},{id:'80000000-0000-4000-8000-000000000008',space_id:sid,name:'Serviço sob orçamento',duration_minutes:90,price:0,pricing_mode:'quote',status:'active'}],space_members:[{id:member,space_id:sid,display_name:'Profissional Teste',is_active:true,is_bookable:true}],appointments:[],quote_requests:[],favorites:[],reviews:[],availability_rules:[],availability_exceptions:[],user_roles:[{user_id:uid,role:'professional'}]};
 globalThis.__calls=[];
 globalThis.__failRPC=false;
 const record=(name,args)=>{globalThis.__calls.push({name,args});};
 return {createClient:()=>({auth:{getSession:async()=>({data:{session:authenticated?{access_token:'synthetic',user:{id:uid}}:null},error:null}),getUser:async()=>({data:{user:{id:uid}},error:null}),signInWithPassword:async args=>{record('signIn',args);return {data:{session:{user:{id:uid}}},error:null};},signUp:async args=>{record('signUp',args);return {data:{session:null,user:{id:uid}},error:null};},resetPasswordForEmail:async(...args)=>{record('recover',args);return {data:{},error:null};},signOut:async()=>{authenticated=false;return {data:{},error:null};}},
 from(name){if(!tables[name])throw Error('Unmocked table '+name);let filters=[],single=false,mutation=null;
  const q={select:()=>q,eq:(k,v)=>{filters.push([k,v]);return q;},order:()=>q,limit:()=>q,range:()=>q,is:()=>q,neq:()=>q,gte:()=>q,lt:()=>q,
   single:()=>{single=true;return q;},insert:d=>{mutation=d;record('insert:'+name,d);return q;},update:d=>{mutation=d;record('update:'+name,d);return q;},upsert:d=>{mutation=d;record('upsert:'+name,d);return q;},delete:()=>{record('delete:'+name,{});return q;},
   then(resolve,reject){const rows=tables[name].filter(row=>filters.every(([k,v])=>row[k]===v));return Promise.resolve({data:single?{...rows[0],...mutation}:rows,error:null,count:rows.length}).then(resolve,reject);}};return q;
 },rpc:async(name,args)=>{record(name,args);return globalThis.__failRPC?{data:null,error:{message:'Falha controlada. Tente novamente.'}}:{data:name==='beauty_slots'?[{starts_at:'2026-11-12T13:00:00Z'}]:name==='beauty_clients'?[]:sid,error:null};}})};
}
async function mount(page){
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',route=>{const url=new URL(route.request().url());
  if(url.hostname==='cdn.jsdelivr.net'&&url.pathname.includes('@supabase/supabase-js'))return route.fulfill({contentType:'text/javascript',body:`export const createClient=(${sdk.toString()})().createClient;`});
  if(url.hostname.endsWith('.supabase.co')&&url.pathname==='/auth/v1/settings')return route.fulfill({json:{external:{google:false}}});
  if(url.hostname==='beauty.test'&&url.pathname==='/api/public-config')return route.fulfill({json:{captchaRequired:false,turnstileSiteKey:''}});
  if(url.hostname!=='beauty.test')return route.abort();
  const target=path.resolve(root,'.'+decodeURIComponent(url.pathname));
  if(!target.startsWith(root+path.sep)||!fs.existsSync(target)||!fs.statSync(target).isFile())return route.abort();
  return route.fulfill({path:target});
 });return errors;
}
(async()=>{
 fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
 const browser=await chromium.launch();let count=0;
 try{
  for(const width of [390,1440]){
   const page=await browser.newPage({viewport:{width,height:900}}),errors=await mount(page);
   await page.goto('https://beauty.test/explorar.html');await expect(page.locator('#catalog')).toContainText('Espaço Teste');
   await page.locator('[data-ritual-search="Maquiagem"]').click();await expect(page.locator('[name=search]')).toHaveValue('Maquiagem');await expect(page.locator('#catalog')).toContainText('Nenhum resultado');
   if(width===390){await page.locator('[data-filter-toggle]').click();await expect(page.locator('#explore-filters')).toBeVisible();}
   await page.getByRole('button',{name:'Limpar',exact:true}).click();await expect(page.locator('#catalog')).toContainText('Espaço Teste');
   await page.locator('[name=search]').fill('Não existe');await expect(page.locator('#catalog')).toContainText('Nenhum resultado');
   await page.goto('https://beauty.test/espaco.html?id='+sid);await page.getByRole('button',{name:'Escolher horário',exact:true}).click();
   await page.locator('[name=day]').fill('2026-11-12');await page.getByRole('button',{name:'Consultar horários'}).click();await expect(page.locator('[name=start]')).not.toHaveValue('');
   await page.locator('[name=mode]').selectOption('home');await page.locator('[name=address]').fill('Rua Teste, 100, Recife');
   await page.evaluate(()=>{window.__failRPC=true;});await page.getByRole('button',{name:'Confirmar agendamento'}).click();await expect(page.locator('#operation-feedback')).toContainText('Falha controlada');await expect(page.locator('[name=address]')).toHaveValue('Rua Teste, 100, Recife');
   const booking=await page.evaluate(()=>window.__calls.find(c=>c.name==='beauty_book'));expect(booking.args.p_mode).toBe('home');expect(booking.args.p_service).toBe(service);expect(booking.args.p_start).toBe('2026-11-12T13:00:00Z');
   await page.goto('https://beauty.test/servicos-profissional.html');await expect(page.locator('[data-form=service]')).toBeVisible();await page.locator('[name=name]').fill('Novo serviço');await page.locator('[name=pricing_mode]').selectOption('quote');await page.getByRole('button',{name:'Cadastrar serviço',exact:true}).click();await expect(page.locator('#operation-feedback')).toContainText('Salvo');const save=await page.evaluate(()=>window.__calls.find(c=>c.name==='beauty_save_service'));expect(save.args.p_data.pricing_mode).toBe('quote');
   await page.goto('https://beauty.test/configuracoes.html');await page.getByRole('button',{name:'Aumentar texto'}).click();await expect(page.locator('html')).toHaveAttribute('data-large-text','true');
   await page.goto('https://beauty.test/cadastro.html');await page.locator('[name=name]').fill('Pessoa Teste');await page.locator('[name=email]').fill('synthetic@example.test');await page.locator('[name=phone]').fill('11999999999');await page.locator('[name=password]').fill('SyntheticExample123!');await page.locator('[name=terms]').check();await page.getByRole('button',{name:'Criar conta de cliente',exact:true}).click();await expect(page.locator('[data-form-feedback]')).toContainText('Confira seu e-mail');
   await page.goto('https://beauty.test/painel.html');await page.getByRole('button',{name:'Pausar animações',exact:true}).click();await page.reload();await expect(page.getByRole('button',{name:'Ativar animações',exact:true})).toBeVisible();await page.getByRole('button',{name:'Ativar animações',exact:true}).click();await page.emulateMedia({reducedMotion:'reduce'});await expect(page.getByRole('button',{name:'Movimento reduzido pelo dispositivo'})).toBeDisabled();await page.emulateMedia({reducedMotion:'no-preference'});expect(errors).toEqual([]);count+=11;await page.close();
  }
  const files=fs.readdirSync(root).filter(f=>f.endsWith('.html'));
  const audit=[];
  for(const width of [320,390,768,1440])for(const theme of ['light','dark']){
   const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'}),errors=await mount(page);await page.addInitScript(t=>localStorage.setItem('beauty-hub-theme',t),theme);
   for(const file of files){await page.goto('https://beauty.test/'+file+(file==='espaco.html'?'?id='+sid:''));if(await page.locator('#operation').count())await expect(page.locator('#operation-feedback')).not.toHaveText('Carregando…');await page.evaluate(()=>document.fonts.ready);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);expect(overflow,`${file} ${width} ${theme}`).toBeLessThanOrEqual(1);audit.push({file,width,theme,overflow});
    if(theme==='light'&&[390,1440].includes(width)&&['painel.html','negocio-profissional.html','espaco.html','explorar.html'].includes(file))await page.screenshot({path:path.join(root,`test-results/operational-${file}-${width}.png`),fullPage:true});
   }expect(errors).toEqual([]);await page.close();
  }
  fs.writeFileSync(path.join(root,'test-results/operations.json'),JSON.stringify({interactionChecks:count,responsiveChecks:audit.length,audit},null,2));console.log(`${count} interaction checks; ${audit.length} responsive checks passed`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
