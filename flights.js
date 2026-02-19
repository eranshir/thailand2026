// === Flight Status Module ===

import { registerActions } from './actions.js';

/** @type {Array<{flight: import('./trip-data.js').Flight, date: string}>} */
let flightRegistry = [];

/**
 * Clears the flight registry. Call before each day render.
 */
export function clearFlightRegistry() {
  flightRegistry = [];
}

/**
 * Registers a flight and returns its index for click handling.
 * @param {import('./trip-data.js').Flight} flight
 * @param {string} date - YYYY-MM-DD
 * @returns {number} index
 */
export function registerFlight(flight, date) {
  const idx = flightRegistry.length;
  flightRegistry.push({ flight, date });
  return idx;
}

function closeFlightDetail() {
  const el = document.getElementById('flightDetailOverlay');
  if (el) el.remove();
}

function showFlightDetail(idx) {
  const entry = flightRegistry[idx];
  if (!entry) return;

  closeFlightDetail();

  const { flight: f, date } = entry;
  const fn = f.flightNumber;
  const hasFlightNumber = fn && fn !== 'TBD';

  const overlay = document.createElement('div');
  overlay.className = 'flight-detail-overlay';
  overlay.id = 'flightDetailOverlay';
  overlay.innerHTML = `
    <div class="emergency-backdrop" data-action="closeFlightDetail"></div>
    <div class="emergency-sheet">
      <div class="emergency-sheet-handle"></div>
      <div class="emergency-sheet-header">
        <div class="emergency-sheet-title">${hasFlightNumber ? `${f.airline} ${fn}` : `${f.airline || '\u05D8\u05D9\u05E1\u05D4'}`}</div>
        <button class="emergency-close-btn" data-action="closeFlightDetail">\u2715</button>
      </div>
      <div class="emergency-sheet-content">
        <div class="flight-detail-route">
          <div class="flight-detail-point">
            <div class="flight-detail-code">${f.from}</div>
            <div class="flight-detail-city">${f.fromName || ''}</div>
            <div class="flight-detail-scheduled">${f.fromTime}</div>
          </div>
          <div class="flight-detail-arrow">\u2192</div>
          <div class="flight-detail-point">
            <div class="flight-detail-code">${f.to}</div>
            <div class="flight-detail-city">${f.toName || ''}</div>
            <div class="flight-detail-scheduled">${f.toTime}</div>
          </div>
        </div>

        ${f.note ? `<div class="flight-detail-note">${f.note}</div>` : ''}

        ${hasFlightNumber ? `
        <div class="flight-track-links">
          <div class="flight-track-hint">\u05DC\u05D7\u05E6\u05D5 \u05DC\u05D1\u05D3\u05D9\u05E7\u05EA \u05E1\u05D8\u05D8\u05D5\u05E1, \u05D8\u05E8\u05DE\u05D9\u05E0\u05DC, \u05E9\u05E2\u05E8 \u05D5\u05E2\u05D9\u05DB\u05D5\u05D1\u05D9\u05DD:</div>
          <a href="https://www.google.com/search?q=${encodeURIComponent(fn + ' flight status')}" target="_blank" rel="noopener" class="flight-track-btn flight-track-primary">
            \uD83D\uDD0D \u05E1\u05D8\u05D8\u05D5\u05E1 \u05D8\u05D9\u05E1\u05D4 \u05D1-Google
          </a>
          <div class="flight-track-row">
            <a href="https://www.flightaware.com/live/flight/${encodeURIComponent(fn.replace(/\s/g, ''))}" target="_blank" rel="noopener" class="flight-track-btn flight-track-secondary">
              FlightAware
            </a>
            <a href="https://www.flightradar24.com/${fn.replace(/\s/g, '').toLowerCase()}" target="_blank" rel="noopener" class="flight-track-btn flight-track-secondary">
              FlightRadar24
            </a>
          </div>
        </div>
        ` : `
        <div class="flight-no-number">\u05DC\u05D0 \u05D4\u05D5\u05D2\u05D3\u05E8 \u05DE\u05E1\u05E4\u05E8 \u05D8\u05D9\u05E1\u05D4</div>
        `}
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
}

export function initFlightModule() {
  registerActions({
    openFlightDetail: ({ flightIdx }) => showFlightDetail(parseInt(flightIdx, 10)),
    closeFlightDetail: () => closeFlightDetail(),
  });
}
