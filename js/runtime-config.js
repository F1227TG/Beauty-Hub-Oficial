// Public browser configuration only. Enable Google after configuring Supabase Auth.
globalThis.__BEAUTY_HUB_CONFIG__ = {
  googleLoginEnabled: false,
  ...(globalThis.__BEAUTY_HUB_CONFIG__ || {}),
};
