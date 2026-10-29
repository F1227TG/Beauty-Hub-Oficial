import {getSupabaseStatus} from './supabase-client.js';
export class AuthSecurityError extends Error {}
let configPromise,widget=null,token='';
export async function authConfiguration(){
 if(!configPromise)configPromise=(async()=>{
  const response=await fetch('/api/public-config',{signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error('Não foi possível verificar a configuração de acesso. Tente novamente.');
  const config=await response.json();
  if(typeof config.captchaRequired!=='boolean'||typeof config.turnstileSiteKey!=='string')throw new Error('Configuração de acesso inválida.');
  return config;
 })().catch(error=>{configPromise=null;throw error;});
 return configPromise;
}
export async function mountCaptcha(form){
 const config=await authConfiguration();if(!config.captchaRequired&&!config.turnstileSiteKey)return;
 if(!config.turnstileSiteKey)throw new Error('A proteção de acesso está em configuração. Tente novamente mais tarde.');
 if(!window.turnstile)await new Promise((resolve,reject)=>{
  const s=document.createElement('script');s.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';s.async=true;
  const timer=setTimeout(()=>reject(new Error('A verificação de segurança demorou. Recarregue a página.')),15000);
  s.onload=()=>{clearTimeout(timer);resolve();};s.onerror=()=>{clearTimeout(timer);s.remove();reject(new Error('Não foi possível carregar a verificação de segurança.'));};document.head.append(s);
 });
 const host=document.createElement('div');host.className='field-full';form.querySelector('[type=submit]').before(host);
 widget=window.turnstile.render(host,{sitekey:config.turnstileSiteKey,callback:value=>{token=value;},'expired-callback':()=>{token='';},'error-callback':()=>{token='';},size:'flexible'});
}
export async function captchaToken(){const c=await authConfiguration();if((c.captchaRequired||c.turnstileSiteKey)&&!token)throw new AuthSecurityError('Conclua a verificação de segurança antes de continuar.');return token||undefined;}
export function resetCaptcha(){token='';if(widget!==null)window.turnstile?.reset(widget);}
export async function googleAvailable(){
 const config=globalThis.__BEAUTY_HUB_CONFIG__||{};
 const key=config.supabasePublishableKey||'sb_publishable_1TKJ-dl_X2MNQFLfLGJpbQ_oIp824K_';
 try{const r=await fetch(getSupabaseStatus().projectUrl+'/auth/v1/settings',{headers:{apikey:key},signal:AbortSignal.timeout(10000)});if(!r.ok)return false;return (await r.json()).external?.google===true;}catch{return false;}
}
