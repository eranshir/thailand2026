// === Data Export / Import ===

import { showShareToast, safeSetItem, getStorageUsage, PACKING_STORAGE_KEY, JOURNAL_STORAGE_KEY } from './utils.js';
import { OVERRIDES_KEY } from './drag.js';
import { registerActions } from './actions.js';
import { initTheme } from './theme.js';

/** @type {string[]} localStorage keys to export/import */
const DATA_KEYS = ['theme', 'expense_rates', 'trip_expenses', 'trip_budget', PACKING_STORAGE_KEY, 'weather_cache', JOURNAL_STORAGE_KEY, OVERRIDES_KEY];

function exportData() {
  const data = {};
  DATA_KEYS.forEach(key => {
    const val = localStorage.getItem(key);
    if (val !== null) data[key] = val;
  });

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `thailand2026-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showShareToast('הגיבוי הורד בהצלחה!');
}

import { subscribe, publish } from './event-bus.js';

let dataMenuOpen = false;

function updateStorageBar() {
  const bar = document.getElementById('storageUsageBar');
  const text = document.getElementById('storageUsageText');
  if (!bar || !text) return;
  const usage = getStorageUsage();
  bar.style.width = Math.min(usage.percent, 100) + '%';
  bar.style.background = usage.percent > 80 ? '#E53935' : usage.percent > 60 ? '#F9A825' : '#43A047';
  text.textContent = `${usage.usedFormatted} / ${usage.totalFormatted} (${usage.percent}%)`;
}

function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (ev) {
      try {
        const data = JSON.parse(ev.target.result);
        if (typeof data !== 'object' || data === null || Array.isArray(data)) {
          showShareToast('קובץ לא תקין');
          return;
        }

        let imported = 0;
        DATA_KEYS.forEach(key => {
          if (key in data) {
            if (safeSetItem(key, data[key])) {
              imported++;
            }
          }
        });

        if (imported === 0) {
          showShareToast('לא נמצאו נתונים לייבוא');
          return;
        }

        initTheme();
        publish('renderRequested', { type: 'both' });
        showShareToast(`יובאו ${imported} פריטי נתונים!`);
      } catch {
        showShareToast('שגיאה בקריאת הקובץ');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

export function initDataModule() {
  registerActions({
    exportData: () => exportData(),
    importData: () => importData(),
    toggleDataMenu: (_args, event) => {
      event.stopPropagation();
      dataMenuOpen = !dataMenuOpen;
      const menu = document.getElementById('dataMenu');
      if (menu) {
        menu.classList.toggle('visible', dataMenuOpen);
        if (dataMenuOpen) updateStorageBar();
      }
    },
  });

  document.addEventListener('click', function (e) {
    if (dataMenuOpen && !e.target.closest('.data-menu-container')) {
      dataMenuOpen = false;
      const menu = document.getElementById('dataMenu');
      if (menu) menu.classList.remove('visible');
    }
  });
}
