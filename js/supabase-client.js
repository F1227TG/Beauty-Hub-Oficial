const BEAUTY_HUB_SUPABASE_URL = 'https://wcorgltszfvhvkpfozwm.supabase.co';
const BEAUTY_HUB_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_1TKJ-dl_X2MNQFLfLGJpbQ_oIp824K_';
const SUPABASE_JS_ESM_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm';

let clientPromise;

export class SupabaseConfigurationError extends Error {
  constructor(message, code = 'SUPABASE_NOT_CONFIGURED') {
    super(message);
    this.name = 'SupabaseConfigurationError';
    this.code = code;
  }
}

function readMeta(name) {
  if (typeof document === 'undefined') return '';
  return document.querySelector(`meta[name="${name}"]`)?.content?.trim() || '';
}

function readBuildEnvironment() {
  try {
    return import.meta.env || {};
  } catch {
    return {};
  }
}

function decodeJwtRole(token) {
  if (!token.startsWith('eyJ') || typeof atob !== 'function') return '';

  try {
    const payload = token.split('.')[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(atob(padded)).role || '';
  } catch {
    return '';
  }
}

function assertSafeBrowserKey(key) {
  const normalized = key.trim();
  const jwtRole = decodeJwtRole(normalized);

  if (normalized.startsWith('sb_secret_') || jwtRole === 'service_role') {
    throw new SupabaseConfigurationError(
      'A chave administrativa do Supabase nunca pode ser usada no navegador.',
      'UNSAFE_SUPABASE_KEY',
    );
  }

  return normalized;
}

function resolveConfiguration() {
  const runtime = globalThis.__BEAUTY_HUB_CONFIG__ || {};
  const build = readBuildEnvironment();
  const url = (
    runtime.supabaseUrl
    || readMeta('beautyhub:supabase-url')
    || build.VITE_SUPABASE_URL
    || BEAUTY_HUB_SUPABASE_URL
  ).trim();
  const publishableKey = assertSafeBrowserKey(
    runtime.supabasePublishableKey
    || readMeta('beautyhub:supabase-publishable-key')
    || build.VITE_SUPABASE_PUBLISHABLE_KEY
    || BEAUTY_HUB_SUPABASE_PUBLISHABLE_KEY,
  );

  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url)) {
    throw new SupabaseConfigurationError('A URL do projeto Supabase da Beauty Hub é inválida.');
  }

  return { url: url.replace(/\/$/, ''), publishableKey };
}

export function getSupabaseStatus() {
  try {
    const { url, publishableKey } = resolveConfiguration();
    return {
      configured: Boolean(publishableKey),
      projectUrl: url,
      projectRef: new URL(url).hostname.split('.')[0],
    };
  } catch (error) {
    return {
      configured: false,
      projectUrl: BEAUTY_HUB_SUPABASE_URL,
      projectRef: 'wcorgltszfvhvkpfozwm',
      error,
    };
  }
}

export async function getSupabaseClient({ required = true } = {}) {
  const { url, publishableKey } = resolveConfiguration();

  if (!publishableKey) {
    if (!required) return null;
    throw new SupabaseConfigurationError(
      'Informe a chave pública sb_publishable da Beauty Hub antes de ativar dados reais.',
    );
  }

  if (!clientPromise) {
    clientPromise = import(SUPABASE_JS_ESM_URL)
      .then(({ createClient }) => createClient(
        url,
        publishableKey,
        {
          db: { schema: 'public' },
          auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
            flowType: 'pkce',
          },
          global: {
            headers: { 'X-Client-Info': 'beauty-hub-web/0.2.0' },
          },
        },
      ))
      .catch((error) => {
        clientPromise = undefined;
        throw error;
      });
  }

  return clientPromise;
}

export function resetSupabaseClientForTests() {
  clientPromise = undefined;
}
