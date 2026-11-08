// Hell/Dunkel: automatisch nach System oder fest gewählt.
import { settings } from './store.js';

const mq = window.matchMedia('(prefers-color-scheme: dark)');

export function applyTheme() {
  const dark = settings.theme === 'dark' || (settings.theme === 'auto' && mq.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = dark ? '#0E1012' : '#F3F2EE';
}

mq.addEventListener ? mq.addEventListener('change', applyTheme) : mq.addListener(applyTheme);
