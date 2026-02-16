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
  // Read from the day-card which contains the date info
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
  items.forEach((item) => {
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
