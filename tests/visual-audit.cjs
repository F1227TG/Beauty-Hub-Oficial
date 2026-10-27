const {chromium}=require('@playwright/test');
const fs=require('fs'),path=require('path');
(async()=>{
 const root=path.resolve(__dirname,'..');
 const out=path.resolve(__dirname,'../test-results'); fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch();
 const page=await browser.newPage({reducedMotion:'reduce'});
 const missing=new Set(); const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>{
  const u=new URL(r.request().url());
  if(u.hostname!=='localhost') return r.abort();
  const p=path.resolve(root,'.'+decodeURIComponent(u.pathname));
  if(!p.startsWith(root+path.sep)||!fs.existsSync(p)||!fs.statSync(p).isFile()){missing.add(u.pathname);return r.abort();}
  return r.fulfill({path:p});
 });
 const pages=fs.readdirSync(root).filter(n=>n.endsWith('.html'));
 const failures=[];
 for(const theme of ['light','dark']) for(const width of [320,390,768,1440]) {
  await page.setViewportSize({width,height:900});
  await page.addInitScript(t=>localStorage.setItem('beauty-hub-theme',t),theme);
  for(const file of pages){
   await page.goto('http://localhost/'+file); await page.evaluate(()=>document.fonts.ready);
   const result=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,wide:[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0 && r.right>innerWidth+2 && !e.closest('.pro-table,.pro-agenda-scroll')}).slice(0,8).map(e=>e.className)}));
   if(result.overflow>1) failures.push({theme,width,file,...result});
   if(theme==='light'&&[360,1440].includes(width)&&['index.html','explorar.html','painel.html','login.html','para-profissionais.html','espaco.html'].includes(file)) await page.screenshot({path:path.join(out,`${file}-${width}.png`),fullPage:true});
  }
 }
 const result={cases:pages.length*8,failures,missing:[...missing],errors:[...new Set(errors)]};
 fs.writeFileSync(path.join(out,'audit.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await browser.close();if(failures.length||missing.size||errors.length)process.exitCode=1;
})();
