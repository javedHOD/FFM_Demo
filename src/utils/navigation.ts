/** Migrate legacy hash URLs (/#/orders) to clean paths (/orders) */
export const normalizeAppUrl = (): void => {
  const { pathname, hash, origin } = window.location;

  if (hash.startsWith('#/')) {
    const route = hash.slice(1);
    window.history.replaceState(null, '', `${origin}${route}`);
  } else if (pathname === '/login' && hash) {
    window.history.replaceState(null, '', `${origin}/login`);
  }
};

/** Full redirect to login (axios interceptor / session expiry) */
export const redirectToLogin = (): void => {
  window.location.replace(`${window.location.origin}/login`);
};
