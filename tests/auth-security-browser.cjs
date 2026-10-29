const {chromium,expect}=require('@playwright/test');const fs=require('node:fs'),path=require('node:path');
(async()=>{const browser=await chromium.launch(),root=path.resolve(__dirname,'..');let count=0;try{
 for(const token of ['', 'synthetic-challenge']){
  const page=await browser.newPage();await page.addInitScript(value=>{window.turnstile={render(_host,options){if(value)options.callback(value);return 1;},reset(){window.__reset=true;}};},token);
  await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname==='cdn.jsdelivr.net')return r.fulfill({contentType:'text/javascript',body:`export const createClient=()=>({auth:{signUp:async args=>{window.__signup=args;return {data:{session:null},error:null}}}});`});if(u.pathname==='/api/public-config')return r.fulfill({json:{captchaRequired:true,turnstileSiteKey:'synthetic-site-key'}});if(u.hostname!=='beauty.test')return r.abort();const file=path.resolve(root,'.'+u.pathname);return file.startsWith(root+path.sep)&&fs.existsSync(file)?r.fulfill({path:file}):r.abort();});
  await page.goto('https://beauty.test/cadastro.html');await page.locator('[name=name]').fill('Pessoa Teste');await page.locator('[name=email]').fill('synthetic@example.test');await page.locator('[name=phone]').fill('11999999999');await page.locator('[name=password]').fill('SyntheticExample123!');await page.locator('[name=terms]').check();await page.getByRole('button',{name:'Criar conta de cliente',exact:true}).click();
  if(!token){await expect(page.locator('[data-form-feedback]')).toContainText('verificação de segurança');expect(await page.evaluate(()=>window.__signup)).toBeUndefined();}
  else{await expect(page.locator('[data-form-feedback]')).toContainText('Confira seu e-mail');expect(await page.evaluate(()=>window.__signup.options.captchaToken)).toBe(token);expect(await page.evaluate(()=>window.__reset)).toBe(true);}
  count++;await page.close();
 }
 console.log(`${count} CAPTCHA browser checks passed`);
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1});
