// Cloudflare ortam değişkenleri ve bağlantıları (wrangler.jsonc ile uyumlu)
interface CloudflareEnv {
  DB: import("@cloudflare/workers-types").D1Database;
  ASSETS: import("@cloudflare/workers-types").Fetcher;
  APP_URL: string;
  AUTH_SECRET: string;
  CRON_SECRET?: string;
  WHATSAPP_PROVIDER?: string;
  WHATSAPP_TOKEN?: string;
  WHATSAPP_PHONE_NUMBER_ID?: string;
  WHATSAPP_TEMPLATE?: string;
  WHATSAPP_TEMPLATE_LANG?: string;
}
