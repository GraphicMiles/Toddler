// Warn loudly at dev time if critical environment variables are missing.
// In production builds, missing vars still surface per-feature (predict/onboarding
// show "VITE_API_URL is missing" toasts) — this just adds a console heads-up.

const REQUIRED = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_API_URL',
];

const warned = new Set();

export function checkEnv() {
  if (typeof window === 'undefined') return;
  for (const key of REQUIRED) {
    const val = import.meta.env[key];
    if (!val || val.startsWith('your_')) {
      if (!warned.has(key)) {
        console.warn(`[toddler:env] ${key} is not set. Set it in .env before using this feature.`);
        warned.add(key);
      }
    }
  }
}
