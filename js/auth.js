import beautyHubApi, { BeautyHubApiError } from './api.js';

const page = document.body.dataset.page;

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
  'equipe-profissional.html', 'clientes-profissional.html', 'negocio-profissional.html',
]);
const customerRoutes = new Set([
  'minha-conta.html', 'agendamentos.html', 'favoritos.html', 'avaliacoes.html', 'configuracoes.html',
]);

const safeReturnRoute = (value) => {
  const route = String(value || '').replace(/^\.\//, '').split(/[?#]/)[0];
  return professionalRoutes.has(route) || customerRoutes.has(route) ? route : '';
};

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
      if (page === 'login') {
        await beautyHubApi.auth.signIn({ email: data.get('email'), password: data.get('password') });
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
        });
        if (feedback) feedback.textContent = result.session
          ? 'Conta criada. Abrindo sua experiência…'
          : 'Conta criada. Confira seu e-mail para confirmar o acesso.';
        if (result.session) location.assign(accountType === 'professional' ? 'painel.html' : 'minha-conta.html');
        return;
      }

      if (page === 'recover') {
        await beautyHubApi.auth.resetPassword(data.get('email'), `${location.origin}/nova-senha.html`);
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
      if (submit) {
        submit.disabled = false;
        submit.removeAttribute('aria-busy');
        submit.textContent = originalLabel;
      }
    }
  });
});
