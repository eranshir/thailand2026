// === Core: Navigation, Rendering, Service Worker, Init ===
// @ts-check

import { formatDate } from './utils.js';
import { getActivitiesForDay, initDragAndDrop, OVERRIDES_KEY } from './drag.js';
import { registerActions } from './actions.js';
import { initTheme, toggleTheme, getThemeIcon } from './theme.js';
import { initShareBindings } from './share.js';
import { renderExpensePanel, getDayBudgetStatus, initExpenseBindings, resetExpensePanel } from './expenses.js';
import { getPackingStats, updatePackingBadge, renderPackingChecklist, isPackingVisible, setPackingVisible, initPackingBindings } from './packing.js';
import { renderWeatherWidget, fetchAllWeather, initWeatherBindings } from './weather.js';
import { initDataBindings } from './data.js';

// === Service Worker ===
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').then((reg) => {
    if (reg.waiting) {
      showUpdateToast(reg.waiting);
    }
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      if (!newWorker) return;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateToast(newWorker);
        }
      });
    });
  }).catch(() => {});

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

function showUpdateToast(worker) {
  const existing = document.querySelector('.sw-update-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'share-toast sw-update-toast';
  toast.textContent = '\u05D2\u05E8\u05E1\u05D4 \u05D7\u05D3\u05E9\u05D4 \u05D6\u05DE\u05D9\u05E0\u05D4 \u2014 \u05DC\u05D7\u05E6\u05D5 \u05DC\u05E8\u05E2\u05E0\u05D5\u05DF';
  toast.style.cursor = 'pointer';
  toast.addEventListener('click', () => {
    worker.postMessage({ type: 'SKIP_WAITING' });
    toast.remove();
  });
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('visible'));
}

// === State ===
/** @type {Object<string, string>} */
const segmentColors = {};
TRIP_DATA.segments.forEach(s => (segmentColors[s.id] = s.color));

/** @type {Object<string, string>} */
const segmentNames = {};
TRIP_DATA.segments.forEach(s => (segmentNames[s.id] = s.name));

/** @type {import('./trip-data.js').TripDay[]} */
const days = TRIP_DATA.days;

/**
 * Finds the index of today's date in the days array, defaulting to 0.
 * @returns {number} Index of today's day or 0
 */
function getTodayIndex() {
  const today = new Date().toISOString().split('T')[0];
  const idx = days.findIndex(d => d.date === today);
  return idx >= 0 ? idx : 0;
}

let currentIndex = getTodayIndex();

/**
 * Returns the current rendering context for child modules.
 * @returns {import('./expenses.js').CoreContext}
 */
function getCtx() {
  return { days, currentIndex, segmentColors, segmentNames };
}

// === Trip Countdown ===
const TRIP_START = new Date('2026-02-20T00:00:00+07:00');
const TRIP_END = new Date('2026-03-07T23:59:59+07:00');

/**
 * Returns a countdown or progress string relative to trip dates.
 * @returns {string} Hebrew text describing days until departure, current trip day, or trip completion
 */
function getTripTimingText() {
  const now = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;

  if (now < TRIP_START) {
    const diff = TRIP_START - now;
    const totalDays = Math.floor(diff / msPerDay);
    const hours = Math.floor((diff % msPerDay) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (totalDays > 0) {
      return `${totalDays} ימים ו-${hours} שעות להמראה`;
    }
    return `${hours} שעות ו-${minutes} דקות להמראה`;
  }

  if (now <= TRIP_END) {
    const elapsed = now - TRIP_START;
    const tripDay = Math.floor(elapsed / msPerDay) + 1;
    return `יום ${tripDay} מתוך ${days.length} בטיול`;
  }

  return 'הטיול הסתיים!';
}

// === Render Header ===
/**
 * Renders the full header including title, day picker, and countdown bar.
 * @returns {void}
 */
function renderHeader() {
  const header = document.getElementById('header');
  const day = days[currentIndex];
  const segment = day.segment;
  const color = segmentColors[segment];
  const timingText = getTripTimingText();

  header.innerHTML = `
    <div class="header-top">
      <div>
        <div class="header-title">${TRIP_DATA.title}</div>
        <div class="header-subtitle">${segmentNames[segment]} | יום ${currentIndex + 1} מתוך ${days.length}</div>
      </div>
      <div class="header-actions">
        <button class="packing-toggle ${isPackingVisible() ? 'active' : ''}" data-action="togglePackingView" aria-label="Packing checklist">🧳 <span class="packing-badge" id="packingBadge">${getPackingStats().percent}%</span></button>
        <button class="share-btn" data-action="shareTrip" aria-label="Share itinerary">↗</button>
        <div class="data-menu-container">
          <button class="data-menu-btn" data-action="toggleDataMenu" aria-label="Data backup">💾</button>
          <div class="data-menu" id="dataMenu">
            <button class="data-menu-item" data-action="exportData">📤 ייצוא גיבוי</button>
            <button class="data-menu-item" data-action="importData">📥 ייבוא גיבוי</button>
            <div class="storage-usage">
              <div class="storage-usage-label">אחסון מקומי</div>
              <div class="storage-usage-track"><div class="storage-usage-fill" id="storageUsageBar"></div></div>
              <div class="storage-usage-text" id="storageUsageText"></div>
            </div>
          </div>
        </div>
        <button class="dark-toggle" data-action="toggleThemeAndRerender" data-index="${currentIndex}" aria-label="Toggle dark mode">${getThemeIcon()}</button>
      </div>
    </div>
    <div class="countdown-bar" id="countdownBar">${timingText}</div>
    <div class="day-picker" id="dayPicker" role="tablist" aria-label="בחירת יום">
      ${renderDayPicker()}
    </div>
  `;

  requestAnimationFrame(() => {
    const activePill = document.querySelector('.day-pill.active');
    if (activePill) {
      activePill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  });
}

/**
 * Generates the HTML for the horizontal day picker pills.
 * @returns {string} HTML string for the day picker
 */
function renderDayPicker() {
  const today = new Date().toISOString().split('T')[0];
  let html = '';
  let lastSegment = null;

  days.forEach((day, i) => {
    if (lastSegment && day.segment !== lastSegment) {
      html += '<div class="segment-divider"></div>';
    }
    lastSegment = day.segment;

    const color = segmentColors[day.segment];
    const secondaryColor = day.secondarySegment ? segmentColors[day.secondarySegment] : null;
    const isActive = i === currentIndex;
    const isToday = day.date === today;
    const isTransition = !!day.secondarySegment;
    const dateNum = day.date.split('-')[2].replace(/^0/, '') + '/' + day.date.split('-')[1].replace(/^0/, '');
    const budgetStatus = getDayBudgetStatus(day.date, day.segment);
    const budgetClass = budgetStatus.status !== 'none' ? ' budget-' + budgetStatus.status : '';

    html += `
      <div class="day-pill ${isActive ? 'active' : ''} ${isToday ? 'today' : ''} ${isTransition ? 'transition' : ''}${budgetClass}"
           style="color: ${color}; ${isActive ? `background: ${color}12;` : ''} ${isTransition ? `--secondary-color: ${secondaryColor};` : ''}"
           data-action="selectDay" data-index="${i}"
           tabindex="0"
           role="tab"
           aria-selected="${isActive}"
           aria-label="יום ${i + 1}, ${day.dayOfWeek} ${dateNum}">
        <span class="day-num">${dateNum}</span>
        <span class="day-name">${day.dayOfWeek}</span>
        ${budgetStatus.status !== 'none' ? '<span class="budget-dot"></span>' : ''}
      </div>
    `;
  });

  return html;
}

// === Render Day Content ===
/**
 * Renders the base day card content (banner, flights, hotel, activities, notes, documents).
 * @returns {void}
 */
function renderDayBase() {
  const main = document.getElementById('main');
  const day = days[currentIndex];
  const color = segmentColors[day.segment];

  let html = `<div class="day-card active" data-date="${day.date}">`;

  // Banner
  html += `
    <div class="day-banner" style="background: ${color}">
      <div>
        <div>${day.dayOfWeek} ${formatDate(day.date)}</div>
        <div class="day-banner-label">${day.label}</div>
      </div>
      <div>${day.secondarySegment ? segmentNames[day.segment] + ' → ' + segmentNames[day.secondarySegment] : segmentNames[day.segment]}</div>
    </div>
  `;

  html += renderSummaryChips(day);

  if (day.flights && day.flights.length > 0) {
    day.flights.forEach(f => { html += renderFlight(f); });
  }

  if (day.hotel) {
    html += renderHotel(day.hotel);
  }

  const activities = getActivitiesForDay(day.date);
  if (activities.length > 0) {
    html += renderActivities(activities);
  }

  if (day.notes && day.notes.length > 0) {
    html += renderNotes(day.notes);
  }

  if (day.documents && day.documents.length > 0) {
    html += renderDocuments(day.documents);
  }

  html += `</div>`;
  main.innerHTML = html;
}

/**
 * Renders the full day view including base content, expenses, and weather.
 * @returns {void}
 */
function renderDay() {
  setPackingVisible(false);
  renderDayBase();
  const main = document.getElementById('main');
  const day = days[currentIndex];

  // Expense panel
  const expenseHtml = renderExpensePanel(day.date, day.segment, getCtx());
  const dayCard = main.querySelector('.day-card');
  if (dayCard) dayCard.insertAdjacentHTML('beforeend', expenseHtml);

  // Weather widget
  if (dayCard) {
    const banner = dayCard.querySelector('.day-banner');
    if (banner) banner.insertAdjacentHTML('afterend', renderWeatherWidget(day.date, day.segment));
  }

  updatePackingBadge();
  initDragAndDrop(() => { renderHeader(); renderDay(); });
}

/**
 * Renders summary chips (flights, hotel, activities, documents counts).
 * @param {import('./trip-data.js').TripDay} day - The day to render chips for
 * @returns {string} HTML string for summary chips
 */
function renderSummaryChips(day) {
  const chips = [];
  if (day.flights && day.flights.length > 0) chips.push({ icon: '✈️', text: `${day.flights.length} טיסות` });
  if (day.hotel) chips.push({ icon: '🏨', text: day.hotel.name.split(' ')[0] });
  const activityCount = getActivitiesForDay(day.date).length;
  if (activityCount > 0) chips.push({ icon: '📍', text: `${activityCount} פעילויות` });
  if (day.documents && day.documents.length > 0) chips.push({ icon: '📄', text: `${day.documents.length} מסמכים` });

  if (chips.length === 0) return '';

  return `<div class="trip-summary">${chips.map(c => `
    <div class="summary-chip">${c.icon} ${c.text}</div>
  `).join('')}</div>`;
}

/**
 * Renders a single flight card.
 * @param {import('./trip-data.js').Flight} f - Flight data
 * @returns {string} HTML string for the flight card
 */
function renderFlight(f) {
  return `
    <div class="flight-card">
      <div class="flight-header">✈️ ${f.airline || 'טיסה'}</div>
      <div class="flight-route">
        <div class="flight-point">
          <div class="flight-code">${f.from}</div>
          <div class="flight-city">${f.fromName || ''}</div>
          <div class="flight-time">${f.fromTime}</div>
        </div>
        <div class="flight-arrow">←</div>
        <div class="flight-point">
          <div class="flight-code">${f.to}</div>
          <div class="flight-city">${f.toName || ''}</div>
          <div class="flight-time">${f.toTime}</div>
        </div>
      </div>
      ${f.note ? `<div class="flight-note">${f.note}</div>` : ''}
    </div>
  `;
}

/**
 * Renders a hotel card.
 * @param {import('./trip-data.js').Hotel} h - Hotel data
 * @returns {string} HTML string for the hotel card
 */
function renderHotel(h) {
  const stars = '★'.repeat(h.stars);
  const nameHtml = h.link
    ? `<a href="${h.link}" target="_blank" rel="noopener">${h.name}</a>`
    : h.name;

  return `
    <div class="hotel-card">
      <div class="hotel-icon">🏨</div>
      <div class="hotel-info">
        <div class="hotel-name">${nameHtml}</div>
        <div class="hotel-details">
          <span class="hotel-stars">${stars}</span>
          <span>${h.room}</span>
          <span>${h.cost}</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Renders the activities section with map links.
 * @param {import('./trip-data.js').Activity[]} activities - Array of activities
 * @returns {string} HTML string for the activities section
 */
function renderActivities(activities) {
  let html = `<div class="activities-section">
    <div class="activities-title">פעילויות</div>`;

  activities.forEach(a => {
    if (a.section) {
      html += `<div class="activity-section-header">${a.section}</div>`;
    }
    const mapsUrl = a.location
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.location)}`
      : null;

    html += `
      <div class="activity-item">
        <div class="activity-icon">${a.icon || '📍'}</div>
        <div class="activity-content">
          <div class="activity-title">
            ${a.title}
            ${a.time ? `<span class="activity-time">${a.time}</span>` : ''}
          </div>
          ${a.note ? `<div class="activity-note">${a.note}</div>` : ''}
        </div>
        ${mapsUrl ? `<a href="${mapsUrl}" target="_blank" rel="noopener" class="activity-map-link" title="נווט ב-Google Maps">📍</a>` : ''}
      </div>
    `;
  });

  html += `</div>`;
  return html;
}

/**
 * Renders the notes section.
 * @param {string[]} notes - Array of note strings
 * @returns {string} HTML string for the notes section
 */
function renderNotes(notes) {
  return `
    <div class="notes-section">
      <div class="notes-title">הערות</div>
      <ul class="notes-list">
        ${notes.map(n => `<li>${n}</li>`).join('')}
      </ul>
    </div>
  `;
}

/**
 * Renders the documents section.
 * @param {Array<{type: string, src?: string, label?: string}>} docs - Array of document objects
 * @returns {string} HTML string for the documents section
 */
function renderDocuments(docs) {
  return `
    <div class="documents-section">
      <div class="documents-title">מסמכים</div>
      ${docs.map(d => `
        <div class="document-item">
          ${d.type === 'image' ? `<img src="${d.src}" alt="${d.label || ''}" />` : ''}
          ${d.label ? `<span>${d.label}</span>` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

// === Navigation ===
function selectDay(index) {
  currentIndex = index;
  setPackingVisible(false);
  renderHeader();
  renderDay();
}

// Register core actions
registerActions({
  selectDay: ({ index }) => selectDay(parseInt(index, 10)),
  toggleThemeAndRerender: ({ index }) => {
    toggleTheme();
    selectDay(parseInt(index, 10));
  },
});

// Swipe support
let touchStartX = 0;
let touchEndX = 0;

document.addEventListener('touchstart', (e) => {
  touchStartX = e.changedTouches[0].screenX;
}, { passive: true });

document.addEventListener('touchend', (e) => {
  touchEndX = e.changedTouches[0].screenX;
  handleSwipe();
}, { passive: true });

function handleSwipe() {
  const diff = touchStartX - touchEndX;
  const threshold = 60;

  if (diff < -threshold && currentIndex > 0) {
    selectDay(currentIndex - 1);
  } else if (diff > threshold && currentIndex < days.length - 1) {
    selectDay(currentIndex + 1);
  }
}

// Keyboard navigation
document.addEventListener('keydown', function (e) {
  const tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

  switch (e.key) {
    case 'ArrowLeft':
      if (currentIndex < days.length - 1) {
        selectDay(currentIndex + 1);
      }
      e.preventDefault();
      break;
    case 'ArrowRight':
      if (currentIndex > 0) {
        selectDay(currentIndex - 1);
      }
      e.preventDefault();
      break;
    case 'Home':
      selectDay(0);
      e.preventDefault();
      break;
    case 'End':
      selectDay(days.length - 1);
      e.preventDefault();
      break;
    case 't':
    case 'T':
      selectDay(getTodayIndex());
      e.preventDefault();
      break;
  }
});

// === Init Bindings ===
// Use getter functions so modules can call renderDay/renderHeader without circular imports
const getRenderDay = () => renderDay;
const getRenderHeader = () => renderHeader;
const getSelectDay = () => selectDay;

initTheme();
initShareBindings(getCtx);
initExpenseBindings(getRenderDay, getRenderHeader, getSelectDay);
initPackingBindings(getRenderDay, getRenderHeader);
initWeatherBindings(getRenderDay);
initDataBindings(getRenderDay, getRenderHeader);

// === Init Render ===
renderHeader();
renderDay();
fetchAllWeather(false, renderDay);

// Update countdown every minute, pause when tab is hidden
let countdownInterval = null;

function startCountdown() {
  if (countdownInterval) return;
  countdownInterval = setInterval(() => {
    const bar = document.getElementById('countdownBar');
    if (bar) bar.textContent = getTripTimingText();
  }, 60 * 1000);
}

function stopCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}

startCountdown();

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopCountdown();
  } else {
    const bar = document.getElementById('countdownBar');
    if (bar) bar.textContent = getTripTimingText();
    startCountdown();
  }
});
