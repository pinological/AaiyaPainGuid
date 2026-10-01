// Colour theme: 'system' follows the device (default), 'light' and 'dark' are the user's explicit choice.
// The choice lives in this browser only. An inline script in app/layout.tsx applies it before first paint (no flash).
export type Theme = 'system' | 'light' | 'dark';

export const THEMES: Theme[] = ['system', 'light', 'dark'];
export const THEME_KEY = 'mirror.theme';
export const isTheme = (v: unknown): v is Theme => v === 'system' || v === 'light' || v === 'dark';

/** The script that runs in <head> before the page paints. */
export const THEME_BOOT = `try{var t=localStorage.getItem('${THEME_KEY}');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

const BAR = { light: '#faf7f1', dark: '#1c1a17' }; // browser UI colour (Android address bar), matches --panel

export function readTheme(): Theme {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return isTheme(v) ? v : 'system';
  } catch {
    return 'system';
  }
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme;
  try {
    if (theme === 'system') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, theme);
  } catch {}
  // An explicit choice overrides the two media-query theme-color tags; "system" removes the override again.
  const id = 'theme-color-override';
  document.getElementById(id)?.remove();
  if (theme !== 'system') {
    const meta = document.createElement('meta');
    meta.id = id;
    meta.name = 'theme-color';
    meta.content = BAR[theme];
    document.head.prepend(meta);
  }
}
