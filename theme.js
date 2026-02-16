// === Dark Mode / Theme ===

import { safeSetItem } from './utils.js';

/**
 * Initializes theme from localStorage, applying saved preference to the document.
 * @returns {void}
 */
export function initTheme() {
  const saved = localStorage.getItem('theme');
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
  }
}

/**
 * Toggles between light and dark themes, persisting the choice to localStorage.
 * @returns {void}
 */
export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  let next;

  if (current === 'dark') {
    next = 'light';
  } else if (current === 'light') {
    next = 'dark';
  } else {
    next = prefersDark ? 'light' : 'dark';
  }

  document.documentElement.setAttribute('data-theme', next);
  safeSetItem('theme', next);
}

/**
 * Returns the appropriate emoji icon for the current theme toggle button.
 * @returns {string} Sun emoji for dark mode, moon emoji for light mode
 */
export function getThemeIcon() {
  const current = document.documentElement.getAttribute('data-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = current === 'dark' || (!current && prefersDark);
  return isDark ? '☀️' : '🌙';
}
