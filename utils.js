// === Shared Utilities ===

/**
 * Escapes HTML special characters to prevent XSS.
 * @param {string} str - The string to escape
 * @returns {string} The escaped string
 */
export function escapeHTML(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Formats a date string from YYYY-MM-DD to D/M.
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {string} Formatted date as "D/M"
 */
export function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${parseInt(d)}/${parseInt(m)}`;
}

/**
 * Displays a temporary toast notification message.
 * @param {string} msg - The message to display
 * @returns {void}
 */
export function showShareToast(msg) {
  const toast = document.createElement('div');
  toast.className = 'share-toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('visible'));
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

/**
 * Shows a validation error message below an input element.
 * @param {HTMLInputElement} input - The input element to highlight
 * @param {string} message - The error message to display
 * @returns {void}
 */
export function showValidationError(input, message) {
  input.classList.add('validation-error');
  let msg = input.parentElement.querySelector('.validation-msg');
  if (!msg) {
    msg = document.createElement('div');
    msg.className = 'validation-msg';
    input.parentElement.appendChild(msg);
  }
  msg.textContent = message;
}

/**
 * Clears a validation error from an input element.
 * @param {HTMLInputElement} input - The input element to clear
 * @returns {void}
 */
export function clearValidationError(input) {
  input.classList.remove('validation-error');
  const msg = input.parentElement.querySelector('.validation-msg');
  if (msg) msg.remove();
}

// Constants
export const JOURNAL_STORAGE_KEY = 'thailand2026_journal';
export const PACKING_STORAGE_KEY = 'thailand2026_packing';
export const WEATHER_CACHE_KEY = 'weather_cache';

// === localStorage Quota Handling ===

// Keys eligible for LRU eviction (expendable caches, ordered by eviction priority)
const EVICTABLE_KEYS = [WEATHER_CACHE_KEY];

/**
 * Safe wrapper around localStorage.setItem that handles QuotaExceededError.
 * On quota error: evicts weather cache first, then retries. Shows Hebrew toast on failure.
 * Returns true if write succeeded, false otherwise.
 */
export function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)) {
      // Try evicting expendable data
      for (const evictKey of EVICTABLE_KEYS) {
        if (evictKey === key) continue; // don't evict what we're trying to write
        const evicted = localStorage.getItem(evictKey);
        if (evicted) {
          localStorage.removeItem(evictKey);
          try {
            localStorage.setItem(key, value);
            showShareToast('נפנה מקום אחסון — מטמון מזג אוויר נמחק');
            return true;
          } catch (_) {
            // still not enough space
          }
        }
      }
      showShareToast('האחסון המקומי מלא — לא ניתן לשמור נתונים');
      return false;
    }
    throw e;
  }
}

/**
 * Returns storage usage info: { used, total, percent, usedFormatted, totalFormatted }
 * Sizes in bytes. total is estimated (5MB default for localStorage).
 */
export function getStorageUsage() {
  let used = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const val = localStorage.getItem(key);
    // Each char is 2 bytes in JS string (UTF-16), but localStorage reports vary.
    // Use byte length approximation: key + value character count × 2
    used += (key.length + val.length) * 2;
  }
  const total = 5 * 1024 * 1024; // 5MB estimate
  return {
    used,
    total,
    percent: Math.round((used / total) * 100),
    usedFormatted: formatBytes(used),
    totalFormatted: formatBytes(total),
  };
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
