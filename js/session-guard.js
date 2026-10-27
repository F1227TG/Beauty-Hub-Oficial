import beautyHubApi from './api.js';

const requiredRole = document.body.dataset.requireRole;
const localPreview = ['127.0.0.1', 'localhost', '[::1]'].includes(location.hostname);

const currentRoute = () => {
  const file = location.pathname.split('/').pop() || 'index.html';
  return `${file}${location.search}`;
};

const sendToLogin = () => {
  const destination = requiredRole === 'professional' ? 'painel' : 'conta';
  location.replace(`login.html?destino=${destination}&retorno=${encodeURIComponent(currentRoute())}`);
};

const installSignOut = () => {
  if (document.querySelector('[data-sign-out]')) return;
  const container = requiredRole === 'professional'
    ? document.querySelector('.dashboard-sidebar-bottom')
    : document.querySelector('.account-header > div:last-child');
  if (!container) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'session-signout';
  button.dataset.signOut = '';
  button.textContent = 'Sair';
  button.setAttribute('aria-label', 'Sair da Beauty Hub');
  button.addEventListener('click', async () => {
    button.disabled = true;
    button.textContent = 'Saindo…';
    try { await beautyHubApi.auth.signOut(); } catch (_) {}
    location.replace('login.html');
  });
  container.append(button);
};

const guardSession = async () => {
  if (localPreview) {
    document.body.dataset.authPreview = 'local';
    installSignOut();
    return;
  }

  try {
    const session = await beautyHubApi.auth.getSession();
    if (!session) {
      sendToLogin();
      return;
    }
    if (requiredRole === 'professional') {
      const roles = await beautyHubApi.roles.listMine();
      const allowed = roles.includes('professional') || roles.includes('platform_admin');
      if (!allowed) {
        location.replace('minha-conta.html?aviso=perfil-profissional');
        return;
      }
    }
    installSignOut();
  } catch (_) {
    sendToLogin();
  }
};

guardSession();
