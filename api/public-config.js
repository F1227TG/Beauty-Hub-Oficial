module.exports = function handler(req,res) {
 res.setHeader('Cache-Control','no-store');
 res.status(200).json({turnstileSiteKey:process.env.BEAUTY_TURNSTILE_SITE_KEY||'',captchaRequired:process.env.BEAUTY_CAPTCHA_REQUIRED==='true'});
};
