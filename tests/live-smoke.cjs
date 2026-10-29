const {chromium}=require('@playwright/test');
(async()=>{
 const browser=await chromium.launch();let checks=0;const errors=[];
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900}});
  page.on('pageerror',e=>errors.push(e.message));
  for(const name of ['index.html','explorar.html','login.html','cadastro.html','painel.html']){
   const response=await page.goto('https://beautyhuboficial.vercel.app/'+name,{waitUntil:'networkidle',timeout:60000});
   if(response.status()!==200)throw Error(name+': HTTP '+response.status());
   if(name==='painel.html'&&!page.url().includes('login.html'))throw Error('Private page failed to redirect');
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('Overflow '+name+' '+width);
   if(name==='explorar.html')await page.locator('#catalog').waitFor({state:'visible',timeout:15000});
   console.log(width,name,'OK');checks++;
  }
  const config=await page.request.get('https://beautyhuboficial.vercel.app/api/public-config');
  if(config.status()!==200||typeof (await config.json()).captchaRequired!=='boolean')throw Error('Invalid public config');
  await page.close();
 }
 await browser.close();if(errors.length)throw Error(errors.join('\n'));console.log(checks+' real-network page checks passed');
})().catch(e=>{console.error(e);process.exit(1)});
