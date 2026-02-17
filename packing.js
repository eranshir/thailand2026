// === Packing Checklist ===

import { escapeHTML, showValidationError, clearValidationError, safeSetItem, PACKING_STORAGE_KEY } from './utils.js';
import { registerActions } from './actions.js';

/**
 * @typedef {Object} PackingItem
 * @property {string} name - Item name
 * @property {boolean} checked - Whether the item is packed
 * @property {boolean} [custom] - Whether this is a user-added item
 */

/**
 * @typedef {Object} PackingCategory
 * @property {string} id - Category identifier
 * @property {string} name - Hebrew category name
 * @property {string} icon - Emoji icon
 * @property {string[]|PackingItem[]} items - Item names (raw) or resolved items
 */

/**
 * @typedef {Object} PackingStats
 * @property {number} total - Total number of items
 * @property {number} checked - Number of packed items
 * @property {number} percent - Percentage packed (0-100)
 */

/** @type {PackingCategory[]} */
const PACKING_CATEGORIES = [
  {
    id: 'documents', name: 'מסמכים', icon: '📄',
    items: ['דרכון', 'צילום דרכון', 'ביטוח נסיעות', 'כרטיסי טיסה', 'אישורי מלון', 'כרטיס אשראי', 'מזומן (בהט / דולר)']
  },
  {
    id: 'clothing', name: 'ביגוד', icon: '👕',
    items: ['חולצות', 'מכנסיים קצרים', 'בגד ים', 'סנדלים', 'נעלי ספורט', 'כובע', 'משקפי שמש', 'שמלה / חולצה לערב']
  },
  {
    id: 'electronics', name: 'אלקטרוניקה', icon: '🔌',
    items: ['מטען טלפון', 'פאוור בנק', 'אוזניות', 'מתאם חשמל', 'מצלמה', 'כבל USB']
  },
  {
    id: 'toiletries', name: 'טואלטיקה', icon: '🧴',
    items: ['קרם הגנה', 'דאודורנט', 'מברשת שיניים', 'משחת שיניים', 'שמפו', 'תרופות', 'דוחה יתושים']
  },
  {
    id: 'diving', name: 'ציוד צלילה', icon: '🤿',
    items: ['מסכה', 'שנורקל', 'סנפירים', 'חולצת לייקרה', 'מצלמה תת-מימית']
  }
];

function loadPackingState() {
  try {
    const saved = localStorage.getItem(PACKING_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch (e) { return {}; }
}

function savePackingState(state) {
  safeSetItem(PACKING_STORAGE_KEY, JSON.stringify(state));
}

function getPackingItems() {
  const state = loadPackingState();
  return PACKING_CATEGORIES.map(cat => {
    const savedCat = state[cat.id];
    const items = cat.items.map(name => ({
      name,
      checked: savedCat ? !!savedCat.checked?.[name] : false
    }));
    if (savedCat?.custom) {
      savedCat.custom.forEach(name => {
        items.push({ name, checked: !!savedCat.checked?.[name], custom: true });
      });
    }
    return { ...cat, items };
  });
}

/**
 * Calculates packing progress statistics.
 * @returns {PackingStats} Total, checked count, and percentage
 */
export function getPackingStats() {
  const categories = getPackingItems();
  let total = 0, checked = 0;
  categories.forEach(cat => {
    cat.items.forEach(item => { total++; if (item.checked) checked++; });
  });
  return { total, checked, percent: total > 0 ? Math.round((checked / total) * 100) : 0 };
}

/**
 * Updates the packing badge element in the header with current progress.
 * @returns {void}
 */
export function updatePackingBadge() {
  const badge = document.getElementById('packingBadge');
  if (!badge) return;
  const stats = getPackingStats();
  badge.textContent = `${stats.percent}%`;
  badge.className = 'packing-badge' + (stats.percent === 100 ? ' complete' : '');
}

/**
 * Renders the full packing checklist into the main content area.
 * @returns {void}
 */
export function renderPackingChecklist() {
  const main = document.getElementById('main');
  const categories = getPackingItems();
  const stats = getPackingStats();

  let html = `<div class="packing-checklist">`;
  html += `<div class="packing-header-bar">
    <div class="packing-title">🧳 רשימת אריזה</div>
    <div class="packing-progress">
      <div class="packing-progress-bar"><div class="packing-progress-fill" style="width: ${stats.percent}%"></div></div>
      <span class="packing-progress-text">${stats.checked}/${stats.total} (${stats.percent}%)</span>
    </div>
  </div>`;

  categories.forEach(cat => {
    const catChecked = cat.items.filter(i => i.checked).length;
    const catTotal = cat.items.length;
    const catDone = catTotal > 0 && catChecked === catTotal;

    html += `<div class="packing-category ${catDone ? 'complete' : ''}">
      <div class="packing-category-header">
        <span>${cat.icon} ${cat.name}</span>
        <span class="packing-category-count">${catChecked}/${catTotal}</span>
      </div>
      <div class="packing-items">`;

    cat.items.forEach(item => {
      const escapedName = escapeHTML(item.name).replace(/'/g, "&#039;");
      html += `
        <label class="packing-item ${item.checked ? 'checked' : ''}">
          <input type="checkbox" ${item.checked ? 'checked' : ''}
                 data-action="togglePackingItem" data-category="${cat.id}" data-item="${escapedName}">
          <span class="packing-item-name">${escapeHTML(item.name)}</span>
          ${item.custom ? `<button class="packing-remove" data-action="removeCustomItem" data-category="${cat.id}" data-item="${escapedName}">✕</button>` : ''}
        </label>`;
    });

    html += `</div>
      <div class="packing-add-row">
        <input type="text" id="custom-input-${cat.id}" class="packing-add-input" placeholder="הוסף פריט..."
               data-enter-action="addCustomItem" data-category="${cat.id}">
        <button class="packing-add-btn" data-action="addCustomItem" data-category="${cat.id}">+</button>
      </div>
    </div>`;
  });

  html += `</div>`;
  main.innerHTML = html;
}

// --- UI State ---

let showPacking = false;

/**
 * Returns whether the packing view is currently visible.
 * @returns {boolean}
 */
export function isPackingVisible() {
  return showPacking;
}

/**
 * Sets the packing view visibility state.
 * @param {boolean} val - Whether to show packing view
 * @returns {void}
 */
export function setPackingVisible(val) {
  showPacking = val;
}

import { subscribe, publish } from './event-bus.js';

export function initPackingModule() {
  registerActions({
    togglePackingItem: ({ category, item }) => {
      const state = loadPackingState();
      if (!state[category]) state[category] = { checked: {}, custom: [] };
      if (!state[category].checked) state[category].checked = {};
      state[category].checked[item] = !state[category].checked[item];
      savePackingState(state);
      renderPackingChecklist();
      updatePackingBadge();
    },

    addCustomItem: ({ category }) => {
      const input = document.getElementById('custom-input-' + category);
      if (!input) return;
      clearValidationError(input);
      const name = input.value.trim();
      if (!name) {
        showValidationError(input, 'יש להזין שם פריט');
        return;
      }
      const state = loadPackingState();
      if (!state[category]) state[category] = { checked: {}, custom: [] };
      if (!state[category].custom) state[category].custom = [];
      if (state[category].custom.includes(name)) return;
      state[category].custom.push(name);
      savePackingState(state);
      input.value = '';
      renderPackingChecklist();
      updatePackingBadge();
    },

    removeCustomItem: ({ category, item }, event) => {
      event.preventDefault();
      const state = loadPackingState();
      if (!state[category]?.custom) return;
      state[category].custom = state[category].custom.filter(n => n !== item);
      if (state[category].checked) delete state[category].checked[item];
      savePackingState(state);
      renderPackingChecklist();
      updatePackingBadge();
    },

    togglePackingView: () => {
      showPacking = !showPacking;
      publish('renderRequested', { type: 'header' });
      if (showPacking) {
        renderPackingChecklist();
      } else {
        publish('renderRequested', { type: 'day' });
      }
    },
  });
}
