// Import first in every script: loads .env.local before anything reads process.env.
try {
  process.loadEnvFile('.env.local');
} catch {
  /* no .env.local: rely on the real environment */
}
