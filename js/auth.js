import beautyHubApi, { BeautyHubApiError } from './api.js';
import { getSupabaseClient } from './supabase-client.js';
import {mountCaptcha,captchaToken,resetCaptcha,googleAvailable,AuthSecurityError} from './auth-security.js';

const page = document.body.dataset.page;
const captchaReady = page === 'new-password' ? Promise.resolve() : mountCaptcha(document.querySelector('[data-auth-form]')).catch(error => {
  const output=document.querySelector('[data-form-feedback]'); if(output)output.textContent=error.message;
  throw error;
});
captchaReady.catch(()=>{});

document.querySelectorAll('[data-password-toggle]').forEach((button) => {
  button.addEventListener('click', () => {
    const input = button.closest('.password-field')?.querySelector('input');
    if (!input) return;
    const visible = input.type === 'text';
    input.type = visible ? 'password' : 'text';
    button.textContent = visible ? 'Mostrar' : 'Ocultar';
    button.setAttribute('aria-label', visible ? 'Mostrar senha' : 'Ocultar senha');
  });
});

const typeButtons = [...document.querySelectorAll('[data-account-type]')];
const typeInput = document.querySelector('[data-account-type-input]');
const registerLabel = document.querySelector('[data-register-label]');

typeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const type = button.dataset.accountType;
    typeButtons.forEach((item) => {
      const selected = item === button;
      item.classList.toggle('is-selected', selected);
      item.setAttribute('aria-pressed', String(selected));
    });
    if (typeInput) typeInput.value = type;
    if (registerLabel) registerLabel.textContent = type === 'professional' ? 'Criar conta profissional' : 'Criar conta de cliente';
  });
});

if (new URLSearchParams(location.search).get('tipo') === 'profissional') {
  typeButtons.find((button) => button.dataset.accountType === 'professional')?.click();
}

const readableError = (error) => {
  if(error instanceof AuthSecurityError)return error.message;
  const message = String(error?.message || 'Não foi possível concluir. Tente novamente.');
  if (/invalid login credentials/i.test(message)) return 'E-mail ou senha inválidos.';
  if (/user already registered/i.test(message)) return 'Este e-mail já está cadastrado. Entre na sua conta.';
  if (/password/i.test(message) && /least/i.test(message)) return 'A senha não atende aos requisitos de segurança.';
  if (/rate limit/i.test(message)) return 'Muitas tentativas seguidas. Aguarde alguns minutos.';
  if (/auth session missing|session.*missing|invalid.*token|expired/i.test(message)) return 'Este link de recuperação é inválido ou expirou. Solicite um novo.';
  return error instanceof BeautyHubApiError ? message : 'Não foi possível conectar à Beauty Hub. Tente novamente.';
};

const professionalRoutes = new Set([
  'painel.html', 'agenda-profissional.html', 'servicos-profissional.html',
  'equipe-profissional.html', 'clientes-profissional.html', 'negocio-profissional.html', 'orcamentos-profissional.html',
]);
const customerRoutes = new Set([
  'minha-conta.html', 'agendamentos.html', 'favoritos.html', 'avaliacoes.html', 'configuracoes.html', 'orcamentos.html',
]);

const safeReturnRoute = (value) => {
  const route = String(value || '').replace(/^\.\//, '').split(/[?#]/)[0];
  return professionalRoutes.has(route) || customerRoutes.has(route) ? route : '';
};
const bookingReturn = () => {
  const value=sessionStorage.getItem('beauty-return');
  if(!value || value.includes('\\'))return '';
  const url=new URL(value,location.href);
  if(url.origin!==location.origin || !['/espaco.html','/negocio-profissional.html','/agendamentos.html','/orcamentos.html'].includes(url.pathname))return '';
  return url.pathname+url.search;
};

if (page === 'login' && globalThis.setupGoogleLogin) {
  const query = new URLSearchParams(location.search);
  const next = safeReturnRoute(query.get('retorno')) || (query.get('destino') === 'painel' ? 'painel.html' : 'minha-conta.html');
  const enabled = await googleAvailable();
  if (enabled || query.get('oauth') === 'google') {
    getSupabaseClient().then(client => globalThis.setupGoogleLogin({
      enabled, button: document.querySelector('[data-google-login]'), client, next,
      finish: async destination => {
        const continuation=bookingReturn(); if(continuation){sessionStorage.removeItem('beauty-return');return continuation;}
        // First Google signup is a customer; management roles come only from the database.
        const route = safeReturnRoute(destination?.split('/').pop());
        const roles = await beautyHubApi.roles.listMine();
        if (professionalRoutes.has(route) && roles.includes('professional')) return route;
        return customerRoutes.has(route) ? route : 'minha-conta.html';
      },
      report: message => { const feedback = document.querySelector('[data-form-feedback]'); if (feedback) feedback.textContent = message; }
    })).catch(() => {
      const feedback = document.querySelector('[data-form-feedback]');
      if (feedback) feedback.textContent = 'O acesso com Google está indisponível no momento.';
    });
  }
}

if (page === 'login' && new URLSearchParams(location.search).get('senha') === 'atualizada') {
  const feedback = document.querySelector('[data-form-feedback]');
  if (feedback) feedback.textContent = 'Senha atualizada. Entre novamente com segurança.';
}

document.querySelectorAll('[data-auth-form]').forEach((form) => {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const feedback = form.querySelector('[data-form-feedback]');
    const submit = form.querySelector('button[type="submit"]');
    const data = new FormData(form);
    const originalLabel = submit?.textContent;

    if (feedback) feedback.textContent = '';
    if (submit) {
      submit.disabled = true;
      submit.setAttribute('aria-busy', 'true');
      submit.textContent = 'Conectando…';
    }

    try {
      await captchaReady;
      const securityToken=page==='new-password'?undefined:await captchaToken();
      if (page === 'login') {
        await beautyHubApi.auth.signIn({ email: data.get('email'), password: data.get('password'), captchaToken:securityToken });
        const continuation=bookingReturn();if(continuation){sessionStorage.removeItem('beauty-return');location.assign(continuation);return;}
        const query = new URLSearchParams(location.search);
        const requested = query.get('destino');
        const returnRoute = safeReturnRoute(query.get('retorno'));
        const wantsProfessional = requested === 'painel' || professionalRoutes.has(returnRoute);
        const roles = wantsProfessional ? await beautyHubApi.roles.listMine() : [];
        const canManage = roles.includes('professional') || roles.includes('platform_admin');
        const destination = wantsProfessional && canManage
          ? (returnRoute || 'painel.html')
          : (customerRoutes.has(returnRoute) ? returnRoute : 'minha-conta.html');
        if (feedback) feedback.textContent = wantsProfessional && !canManage
          ? 'Esta conta ainda não possui perfil profissional. Abrindo a área da cliente…'
          : 'Acesso confirmado. Abrindo sua conta…';
        location.assign(destination);
        return;
      }

      if (page === 'cadastro') {
        const accountType = data.get('accountType') === 'professional' ? 'professional' : 'customer';
        const result = await beautyHubApi.auth.signUp({
          email: data.get('email'),
          password: data.get('password'),
          fullName: data.get('name'),
          phone: data.get('phone'),
          accountType,
          captchaToken:securityToken,
        });
        if (feedback) feedback.textContent = result.session
          ? 'Conta criada. Abrindo sua experiência…'
          : 'Conta criada. Confira seu e-mail para confirmar o acesso.';
        if (result.session) location.assign(accountType === 'professional' ? 'painel.html' : 'minha-conta.html');
        return;
      }

      if (page === 'recover') {
        await beautyHubApi.auth.resetPassword(data.get('email'), `${location.origin}/nova-senha.html`,securityToken);
        if (feedback) feedback.textContent = 'Instruções enviadas. Confira também sua caixa de spam.';
      }

      if (page === 'new-password') {
        const password = String(data.get('password') || '');
        if (password !== data.get('passwordConfirm')) {
          if (feedback) feedback.textContent = 'As senhas precisam ser iguais.';
          return;
        }
        await beautyHubApi.auth.updatePassword(password);
        await beautyHubApi.auth.signOut();
        location.assign('login.html?senha=atualizada');
      }
    } catch (error) {
      if (feedback) feedback.textContent = readableError(error);
    } finally {
      resetCaptcha();
      if (submit) {
        submit.disabled = false;
        submit.removeAttribute('aria-busy');
        submit.textContent = originalLabel;
      }
    }
  });
});
