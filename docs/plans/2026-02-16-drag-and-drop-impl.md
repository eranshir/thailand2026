# Drag and Drop Activities — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable drag-and-drop reordering of activities within a day and moving activities between days, with persistent localStorage overrides and undo support.

**Architecture:** New `drag.js` module handles override persistence and drag interaction. `core.js` gets minimal changes: use `getActivitiesForDay()` instead of `day.activities`, call `initDragAndDrop()` after render. CSS additions for drag states.

**Tech Stack:** Vanilla JS (touch + mouse events), localStorage, CSS transitions

---

### Task 1: Create drag.js — Override Persistence Layer

**Files:**
- Create: `drag.js`

**Step 1: Create `drag.js` with override storage and activity resolution**

```js
// drag.js — Activity override persistence + drag-and-drop
import { safeSetItem, showShareToast } from './utils.js';

const OVERRIDES_KEY = 'trip_activity_overrides';

/** Load overrides from localStorage */
export function loadOverrides() {
  try {
    const saved = localStorage.getItem(OVERRIDES_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch { return {}; }
}

/** Save overrides to localStorage */
function saveOverrides(overrides) {
  safeSetItem(OVERRIDES_KEY, JSON.stringify(overrides));
}

/**
 * Get activities for a given day date, resolving overrides.
 * Falls back to TRIP_DATA default if no override exists.
 * @param {string} date - YYYY-MM-DD
 * @returns {import('./trip-data.js').Activity[]}
 */
export function getActivitiesForDay(date) {
  const overrides = loadOverrides();
  if (!overrides[date]) {
    // No override — return original
    const day = TRIP_DATA.days.find(d => d.date === date);
    return day ? (day.activities || []) : [];
  }
  // Resolve references back to original TRIP_DATA activities
  return overrides[date].map(ref => {
    const srcDay = TRIP_DATA.days.find(d => d.date === ref.originalDay);
    if (!srcDay || !srcDay.activities || !srcDay.activities[ref.index]) return null;
    return srcDay.activities[ref.index];
  }).filter(Boolean);
}

/**
 * Move an activity from one day/position to another.
 * Returns the previous overrides state for undo.
 */
export function moveActivity(fromDate, fromIndex, toDate, toIndex) {
  const prevOverrides = loadOverrides();
  const overrides = JSON.parse(JSON.stringify(prevOverrides));

  // Ensure both days have explicit override arrays
  if (!overrides[fromDate]) {
    overrides[fromDate] = buildDefaultRefs(fromDate);
  }
  if (!overrides[toDate]) {
    overrides[toDate] = buildDefaultRefs(toDate);
  }

  // Remove from source
  const [moved] = overrides[fromDate].splice(fromIndex, 1);
  if (!moved) return prevOverrides;

  // Insert at target
  if (toIndex === -1 || toIndex >= overrides[toDate].length) {
    overrides[toDate].push(moved);
  } else {
    overrides[toDate].splice(toIndex, 0, moved);
  }

  saveOverrides(overrides);
  return prevOverrides;
}

/**
 * Reorder an activity within the same day.
 * Returns the previous overrides state for undo.
 */
export function reorderActivity(date, fromIndex, toIndex) {
  const prevOverrides = loadOverrides();
  const overrides = JSON.parse(JSON.stringify(prevOverrides));

  if (!overrides[date]) {
    overrides[date] = buildDefaultRefs(date);
  }

  const [moved] = overrides[date].splice(fromIndex, 1);
  if (!moved) return prevOverrides;
  overrides[date].splice(toIndex, 0, moved);

  saveOverrides(overrides);
  return prevOverrides;
}

/** Restore a previous overrides snapshot (for undo) */
export function restoreOverrides(snapshot) {
  saveOverrides(snapshot);
}

/** Build default reference array for a day (identity mapping) */
function buildDefaultRefs(date) {
  const day = TRIP_DATA.days.find(d => d.date === date);
  if (!day || !day.activities) return [];
  return day.activities.map((_, i) => ({ originalDay: date, index: i }));
}

export { OVERRIDES_KEY };
```

**Step 2: Verify the file was created correctly**

Open the app in browser, check console for no import errors.

**Step 3: Commit**

```bash
git add drag.js
git commit -m "feat: add activity override persistence layer (drag.js)"
```

---

### Task 2: Integrate getActivitiesForDay into core.js rendering

**Files:**
- Modify: `core.js:1-10` (imports)
- Modify: `core.js:245` (renderDayBase — day.activities usage)
- Modify: `core.js:294` (renderSummaryChips — day.activities usage)

**Step 1: Add import in core.js**

At top of `core.js`, add:
```js
import { getActivitiesForDay, OVERRIDES_KEY } from './drag.js';
```

**Step 2: Update renderDayBase to use getActivitiesForDay**

In `renderDayBase()`, change the activities block (around line 245):

FROM:
```js
  if (day.activities && day.activities.length > 0) {
    html += renderActivities(day.activities);
  }
```

TO:
```js
  const activities = getActivitiesForDay(day.date);
  if (activities.length > 0) {
    html += renderActivities(activities);
  }
```

**Step 3: Update renderSummaryChips to use getActivitiesForDay**

In `renderSummaryChips()`, change (around line 294):

FROM:
```js
  if (day.activities) chips.push({ icon: '📍', text: `${day.activities.length} פעילויות` });
```

TO:
```js
  const activityCount = getActivitiesForDay(day.date).length;
  if (activityCount > 0) chips.push({ icon: '📍', text: `${activityCount} פעילויות` });
```

**Step 4: Add OVERRIDES_KEY to DATA_KEYS in data.js**

In `data.js`, add to the DATA_KEYS array:
```js
import { OVERRIDES_KEY } from './drag.js';
```
And add `OVERRIDES_KEY` to the array.

**Step 5: Verify app renders correctly**

Open the app, verify activities still display properly for each day.

**Step 6: Commit**

```bash
git add core.js data.js
git commit -m "feat: integrate activity overrides into rendering pipeline"
```

---

### Task 3: Add drag-and-drop CSS styles

**Files:**
- Modify: `style.css` (append before the safe-area section at the end)

**Step 1: Add drag-and-drop styles to style.css**

Append before the `/* === Safe area */` comment (around line 2276):

```css
/* === Drag and Drop === */
.activity-item {
  position: relative;
  transition: transform 0.2s ease, opacity 0.2s ease, margin 0.2s ease;
  touch-action: manipulation;
}

.activity-item.dragging {
  opacity: 0.3;
  transform: scale(0.95);
}

.activity-item.drag-gap-before {
  margin-top: 48px;
}

.drag-ghost {
  position: fixed;
  z-index: 10000;
  pointer-events: none;
  opacity: 0.92;
  transform: scale(1.03);
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
  border-radius: var(--radius-sm);
  background: var(--bg-card);
  max-width: calc(100vw - 40px);
  transition: none;
}

.day-pill.drop-target {
  transform: scale(1.15);
  box-shadow: 0 0 0 3px currentColor;
  z-index: 10;
}

body.is-dragging {
  overflow: hidden;
  -webkit-user-select: none;
  user-select: none;
}

/* Undo toast */
.undo-toast {
  position: fixed;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%) translateY(20px);
  background: var(--text, #2D2D2D);
  color: var(--bg, #FFF8F0);
  padding: 10px 16px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  z-index: 1000;
  opacity: 0;
  transition: opacity 0.3s ease, transform 0.3s ease;
  display: flex;
  align-items: center;
  gap: 12px;
  direction: rtl;
}

.undo-toast.visible {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
  pointer-events: auto;
}

.undo-toast-btn {
  background: none;
  border: 1.5px solid currentColor;
  color: inherit;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
}

.undo-toast-btn:active {
  opacity: 0.7;
}
```

**Step 2: Commit**

```bash
git add style.css
git commit -m "feat: add drag-and-drop CSS styles"
```

---

### Task 4: Implement drag-and-drop interaction in drag.js

**Files:**
- Modify: `drag.js` (add interaction logic)
- Modify: `core.js` (call initDragAndDrop after render)

**Step 1: Add drag interaction to drag.js**

Append to `drag.js`:

```js
// === Drag and Drop Interaction ===

let dragState = null; // { el, ghostEl, fromDate, fromIndex, startX, startY }
let longPressTimer = null;
let lastUndoSnapshot = null;
let undoToastTimer = null;
let renderCallback = null;

/**
 * Initialize drag-and-drop on current DOM.
 * Call after each renderDay().
 * @param {() => void} onRerender - callback to re-render after drop
 */
export function initDragAndDrop(onRerender) {
  renderCallback = onRerender;
  const items = document.querySelectorAll('.activity-item');
  items.forEach((el, index) => {
    // Find the day date from the closest day-card context
    const dayCard = el.closest('.day-card');
    if (!dayCard) return;

    el.setAttribute('data-drag-index', index);

    // Touch events
    el.addEventListener('touchstart', (e) => startLongPress(e, el, index), { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', cancelDrag);

    // Mouse events
    el.addEventListener('mousedown', (e) => startLongPress(e, el, index));
  });
}

function getCurrentDayDate() {
  // Read from the day-banner which contains the date info
  // We store it as a data attribute during render
  const banner = document.querySelector('.day-card[data-date]');
  return banner ? banner.dataset.date : null;
}

function startLongPress(e, el, index) {
  // Don't start drag if tapping a link
  if (e.target.closest('a')) return;

  const touch = e.touches ? e.touches[0] : e;
  const startX = touch.clientX;
  const startY = touch.clientY;

  longPressTimer = setTimeout(() => {
    const date = getCurrentDayDate();
    if (!date) return;
    beginDrag(el, index, date, startX, startY);
  }, 500);

  // Cancel long press if finger moves too much
  const cancelOnMove = (moveE) => {
    const mt = moveE.touches ? moveE.touches[0] : moveE;
    if (Math.abs(mt.clientX - startX) > 10 || Math.abs(mt.clientY - startY) > 10) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
      document.removeEventListener('touchmove', cancelOnMove);
      document.removeEventListener('mousemove', cancelOnMove);
    }
  };
  document.addEventListener('touchmove', cancelOnMove, { passive: true });
  document.addEventListener('mousemove', cancelOnMove);

  // Also cancel on mouseup before long press fires
  const cancelOnUp = () => {
    clearTimeout(longPressTimer);
    longPressTimer = null;
    document.removeEventListener('mouseup', cancelOnUp);
    document.removeEventListener('touchmove', cancelOnMove);
    document.removeEventListener('mousemove', cancelOnMove);
  };
  document.addEventListener('mouseup', cancelOnUp, { once: true });
}

function beginDrag(el, index, date, startX, startY) {
  // Haptic feedback
  if (navigator.vibrate) navigator.vibrate(30);

  // Create ghost
  const rect = el.getBoundingClientRect();
  const ghost = el.cloneNode(true);
  ghost.className = 'drag-ghost';
  ghost.style.width = rect.width + 'px';
  ghost.style.left = rect.left + 'px';
  ghost.style.top = rect.top + 'px';
  document.body.appendChild(ghost);

  el.classList.add('dragging');
  document.body.classList.add('is-dragging');

  dragState = {
    el,
    ghostEl: ghost,
    fromDate: date,
    fromIndex: index,
    startX,
    startY,
    offsetX: startX - rect.left,
    offsetY: startY - rect.top,
  };

  // Highlight day pills as potential drop targets
  document.querySelectorAll('.day-pill').forEach(pill => {
    pill.classList.add('potential-drop');
  });

  // Mouse move/up for desktop
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

function onTouchMove(e) {
  if (!dragState) return;
  e.preventDefault(); // prevent scroll during drag
  const touch = e.touches[0];
  updateGhostPosition(touch.clientX, touch.clientY);
  updateDropTargets(touch.clientX, touch.clientY);
}

function onMouseMove(e) {
  if (!dragState) return;
  updateGhostPosition(e.clientX, e.clientY);
  updateDropTargets(e.clientX, e.clientY);
}

function updateGhostPosition(clientX, clientY) {
  if (!dragState || !dragState.ghostEl) return;
  dragState.ghostEl.style.left = (clientX - dragState.offsetX) + 'px';
  dragState.ghostEl.style.top = (clientY - dragState.offsetY) + 'px';
}

function updateDropTargets(clientX, clientY) {
  if (!dragState) return;

  // Check day pills
  document.querySelectorAll('.day-pill').forEach(pill => {
    const rect = pill.getBoundingClientRect();
    const isOver = clientX >= rect.left && clientX <= rect.right &&
                   clientY >= rect.top && clientY <= rect.bottom;
    pill.classList.toggle('drop-target', isOver);
  });

  // Check activity items for reorder within same day
  const items = document.querySelectorAll('.activity-item:not(.dragging)');
  items.forEach(item => {
    const rect = item.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const isAbove = clientY < midY && clientY > rect.top - 20;
    item.classList.toggle('drag-gap-before', isAbove);
  });
}

function onTouchEnd(e) {
  if (!dragState) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
    return;
  }
  const touch = e.changedTouches[0];
  finishDrag(touch.clientX, touch.clientY);
}

function onMouseUp(e) {
  if (!dragState) return;
  finishDrag(e.clientX, e.clientY);
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
}

function finishDrag(clientX, clientY) {
  if (!dragState) return;

  // Check if dropped on a day pill
  let droppedOnPill = null;
  document.querySelectorAll('.day-pill').forEach(pill => {
    const rect = pill.getBoundingClientRect();
    if (clientX >= rect.left && clientX <= rect.right &&
        clientY >= rect.top && clientY <= rect.bottom) {
      droppedOnPill = pill;
    }
  });

  if (droppedOnPill) {
    // Move to another day
    const targetDayIndex = parseInt(droppedOnPill.dataset.index, 10);
    const targetDate = TRIP_DATA.days[targetDayIndex].date;
    if (targetDate !== dragState.fromDate) {
      lastUndoSnapshot = moveActivity(dragState.fromDate, dragState.fromIndex, targetDate, -1);
      cleanupDrag();
      if (renderCallback) renderCallback();
      showUndoToast(`הועבר ליום ${targetDayIndex + 1}`);
      return;
    }
  }

  // Check if reordering within the same day
  let targetIndex = -1;
  const items = document.querySelectorAll('.activity-item:not(.dragging)');
  items.forEach((item, i) => {
    if (item.classList.contains('drag-gap-before')) {
      // Adjust index: items list doesn't include the dragging item
      const actualIndex = parseInt(item.getAttribute('data-drag-index'), 10);
      targetIndex = actualIndex;
    }
  });

  if (targetIndex >= 0 && targetIndex !== dragState.fromIndex) {
    // Adjust for removal shift
    const adjustedTarget = targetIndex > dragState.fromIndex ? targetIndex - 1 : targetIndex;
    lastUndoSnapshot = reorderActivity(dragState.fromDate, dragState.fromIndex, adjustedTarget);
    cleanupDrag();
    if (renderCallback) renderCallback();
    showUndoToast('סדר עודכן');
    return;
  }

  // No valid drop — cancel
  cleanupDrag();
}

function cancelDrag() {
  clearTimeout(longPressTimer);
  longPressTimer = null;
  cleanupDrag();
}

function cleanupDrag() {
  if (dragState) {
    if (dragState.ghostEl) dragState.ghostEl.remove();
    if (dragState.el) dragState.el.classList.remove('dragging');
  }
  dragState = null;
  document.body.classList.remove('is-dragging');
  document.querySelectorAll('.day-pill').forEach(p => {
    p.classList.remove('drop-target', 'potential-drop');
  });
  document.querySelectorAll('.activity-item').forEach(item => {
    item.classList.remove('drag-gap-before');
  });
}

function showUndoToast(message) {
  // Remove existing
  const existing = document.querySelector('.undo-toast');
  if (existing) existing.remove();
  clearTimeout(undoToastTimer);

  const toast = document.createElement('div');
  toast.className = 'undo-toast';
  toast.innerHTML = `
    <span>${message}</span>
    <button class="undo-toast-btn">ביטול</button>
  `;

  const undoBtn = toast.querySelector('.undo-toast-btn');
  undoBtn.addEventListener('click', () => {
    if (lastUndoSnapshot !== null) {
      restoreOverrides(lastUndoSnapshot);
      lastUndoSnapshot = null;
      if (renderCallback) renderCallback();
    }
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
    clearTimeout(undoToastTimer);
  });

  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('visible'));

  undoToastTimer = setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
    lastUndoSnapshot = null;
  }, 5000);
}
```

**Step 2: Add data-date attribute to day card in core.js**

In `core.js` `renderDayBase()`, change the day-card opening tag (around line 222):

FROM:
```js
  let html = `<div class="day-card active">`;
```

TO:
```js
  let html = `<div class="day-card active" data-date="${day.date}">`;
```

**Step 3: Add data-index to day pills in renderDayPicker**

The day pills already have `data-action="selectDay" data-index="${i}"` — this `data-index` is what `drag.js` reads. No change needed.

**Step 4: Call initDragAndDrop after renderDay in core.js**

Import and call at end of `renderDay()`:

Add to imports:
```js
import { getActivitiesForDay, initDragAndDrop, OVERRIDES_KEY } from './drag.js';
```
(Update the existing import line)

At end of `renderDay()` function, after `updatePackingBadge()`:
```js
  initDragAndDrop(() => { renderHeader(); renderDay(); });
```

**Step 5: Verify the complete flow**

- Open app in browser
- Long-press an activity (hold for 500ms)
- Verify ghost appears and follows finger/mouse
- Drag to a day pill — verify it highlights
- Drop — verify activity moves and undo toast appears
- Click undo — verify activity returns
- Reorder within same day — verify it works

**Step 6: Commit**

```bash
git add drag.js core.js
git commit -m "feat: implement drag-and-drop interaction for activities"
```

---

### Task 5: Polish and edge cases

**Files:**
- Modify: `drag.js` (minor fixes)
- Modify: `style.css` (dark mode for drag styles)

**Step 1: Add dark mode styles for drag**

Append to the drag CSS section in `style.css`:

```css
[data-theme="dark"] .drag-ghost {
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .drag-ghost {
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  }
}
```

**Step 2: Verify dark mode looks correct**

Toggle dark mode, drag an activity, verify ghost and pill highlights look good.

**Step 3: Test on mobile (or mobile simulator)**

- Test long-press doesn't interfere with normal tap/scroll
- Test drag works with touch
- Test undo toast is tappable

**Step 4: Final commit**

```bash
git add style.css drag.js
git commit -m "feat: polish drag-and-drop dark mode and edge cases"
```
