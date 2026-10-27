import { getSupabaseClient, getSupabaseStatus } from './supabase-client.js';

export class BeautyHubApiError extends Error {
  constructor(message, { code = 'BEAUTY_HUB_API_ERROR', cause, details } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'BeautyHubApiError';
    this.code = code;
    this.details = details;
  }
}

function unwrap(result, fallbackMessage) {
  if (result.error) {
    throw new BeautyHubApiError(result.error.message || fallbackMessage, {
      code: result.error.code || 'SUPABASE_REQUEST_FAILED',
      cause: result.error,
      details: result.error.details,
    });
  }
  return result.data;
}

function normalizePage(page = 1, pageSize = 12) {
  const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
  const safePageSize = Math.min(48, Math.max(1, Number.parseInt(pageSize, 10) || 12));
  return {
    page: safePage,
    pageSize: safePageSize,
    from: (safePage - 1) * safePageSize,
    to: safePage * safePageSize - 1,
  };
}

function normalizeSearch(value) {
  return String(value || '').trim().replace(/[%_(),]/g, '').slice(0, 80);
}

function normalizePhone(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  let normalized;

  if (raw.startsWith('+')) normalized = `+${digits}`;
  else if (/^55\d{10,11}$/.test(digits)) normalized = `+${digits}`;
  else if (/^\d{10,11}$/.test(digits)) normalized = `+55${digits}`;

  if (!normalized || !/^\+[1-9]\d{7,14}$/.test(normalized)) {
    throw new BeautyHubApiError('Informe um celular válido com DDD.', {
      code: 'INVALID_PHONE',
    });
  }
  return normalized;
}

function requireUuid(value, fieldName) {
  const uuid = String(value || '').trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid)) {
    throw new BeautyHubApiError(`${fieldName} inválido.`, { code: 'INVALID_IDENTIFIER' });
  }
  return uuid;
}

async function currentUser(client) {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) {
    throw new BeautyHubApiError('Entre na sua conta para continuar.', {
      code: 'AUTH_REQUIRED',
      cause: error,
    });
  }
  return data.user;
}

function safeFileName(name) {
  const clean = String(name || 'imagem')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(-100);
  return clean || 'imagem';
}

function validateImageFile(file) {
  const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
  if (!file || !allowedTypes.has(file.type) || file.size > 10 * 1024 * 1024) {
    throw new BeautyHubApiError('Use uma imagem JPEG, PNG, WebP ou AVIF de até 10 MB.', {
      code: 'INVALID_MEDIA_FILE',
    });
  }
  return file;
}

export const beautyHubApi = {
  status: getSupabaseStatus,

  auth: {
    async signUp({ email, password, fullName, phone, accountType = 'customer' }) {
      const client = await getSupabaseClient();
      const normalizedType = ['customer', 'professional', 'both'].includes(accountType)
        ? accountType
        : 'customer';
      return unwrap(await client.auth.signUp({
        email: String(email || '').trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: String(fullName || '').trim(),
            phone_e164: normalizePhone(phone),
            account_type: normalizedType,
          },
        },
      }), 'Não foi possível criar a conta.');
    },

    async signIn({ email, password }) {
      const client = await getSupabaseClient();
      return unwrap(await client.auth.signInWithPassword({
        email: String(email || '').trim().toLowerCase(),
        password,
      }), 'E-mail ou senha inválidos.');
    },

    async signOut() {
      const client = await getSupabaseClient();
      return unwrap(await client.auth.signOut(), 'Não foi possível encerrar a sessão.');
    },

    async resetPassword(email, redirectTo = `${location.origin}/login.html`) {
      const client = await getSupabaseClient();
      return unwrap(await client.auth.resetPasswordForEmail(
        String(email || '').trim().toLowerCase(),
        { redirectTo },
      ), 'Não foi possível enviar o e-mail de recuperação.');
    },

    async updatePassword(password) {
      const client = await getSupabaseClient();
      return unwrap(await client.auth.updateUser({ password }),
        'Não foi possível atualizar a senha.');
    },

    async getSession() {
      const client = await getSupabaseClient();
      const data = unwrap(await client.auth.getSession(), 'Não foi possível recuperar a sessão.');
      return data.session;
    },

    async getUser() {
      const client = await getSupabaseClient();
      return currentUser(client);
    },
  },

  roles: {
    async listMine() {
      const client = await getSupabaseClient();
      const user = await currentUser(client);
      const rows = unwrap(await client.from('user_roles').select('role')
        .eq('user_id', user.id), 'Não foi possível verificar as permissões da conta.');
      return rows.map(({ role }) => role);
    },
  },

  profiles: {
    async getMine() {
      const client = await getSupabaseClient();
      const user = await currentUser(client);
      return unwrap(await client.from('profiles').select('*').eq('id', user.id).single(),
        'Não foi possível carregar o perfil.');
    },

    async updateMine(changes) {
      const client = await getSupabaseClient();
      const user = await currentUser(client);
      const allowed = [
        'display_name', 'phone_e164', 'avatar_path', 'city', 'state_code', 'bio', 'preferences',
      ];
      const payload = Object.fromEntries(
        Object.entries(changes || {}).filter(([key]) => allowed.includes(key)),
      );
      return unwrap(await client.from('profiles').update(payload).eq('id', user.id).select().single(),
        'Não foi possível atualizar o perfil.');
    },
  },

  categories: {
    async list() {
      const client = await getSupabaseClient();
      return unwrap(await client.from('categories').select('id, slug, name, description, icon')
        .order('sort_order'), 'Não foi possível carregar as categorias.');
    },
  },

  spaces: {
    async list({ city, stateCode, kind, categoryId, search, page = 1, pageSize = 12 } = {}) {
      const client = await getSupabaseClient();
      const pagination = normalizePage(page, pageSize);
      const categoryRelation = categoryId
        ? 'space_categories!inner(category_id)'
        : 'space_categories(category_id)';
      let query = client
        .from('beauty_spaces')
        .select(
          `id, name, slug, kind, description, cover_path, logo_path, city, state_code, verification_status, rating, review_count, ${categoryRelation}`,
          { count: 'exact' },
        )
        .order('rating', { ascending: false })
        .order('name')
        .range(pagination.from, pagination.to);

      if (city) query = query.ilike('city', normalizeSearch(city));
      if (stateCode) query = query.eq('state_code', String(stateCode).trim().toUpperCase());
      if (kind) query = query.eq('kind', kind);
      if (categoryId) query = query.eq('space_categories.category_id', requireUuid(categoryId, 'Categoria'));
      if (search) query = query.ilike('name', `%${normalizeSearch(search)}%`);

      const result = await query;
      const data = unwrap(result, 'Não foi possível carregar os espaços de beleza.');
      return { data, count: result.count || 0, ...pagination };
    },

    async getBySlug(slug) {
      const client = await getSupabaseClient();
      return unwrap(await client.from('beauty_spaces').select('*')
        .eq('slug', String(slug || '').trim().toLowerCase()).single(),
      'Espaço de beleza não encontrado.');
    },

    async listMine() {
      const client = await getSupabaseClient();
      const user = await currentUser(client);
      return unwrap(await client.from('beauty_spaces').select('*').eq('owner_id', user.id)
        .order('created_at', { ascending: false }), 'Não foi possível carregar seus espaços.');
    },
  },

  services: {
    async listBySpace(spaceId) {
      const client = await getSupabaseClient();
      return unwrap(await client.from('services')
        .select('id, space_id, category_id, name, description, duration_minutes, price, deposit_amount, is_featured')
        .eq('space_id', requireUuid(spaceId, 'Espaço'))
        .order('is_featured', { ascending: false })
        .order('name'), 'Não foi possível carregar os serviços.');
    },
  },

  professionals: {
    async listBySpace(spaceId) {
      const client = await getSupabaseClient();
      return unwrap(await client.from('space_members')
        .select('id, space_id, display_name, professional_title, bio, avatar_path, is_bookable')
        .eq('space_id', requireUuid(spaceId, 'Espaço'))
        .eq('is_active', true)
        .eq('is_bookable', true)
        .order('display_name'), 'Não foi possível carregar a equipe.');
    },
  },

  availability: {
    async get({ spaceId, memberId, from, to }) {
      const client = await getSupabaseClient();
      const safeSpaceId = requireUuid(spaceId, 'Espaço');
      let rulesQuery = client.from('availability_rules').select('*')
        .eq('space_id', safeSpaceId).eq('is_active', true).order('weekday').order('start_time');
      let exceptionsQuery = client.from('availability_exceptions').select('*')
        .eq('space_id', safeSpaceId).order('starts_at');

      if (memberId) {
        const safeMemberId = requireUuid(memberId, 'Profissional');
        rulesQuery = rulesQuery.or(`member_id.is.null,member_id.eq.${safeMemberId}`);
        exceptionsQuery = exceptionsQuery.or(`member_id.is.null,member_id.eq.${safeMemberId}`);
      }
      if (from) exceptionsQuery = exceptionsQuery.gte('ends_at', new Date(from).toISOString());
      if (to) exceptionsQuery = exceptionsQuery.lte('starts_at', new Date(to).toISOString());

      const [rulesResult, exceptionsResult] = await Promise.all([rulesQuery, exceptionsQuery]);
      return {
        rules: unwrap(rulesResult, 'Não foi possível carregar os horários.'),
        exceptions: unwrap(exceptionsResult, 'Não foi possível carregar os bloqueios.'),
      };
    },
  },

  bookings: {
    async create({ spaceId, professionalMemberId, startsAt, notes = '', items }) {
      const client = await getSupabaseClient();
      const payloadItems = (items || []).map((item) => ({
        service_id: requireUuid(item.serviceId, 'Serviço'),
        quantity: Math.max(1, Number.parseInt(item.quantity, 10) || 1),
      }));
      return unwrap(await client.rpc('create_booking', {
        p_space_id: requireUuid(spaceId, 'Espaço'),
        p_professional_member_id: requireUuid(professionalMemberId, 'Profissional'),
        p_starts_at: new Date(startsAt).toISOString(),
        p_customer_notes: String(notes || '').trim() || null,
        p_items: payloadItems,
      }), 'Não foi possível concluir o agendamento.');
    },

    async listMine({ upcoming = true, page = 1, pageSize = 20 } = {}) {
      const client = await getSupabaseClient();
      const user = await currentUser(client);
      const pagination = normalizePage(page, pageSize);
      let query = client.from('appointments')
        .select('*, beauty_spaces(name, slug, cover_path), appointment_items(*)', { count: 'exact' })
        .eq('customer_id', user.id)
        .order('starts_at', { ascending: upcoming })
        .range(pagination.from, pagination.to);
      query = upcoming
        ? query.gte('starts_at', new Date().toISOString()).neq('status', 'cancelled')
        : query.lt('starts_at', new Date().toISOString());
      const result = await query;
      return {
        data: unwrap(result, 'Não foi possível carregar seus agendamentos.'),
        count: result.count || 0,
        ...pagination,
      };
    },

    async cancel(appointmentId) {
      const client = await getSupabaseClient();
      const user = await currentUser(client);
      return unwrap(await client.from('appointments').update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: user.id,
      }).eq('id', requireUuid(appointmentId, 'Agendamento')).select().single(),
      'Não foi possível cancelar o agendamento.');
    },
  },

  favorites: {
    async list() {
      const client = await getSupabaseClient();
      const user = await currentUser(client);
      return unwrap(await client.from('favorites')
        .select('space_id, created_at, beauty_spaces(id, name, slug, cover_path, city, state_code, rating)')
        .eq('user_id', user.id).order('created_at', { ascending: false }),
      'Não foi possível carregar os favoritos.');
    },

    async set(spaceId, favorite) {
      const client = await getSupabaseClient();
      const user = await currentUser(client);
      const safeSpaceId = requireUuid(spaceId, 'Espaço');
      if (favorite) {
        return unwrap(await client.from('favorites').upsert(
          { user_id: user.id, space_id: safeSpaceId },
          { onConflict: 'user_id,space_id' },
        ).select().single(), 'Não foi possível favoritar o espaço.');
      }
      return unwrap(await client.from('favorites').delete()
        .eq('user_id', user.id).eq('space_id', safeSpaceId),
      'Não foi possível remover o favorito.');
    },
  },

  reviews: {
    async listBySpace(spaceId, { page = 1, pageSize = 10 } = {}) {
      const client = await getSupabaseClient();
      const pagination = normalizePage(page, pageSize);
      const result = await client.from('reviews')
        .select('id, rating, comment, created_at, review_responses(response, created_at)', { count: 'exact' })
        .eq('space_id', requireUuid(spaceId, 'Espaço'))
        .order('created_at', { ascending: false })
        .range(pagination.from, pagination.to);
      return {
        data: unwrap(result, 'Não foi possível carregar as avaliações.'),
        count: result.count || 0,
        ...pagination,
      };
    },

    async create({ appointmentId, spaceId, rating, comment }) {
      const client = await getSupabaseClient();
      const user = await currentUser(client);
      const normalizedRating = Number.parseInt(rating, 10);
      if (!Number.isInteger(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
        throw new BeautyHubApiError('A avaliação deve ter de 1 a 5 estrelas.', {
          code: 'INVALID_RATING',
        });
      }
      return unwrap(await client.from('reviews').insert({
        appointment_id: requireUuid(appointmentId, 'Agendamento'),
        customer_id: user.id,
        space_id: requireUuid(spaceId, 'Espaço'),
        rating: normalizedRating,
        comment: String(comment || '').trim() || null,
        status: 'published',
      }).select('id, space_id, rating, comment, status, created_at, updated_at').single(),
      'Não foi possível publicar a avaliação.');
    },
  },

  portfolio: {
    async listBySpace(spaceId, { page = 1, pageSize = 18 } = {}) {
      const client = await getSupabaseClient();
      const pagination = normalizePage(page, pageSize);
      const result = await client.from('portfolio_items')
        .select('id, title, description, media_path, thumbnail_path, alt_text, member_id, category_id', { count: 'exact' })
        .eq('space_id', requireUuid(spaceId, 'Espaço'))
        .eq('is_published', true)
        .order('sort_order')
        .order('created_at', { ascending: false })
        .range(pagination.from, pagination.to);
      return {
        data: unwrap(result, 'Não foi possível carregar o portfólio.'),
        count: result.count || 0,
        ...pagination,
      };
    },
  },

  notifications: {
    async list({ unreadOnly = false, limit = 30 } = {}) {
      const client = await getSupabaseClient();
      const user = await currentUser(client);
      let query = client.from('notifications').select('*').eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(Math.min(100, Math.max(1, limit)));
      if (unreadOnly) query = query.is('read_at', null);
      return unwrap(await query, 'Não foi possível carregar as notificações.');
    },

    async markRead(notificationId) {
      const client = await getSupabaseClient();
      return unwrap(await client.from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', requireUuid(notificationId, 'Notificação')).select().single(),
      'Não foi possível atualizar a notificação.');
    },
  },

  storage: {
    async uploadProfileImage(file) {
      const client = await getSupabaseClient();
      const user = await currentUser(client);
      validateImageFile(file);
      const path = `profiles/${user.id}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
      const data = unwrap(await client.storage.from('beauty-public').upload(path, file, {
        cacheControl: '31536000',
        upsert: false,
      }), 'Não foi possível enviar a imagem.');
      return { ...data, publicUrl: client.storage.from('beauty-public').getPublicUrl(path).data.publicUrl };
    },

    async uploadSpaceImage(spaceId, file) {
      const client = await getSupabaseClient();
      const safeSpaceId = requireUuid(spaceId, 'Espaço');
      validateImageFile(file);
      const path = `spaces/${safeSpaceId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
      const data = unwrap(await client.storage.from('beauty-public').upload(path, file, {
        cacheControl: '31536000',
        upsert: false,
      }), 'Não foi possível enviar a imagem.');
      return { ...data, publicUrl: client.storage.from('beauty-public').getPublicUrl(path).data.publicUrl };
    },

    async remove(paths) {
      const client = await getSupabaseClient();
      return unwrap(await client.storage.from('beauty-public').remove(paths),
        'Não foi possível remover a imagem.');
    },

    publicUrl(path) {
      return `${getSupabaseStatus().projectUrl}/storage/v1/object/public/beauty-public/${String(path || '').replace(/^\/+/, '')}`;
    },
  },
};

export default beautyHubApi;
