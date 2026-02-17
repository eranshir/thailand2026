// === Expense Tracker & Budget ===

import { escapeHTML, formatDate, showValidationError, clearValidationError, safeSetItem } from './utils.js';
import { registerActions } from './actions.js';

/**
 * @typedef {Object} ExpenseCategory
 * @property {string} id - Category identifier
 * @property {string} label - Hebrew display label
 * @property {string} icon - Emoji icon
 */

/**
 * @typedef {Object} Currency
 * @property {string} id - Currency code (THB, SGD, ILS)
 * @property {string} label - Display label
 * @property {string} symbol - Currency symbol
 */

/**
 * @typedef {Object} Expense
 * @property {string} id - Unique expense identifier
 * @property {string} date - Date string (YYYY-MM-DD)
 * @property {number} amount - Expense amount in original currency
 * @property {string} currency - Currency code
 * @property {string} category - Category ID
 * @property {string} note - Optional note
 */

/**
 * @typedef {Object} BudgetConfig
 * @property {number} daily - Default daily budget in ILS
 * @property {Object<string, number>} segments - Per-segment daily budgets
 */

/**
 * @typedef {Object} BudgetStatus
 * @property {number} spent - Amount spent in ILS
 * @property {number} budget - Budget in ILS
 * @property {number} ratio - Spent/budget ratio
 * @property {'none'|'under'|'near'|'over'} status - Budget status
 */

/**
 * @typedef {Object} CoreContext
 * @property {import('./trip-data.js').TripDay[]} days - Trip days array
 * @property {number} currentIndex - Currently selected day index
 * @property {Object<string, string>} segmentColors - Segment ID to color map
 * @property {Object<string, string>} segmentNames - Segment ID to name map
 */

/** @type {ExpenseCategory[]} */
export const EXPENSE_CATEGORIES = [
  { id: 'food', label: 'אוכל', icon: '🍽️' },
  { id: 'transport', label: 'תחבורה', icon: '🚕' },
  { id: 'accommodation', label: 'לינה', icon: '🏨' },
  { id: 'activity', label: 'פעילות', icon: '🎯' },
];

/** @type {Currency[]} */
export const CURRENCIES = [
  { id: 'THB', label: '฿ THB', symbol: '฿' },
  { id: 'SGD', label: '$ SGD', symbol: 'S$' },
  { id: 'ILS', label: '₪ ILS', symbol: '₪' },
];

const DEFAULT_RATES = { THB: 0.1, SGD: 2.75, ILS: 1 };
const DEFAULT_DAILY_BUDGET = 500;

// --- Storage helpers ---

/**
 * Gets exchange rates from localStorage or returns defaults.
 * @returns {Object<string, number>} Currency code to ILS rate map
 */
function getExchangeRates() {
  const saved = localStorage.getItem('expense_rates');
  return saved ? JSON.parse(saved) : { ...DEFAULT_RATES };
}

function saveExchangeRates(rates) {
  safeSetItem('expense_rates', JSON.stringify(rates));
}

/**
 * Gets all expenses from localStorage.
 * @returns {Expense[]} Array of expense records
 */
export function getExpenses() {
  const saved = localStorage.getItem('trip_expenses');
  return saved ? JSON.parse(saved) : [];
}

function saveExpenses(expenses) {
  safeSetItem('trip_expenses', JSON.stringify(expenses));
}

/**
 * Gets budget configuration from localStorage.
 * @returns {BudgetConfig} Budget configuration
 */
export function getBudgetConfig() {
  const saved = localStorage.getItem('trip_budget');
  return saved ? JSON.parse(saved) : { daily: DEFAULT_DAILY_BUDGET, segments: {} };
}

function saveBudgetConfig(config) {
  safeSetItem('trip_budget', JSON.stringify(config));
}

// --- Calculations ---

/**
 * Converts an amount in a given currency to ILS.
 * @param {number} amount - Amount in original currency
 * @param {string} currency - Currency code
 * @returns {number} Equivalent amount in ILS
 */
export function toILS(amount, currency) {
  const rates = getExchangeRates();
  return amount * (rates[currency] || 1);
}

/**
 * Formats an amount with the appropriate currency symbol.
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code
 * @returns {string} Formatted string like "฿500" or "₪100"
 */
export function formatMoney(amount, currency) {
  const cur = CURRENCIES.find(c => c.id === currency);
  return `${cur ? cur.symbol : ''}${Math.round(amount)}`;
}

/**
 * Calculates total of all expenses converted to ILS.
 * @param {Expense[]} expenses - Array of expenses
 * @returns {number} Total in ILS
 */
export function getTotalInILS(expenses) {
  return expenses.reduce((sum, e) => sum + toILS(e.amount, e.currency), 0);
}

/**
 * Gets the daily budget for a specific segment.
 * @param {string} segmentId - Segment identifier
 * @returns {number} Daily budget in ILS
 */
export function getDailyBudget(segmentId) {
  const config = getBudgetConfig();
  return config.segments[segmentId] || config.daily || DEFAULT_DAILY_BUDGET;
}

/**
 * Gets all expenses for a specific date.
 * @param {string} date - Date string (YYYY-MM-DD)
 * @returns {Expense[]} Expenses for that date
 */
export function getExpensesForDate(date) {
  return getExpenses().filter(e => e.date === date);
}

function getExpensesForSegment(segmentId) {
  const segment = TRIP_DATA.segments.find(s => s.id === segmentId);
  if (!segment) return [];
  const segDates = new Set(segment.dates);
  return getExpenses().filter(e => segDates.has(e.date));
}

/**
 * Gets budget status for a specific day.
 * @param {string} date - Date string (YYYY-MM-DD)
 * @param {string} segmentId - Segment identifier
 * @returns {BudgetStatus} Budget status with spent, budget, ratio, and status level
 */
export function getDayBudgetStatus(date, segmentId) {
  const dayExpenses = getExpensesForDate(date);
  const spent = getTotalInILS(dayExpenses);
  const budget = getDailyBudget(segmentId);
  const ratio = budget > 0 ? spent / budget : 0;
  let status = 'none';
  if (spent > 0 && ratio <= 0.7) status = 'under';
  else if (spent > 0 && ratio <= 1.0) status = 'near';
  else if (spent > 0) status = 'over';
  return { spent, budget, ratio, status };
}

function addExpense(date, amount, currency, category, note) {
  const expenses = getExpenses();
  expenses.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    date,
    amount: parseFloat(amount),
    currency,
    category,
    note: note || '',
  });
  saveExpenses(expenses);
}

function deleteExpense(id) {
  const expenses = getExpenses().filter(e => e.id !== id);
  saveExpenses(expenses);
}

// --- UI State ---

let expensePanelOpen = false;
let ratesEditorOpen = false;
let spendingSummaryOpen = false;
let budgetEditorOpen = false;

// --- Rendering ---
// renderExpensePanel receives context from core to avoid circular imports

/**
 * Renders the full expense panel HTML for a given day.
 * @param {string} date - Date string (YYYY-MM-DD)
 * @param {string} segmentId - Current segment ID
 * @param {CoreContext} ctx - Core rendering context
 * @returns {string} HTML string for the expense panel
 */
export function renderExpensePanel(date, segmentId, ctx) {
  const { days, currentIndex, segmentColors, segmentNames } = ctx;
  const dayExpenses = getExpensesForDate(date);
  const segExpenses = getExpensesForSegment(segmentId);
  const allExpenses = getExpenses();
  const rates = getExchangeRates();
  const dayTotal = getTotalInILS(dayExpenses);
  const segTotal = getTotalInILS(segExpenses);
  const tripTotal = getTotalInILS(allExpenses);

  let html = `<div class="expense-section">
    <div class="expense-header" data-action="toggleExpensePanel">
      <div class="expense-header-title">💰 הוצאות</div>
      <div class="expense-header-summary">
        ${dayTotal > 0 ? `<span class="expense-badge">₪${Math.round(dayTotal)}</span>` : ''}
        <span class="expense-toggle">${expensePanelOpen ? '▲' : '▼'}</span>
      </div>
    </div>`;

  if (expensePanelOpen) {
    html += `<div class="expense-totals">
      <div class="expense-total-item">
        <span class="expense-total-label">יום</span>
        <span class="expense-total-amount">₪${Math.round(dayTotal)}</span>
      </div>
      <div class="expense-total-item">
        <span class="expense-total-label">${segmentNames[segmentId] || 'מקטע'}</span>
        <span class="expense-total-amount">₪${Math.round(segTotal)}</span>
      </div>
      <div class="expense-total-item">
        <span class="expense-total-label">טיול</span>
        <span class="expense-total-amount">₪${Math.round(tripTotal)}</span>
      </div>
    </div>`;

    const budgetInfo = getDayBudgetStatus(date, segmentId);
    const budgetPercent = Math.min(budgetInfo.ratio * 100, 100);
    const budgetBarColor = budgetInfo.status === 'over' ? '#E53935' : budgetInfo.status === 'near' ? '#F9A825' : '#43A047';
    html += `<div class="expense-budget-bar">
      <div class="expense-budget-label">
        <span>תקציב יומי: ₪${Math.round(budgetInfo.budget)}</span>
        <span class="${budgetInfo.status === 'over' ? 'budget-over-text' : ''}">${budgetInfo.spent > 0 ? '₪' + Math.round(budgetInfo.spent) + ' (' + Math.round(budgetInfo.ratio * 100) + '%)' : 'לא הוצאו'}</span>
      </div>
      <div class="expense-budget-track">
        <div class="expense-budget-fill" style="width: ${budgetPercent}%; background: ${budgetBarColor};"></div>
      </div>
    </div>`;

    html += `<div class="expense-action-row">
      <button class="expense-summary-btn" data-action="toggleSpendingSummary">📊 סיכום הוצאות</button>
      <button class="expense-budget-btn" data-action="toggleBudgetEditor">⚙️ תקציב</button>
    </div>`;

    html += `<div class="expense-form">
      <div class="expense-form-row">
        <input type="number" id="expenseAmount" placeholder="סכום" class="expense-input expense-amount" inputmode="decimal" step="any" />
        <select id="expenseCurrency" class="expense-select">
          ${CURRENCIES.map(c => `<option value="${c.id}">${c.label}</option>`).join('')}
        </select>
      </div>
      <div class="expense-form-row">
        <select id="expenseCategory" class="expense-select">
          ${EXPENSE_CATEGORIES.map(c => `<option value="${c.id}">${c.icon} ${c.label}</option>`).join('')}
        </select>
        <input type="text" id="expenseNote" placeholder="הערה (אופציונלי)" class="expense-input expense-note" />
      </div>
      <button class="expense-add-btn" data-action="addExpenseFromForm" data-date="${date}">הוסף</button>
    </div>`;

    if (dayExpenses.length > 0) {
      html += `<div class="expense-list">`;
      dayExpenses.forEach(e => {
        const cat = EXPENSE_CATEGORIES.find(c => c.id === e.category);
        html += `<div class="expense-item">
          <div class="expense-item-icon">${cat ? cat.icon : '💰'}</div>
          <div class="expense-item-details">
            <div class="expense-item-amount">${formatMoney(e.amount, e.currency)}</div>
            <div class="expense-item-meta">${cat ? cat.label : escapeHTML(e.category)}${e.note ? ' · ' + escapeHTML(e.note) : ''}</div>
          </div>
          <div class="expense-item-ils">₪${Math.round(toILS(e.amount, e.currency))}</div>
          <button class="expense-delete-btn" data-action="deleteExpenseItem" data-id="${e.id}">✕</button>
        </div>`;
      });
      html += `</div>`;
    }

    html += `<div class="expense-rates">
      <div class="expense-rates-toggle" data-action="toggleRatesEditor">
        שערי המרה ${ratesEditorOpen ? '▲' : '▼'}
      </div>`;

    if (ratesEditorOpen) {
      html += `<div class="expense-rates-form">`;
      ['THB', 'SGD'].forEach(cur => {
        html += `<div class="expense-rate-row">
          <span>1 ${cur} =</span>
          <input type="number" step="0.01" value="${rates[cur]}" class="expense-input expense-rate-input" data-action="updateRate" data-currency="${cur}" />
          <span>₪</span>
        </div>`;
      });
      html += `<button class="expense-reset-rates" data-action="resetRates">איפוס לברירת מחדל</button>`;
      html += `</div>`;
    }

    html += `</div>`;

    if (spendingSummaryOpen) {
      html += renderSpendingSummary(ctx);
    }

    if (budgetEditorOpen) {
      html += renderBudgetEditor();
    }
  }

  html += `</div>`;
  return html;
}

function renderSpendingSummary(ctx) {
  const { days, currentIndex, segmentColors } = ctx;
  const allExpenses = getExpenses();
  if (allExpenses.length === 0) {
    return `<div class="spending-summary"><div class="spending-empty">אין הוצאות עדיין</div></div>`;
  }

  let html = `<div class="spending-summary">`;

  const catTotals = {};
  EXPENSE_CATEGORIES.forEach(c => { catTotals[c.id] = 0; });
  allExpenses.forEach(e => {
    catTotals[e.category] = (catTotals[e.category] || 0) + toILS(e.amount, e.currency);
  });
  const maxCat = Math.max(...Object.values(catTotals), 1);

  html += `<div class="spending-section-title">הוצאות לפי קטגוריה</div>`;
  EXPENSE_CATEGORIES.forEach(cat => {
    const val = catTotals[cat.id] || 0;
    const pct = maxCat > 0 ? (val / maxCat) * 100 : 0;
    html += `<div class="spending-bar-row">
      <span class="spending-bar-label">${cat.icon} ${cat.label}</span>
      <div class="spending-bar-track">
        <div class="spending-bar-fill" style="width: ${pct}%; background: ${segmentColors[days[currentIndex].segment]};"></div>
      </div>
      <span class="spending-bar-value">₪${Math.round(val)}</span>
    </div>`;
  });

  const dayTotals = [];
  days.forEach(d => {
    const dExp = allExpenses.filter(e => e.date === d.date);
    const total = getTotalInILS(dExp);
    dayTotals.push({ date: d.date, total, segment: d.segment });
  });
  const maxDay = Math.max(...dayTotals.map(d => d.total), 1);

  html += `<div class="spending-section-title" style="margin-top: 16px;">מגמת הוצאות יומית</div>`;
  html += `<div class="spending-trend">`;
  dayTotals.forEach((d, i) => {
    const h = maxDay > 0 ? (d.total / maxDay) * 100 : 0;
    const budgetStatus = getDayBudgetStatus(d.date, d.segment);
    const barColor = budgetStatus.status === 'over' ? '#E53935' : budgetStatus.status === 'near' ? '#F9A825' : segmentColors[d.segment];
    const dateLabel = d.date.split('-')[2].replace(/^0/, '');
    html += `<div class="spending-trend-bar" data-action="selectDay" data-index="${i}" title="₪${Math.round(d.total)}">
      <div class="spending-trend-fill" style="height: ${Math.max(h, 2)}%; background: ${d.total > 0 ? barColor : 'transparent'};"></div>
      <span class="spending-trend-label">${dateLabel}</span>
    </div>`;
  });
  html += `</div>`;

  const currentBudget = getDailyBudget(days[currentIndex].segment);
  html += `<div class="spending-budget-line-label">--- תקציב יומי (₪${Math.round(currentBudget)})</div>`;

  const sortedDays = dayTotals.filter(d => d.total > 0).sort((a, b) => b.total - a.total).slice(0, 3);
  if (sortedDays.length > 0) {
    html += `<div class="spending-section-title" style="margin-top: 16px;">ימים יקרים</div>`;
    sortedDays.forEach((d, rank) => {
      const dayIdx = days.findIndex(dd => dd.date === d.date);
      const dayData = days[dayIdx];
      html += `<div class="spending-top-day" data-action="selectDay" data-index="${dayIdx}">
        <span class="spending-top-rank">${rank + 1}</span>
        <span class="spending-top-date">${dayData.dayOfWeek} ${formatDate(d.date)}</span>
        <span class="spending-top-label">${dayData.label}</span>
        <span class="spending-top-amount">₪${Math.round(d.total)}</span>
      </div>`;
    });
  }

  const totalSpent = getTotalInILS(allExpenses);
  const daysWithExpenses = new Set(allExpenses.map(e => e.date)).size;
  if (daysWithExpenses > 0) {
    const avgDaily = totalSpent / daysWithExpenses;
    const remainingDays = days.length - daysWithExpenses;
    const projected = totalSpent + (avgDaily * remainingDays);
    const totalBudget = days.reduce((sum, d) => sum + getDailyBudget(d.segment), 0);

    html += `<div class="spending-section-title" style="margin-top: 16px;">תחזית תקציב</div>`;
    html += `<div class="spending-projection">
      <div class="spending-proj-row"><span>סה"כ עד כה</span><span>₪${Math.round(totalSpent)}</span></div>
      <div class="spending-proj-row"><span>ממוצע יומי</span><span>₪${Math.round(avgDaily)}</span></div>
      <div class="spending-proj-row"><span>תחזית לסוף הטיול</span><span class="${projected > totalBudget ? 'budget-over-text' : ''}">₪${Math.round(projected)}</span></div>
      <div class="spending-proj-row"><span>תקציב כולל</span><span>₪${Math.round(totalBudget)}</span></div>
      <div class="spending-proj-row spending-proj-remaining"><span>יתרה צפויה</span><span class="${totalBudget - projected < 0 ? 'budget-over-text' : 'budget-under-text'}">₪${Math.round(totalBudget - projected)}</span></div>
    </div>`;
  }

  html += `</div>`;
  return html;
}

function renderBudgetEditor() {
  const config = getBudgetConfig();
  let html = `<div class="budget-editor">`;
  html += `<div class="spending-section-title">הגדרות תקציב יומי (₪)</div>`;

  html += `<div class="budget-row">
    <span class="budget-label">ברירת מחדל</span>
    <input type="number" class="expense-input budget-input" value="${config.daily}" data-action="updateDailyBudget" />
  </div>`;

  TRIP_DATA.segments.forEach(seg => {
    const segBudget = config.segments[seg.id] || '';
    html += `<div class="budget-row">
      <span class="budget-label" style="color: ${seg.color};">${seg.name}</span>
      <input type="number" class="expense-input budget-input" value="${segBudget}" placeholder="${config.daily}" data-action="updateSegmentBudget" data-segment="${seg.id}" />
    </div>`;
  });

  html += `</div>`;
  return html;
}

import { subscribe, publish } from './event-bus.js';

export function initExpenseModule() {
  subscribe('stateChanged', () => {
    resetExpensePanel();
  });

  registerActions({
    toggleExpensePanel: () => {
      expensePanelOpen = !expensePanelOpen;
      publish('renderRequested', { type: 'day' });
    },

    toggleRatesEditor: () => {
      ratesEditorOpen = !ratesEditorOpen;
      publish('renderRequested', { type: 'day' });
    },

    addExpenseFromForm: ({ date }) => {
      const amountInput = document.getElementById('expenseAmount');
      const amount = amountInput.value;
      const currency = document.getElementById('expenseCurrency').value;
      const category = document.getElementById('expenseCategory').value;
      const note = document.getElementById('expenseNote').value;
      const parsed = parseFloat(amount);

      clearValidationError(amountInput);

      if (!amount || isNaN(parsed) || !isFinite(parsed) || parsed <= 0) {
        showValidationError(amountInput, 'יש להזין סכום חיובי');
        return;
      }
      if (parsed > 1000000) {
        showValidationError(amountInput, 'הסכום גבוה מדי (מקסימום 1,000,000)');
        return;
      }

      addExpense(date, amount, currency, category, note);
      publish('renderRequested', { type: 'day' });
    },

    deleteExpenseItem: ({ id }) => {
      deleteExpense(id);
      publish('renderRequested', { type: 'day' });
    },

    updateRate: (_args, _event, el) => {
      const currency = el.dataset.currency;
      const value = el.value;
      const parsed = parseFloat(value);
      clearValidationError(el);

      if (isNaN(parsed) || !isFinite(parsed) || parsed <= 0) {
        showValidationError(el, 'שער חייב להיות מספר חיובי');
        return;
      }
      if (parsed > 1000) {
        showValidationError(el, 'שער גבוה מדי (מקסימום 1,000)');
        return;
      }

      const rates = getExchangeRates();
      rates[currency] = parsed;
      saveExchangeRates(rates);
      publish('renderRequested', { type: 'day' });
    },

    resetRates: () => {
      localStorage.removeItem('expense_rates');
      publish('renderRequested', { type: 'day' });
    },

    toggleSpendingSummary: () => {
      spendingSummaryOpen = !spendingSummaryOpen;
      if (spendingSummaryOpen) budgetEditorOpen = false;
      publish('renderRequested', { type: 'day' });
    },

    toggleBudgetEditor: () => {
      budgetEditorOpen = !budgetEditorOpen;
      if (budgetEditorOpen) spendingSummaryOpen = false;
      publish('renderRequested', { type: 'day' });
    },

    updateDailyBudget: (_args, _event, el) => {
      const parsed = parseFloat(el.value);
      if (isNaN(parsed) || parsed <= 0) return;
      const config = getBudgetConfig();
      config.daily = parsed;
      saveBudgetConfig(config);
      publish('renderRequested', { type: 'both' });
    },

    updateSegmentBudget: (_args, _event, el) => {
      const segmentId = el.dataset.segment;
      const parsed = parseFloat(el.value);
      if (isNaN(parsed) || parsed < 0) return;
      const config = getBudgetConfig();
      if (parsed === 0) {
        delete config.segments[segmentId];
      } else {
        config.segments[segmentId] = parsed;
      }
      saveBudgetConfig(config);
      publish('renderRequested', { type: 'both' });
    },
  });
}

/**
 * Resets the expense panel to its collapsed state.
 * @returns {void}
 */
export function resetExpensePanel() {
  expensePanelOpen = false;
}
