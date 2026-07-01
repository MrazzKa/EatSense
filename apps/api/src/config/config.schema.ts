import * as Joi from 'joi';

export const configSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  REDIS_HOST: Joi.string().optional().allow(''),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().optional().allow(''),
  REDIS_URL: Joi.string().optional().allow(''),
  API_BASE_URL: Joi.string().required(),
  APP_BASE_URL: Joi.string().optional().allow(''),
  CORS_ORIGIN: Joi.string().optional().allow(''),
  CORS_ORIGINS: Joi.string().optional().allow(''),
  JWT_SECRET: Joi.string().required(),
  JWT_ACCESS_TOKEN_EXPIRATION_TIME: Joi.string().default('15m'),
  JWT_REFRESH_TOKEN_EXPIRATION_TIME: Joi.string().default('30d'),
  JWT_REFRESH_TOKEN_EXPIRATION_TIME_MS: Joi.number().default(2592000000),
  JWT_REFRESH_SECRET: Joi.string().optional().allow(''),
  OPENAI_API_KEY: Joi.string().required(),
  USDA_API_KEY: Joi.string().optional().allow(''),
  FDC_API_BASE: Joi.string().optional().default('https://api.nal.usda.gov/fdc'),
  FDC_API_KEY: Joi.string().optional().allow(''),
  FDC_CACHE_TTL_SECONDS: Joi.number().optional().default(86400),
  NUTRITION_PROVIDER: Joi.string().valid('hybrid', 'openai', 'usda').default('hybrid'),
  NUTRITION_FEATURE_FALLBACK: Joi.boolean().default(true),
  NUTRITION_FEATURE_ENABLED: Joi.boolean().default(true),
  FREE_DAILY_ANALYSES: Joi.number().integer().min(0).default(1),
  PRO_DAILY_ANALYSES: Joi.number().integer().min(0).default(25),
  DISABLE_LIMITS: Joi.boolean().default(false),
  ADMIN_BYPASS_LIMITS: Joi.boolean().default(false),
  ADMIN_SECRET: Joi.string().optional().allow(''),
  // App-store reviewer test account: a single whitelisted email that logs in
  // with a fixed, reusable OTP (one-time email codes can't reach a reviewer).
  // Both must be set to enable; affects only this exact email.
  REVIEWER_TEST_EMAIL: Joi.string().optional().allow(''),
  REVIEWER_TEST_OTP: Joi.string().optional().allow(''),
  ASSISTANT_FLOWS_ENABLED: Joi.boolean().default(true),
  SENDGRID_API_KEY: Joi.string().optional().allow(''),
  MAIL_PROVIDER: Joi.string().valid('SMTP', 'SENDGRID').default('SMTP'),
  MAIL_FROM: Joi.string().optional().default('EatSense <timur.kamaraev@eatsense.ch>'),
  SMTP_HOST: Joi.string().optional().allow(''),
  SMTP_PORT: Joi.number().optional().default(465),
  SMTP_SECURE: Joi.boolean().optional().default(true),
  SMTP_USER: Joi.string().optional().allow(''),
  SMTP_PASS: Joi.string().optional().allow(''),
  MAIL_DISABLE: Joi.boolean().default(false),
  AUTH_DEV_IGNORE_MAIL_ERRORS: Joi.boolean().default(false),
  EXPO_ACCESS_TOKEN: Joi.string().optional().allow(''),
  NOTIFICATIONS_DAILY_DEFAULT_HOUR: Joi.number().optional().min(0).max(23).default(8),
  HEALTH_SCORE_WEIGHTS: Joi.string().optional().allow(''),
  CACHE_DEFAULT_TTL_SEC: Joi.number().optional().default(900),
  USDA_CACHE_TTL_SEC: Joi.number().optional().default(259200),
  ANALYSIS_CACHE_TTL_SEC: Joi.number().optional().default(86400),
  ARTICLES_FEED_CACHE_TTL_SEC: Joi.number().optional().default(900),
  ARTICLES_DETAIL_CACHE_TTL_SEC: Joi.number().optional().default(86400),
  ASSISTANT_SESSION_TTL_SEC: Joi.number().optional().default(1800),
  S3_ENDPOINT: Joi.string().optional().allow(''),
  S3_REGION: Joi.string().optional().allow(''),
  S3_BUCKET: Joi.string().optional().allow(''),
  S3_ACCESS_KEY_ID: Joi.string().optional().allow(''),
  S3_SECRET_ACCESS_KEY: Joi.string().optional().allow(''),
  S3_FORCE_PATH_STYLE: Joi.boolean().optional().default(true),
  // Apple In-App Purchase settings for Promotional Offers
  APPLE_IAP_KEY_ID: Joi.string().optional().allow(''),
  APPLE_IAP_ISSUER_ID: Joi.string().optional().allow(''),
  APPLE_IAP_KEY: Joi.string().optional().allow(''), // Contents of .p8 file
  APP_BUNDLE_ID: Joi.string().optional().default('ch.eatsense.app'),
  APPLE_BUNDLE_ID: Joi.string().optional().default('ch.eatsense.app'),
  // Medication push notifications (disabled by default, use local notifications)
  MEDICATION_PUSH_ENABLED: Joi.boolean().optional().default(false),
  // Stripe — feature-flagged. When STRIPE_ENABLED is false (default), the
  // payments module short-circuits and offers fall back to chat-free flow.
  // Flip STRIPE_ENABLED=true once both keys + webhook secret are provisioned.
  STRIPE_ENABLED: Joi.boolean().optional().default(false),
  STRIPE_SECRET_KEY: Joi.string().optional().allow(''),
  STRIPE_PUBLISHABLE_KEY: Joi.string().optional().allow(''),
  STRIPE_WEBHOOK_SECRET: Joi.string().optional().allow(''),
  // Platform fee in basis points (e.g. 1500 = 15%). Used once Stripe Connect
  // is wired for expert payouts (Phase 4); ignored otherwise.
  STRIPE_PLATFORM_FEE_BPS: Joi.number().integer().min(0).max(10000).optional().default(1500),
  // LiveKit (video consultations). Cloud free tier on start (10k connection-min/mo).
  // When LIVEKIT_API_KEY is missing, /video/token returns 503 and mobile shows
  // "Video unavailable" — flow gracefully degrades.
  LIVEKIT_API_KEY: Joi.string().optional().allow(''),
  LIVEKIT_API_SECRET: Joi.string().optional().allow(''),
  LIVEKIT_URL: Joi.string().optional().allow(''),
  // Pilot mode: hide public catalog / disable self-registration. When false
  // (default), mobile shows only "enter code" + "my specialists" + "scheduled".
  // Admin creates experts manually; magic-link works only for existing users.
  EXPERT_CATALOG_ENABLED: Joi.boolean().optional().default(false),
  EXPERT_PUBLIC_REGISTRATION_ENABLED: Joi.boolean().optional().default(false),
  // DeepL key for chat auto-translate (optional; toggle is hidden when missing)
  DEEPL_API_KEY: Joi.string().optional().allow(''),
  // Stripe Connect — when set, the platform can onboard experts as Express accounts
  // and split payments via transfer_data. Without it the platform falls back to
  // single-account mode (all funds land on platform balance; payouts manual).
  STRIPE_CONNECT_CLIENT_ID: Joi.string().optional().allow(''),
  STRIPE_CONNECT_REFRESH_URL: Joi.string().optional().allow(''),
  STRIPE_CONNECT_RETURN_URL: Joi.string().optional().allow(''),
});