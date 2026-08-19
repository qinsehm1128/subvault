const KEY = 'subvault-theme';

export function applyTheme(theme: 'light' | 'dark') {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0f172a' : '#f8fafc');
  localStorage.setItem(KEY, theme);
}

export function initTheme(): 'light' | 'dark' {
  const saved = localStorage.getItem(KEY);
  const theme = saved === 'dark' || saved === 'light'
    ? saved
    : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(theme);
  return theme;
}

export function toggleTheme(): 'light' | 'dark' {
  const next = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
  applyTheme(next);
  return next;
}
