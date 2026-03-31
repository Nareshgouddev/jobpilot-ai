process.env.NODE_ENV = process.env.NODE_ENV ?? "test";
process.env.PORT = process.env.PORT ?? "4000";
process.env.SUPABASE_URL = process.env.SUPABASE_URL ?? "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "service-role-key";
process.env.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? "openrouter-key";
process.env.OPENROUTER_MODEL = process.env.OPENROUTER_MODEL ?? "openrouter/auto";
process.env.OPENROUTER_TIMEOUT_MS = process.env.OPENROUTER_TIMEOUT_MS ?? "20000";
process.env.OPENROUTER_MAX_RETRIES = process.env.OPENROUTER_MAX_RETRIES ?? "2";
process.env.JWT_SECRET = process.env.JWT_SECRET ?? "this_is_a_test_secret_that_is_long_enough";
process.env.JWT_ACCESS_TTL_SECONDS = process.env.JWT_ACCESS_TTL_SECONDS ?? "900";
process.env.JWT_ISSUER = process.env.JWT_ISSUER ?? "jobpilot-backend";
process.env.JWT_AUDIENCE = process.env.JWT_AUDIENCE ?? "jobpilot-extension";
process.env.EXTENSION_SHARED_SECRET = process.env.EXTENSION_SHARED_SECRET ?? "this_is_a_test_extension_secret_key";
process.env.VITE_EXTENSION_SHARED_SECRET =
	process.env.VITE_EXTENSION_SHARED_SECRET ?? "this_is_an_alternate_extension_secret_key";
process.env.ADMIN_API_KEY = process.env.ADMIN_API_KEY ?? "this_is_a_test_admin_secret_key";
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:5173";
process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? "silent";
