// === Flight Status Module ===

import { registerActions } from './actions.js';
import { showShareToast } from './utils.js';

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
        <div class="emergency-sheet-title">${hasFlightNumber ? `${f.airline} ${fn}` : `${f.airline || 'Flight'}`}</div>
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

        <div id="flightLiveData" class="flight-live-section">
          ${hasFlightNumber ? '<div class="flight-live-loading">loading live data...</div>' : ''}
        </div>

        ${f.note ? `<div class="flight-detail-note">${f.note}</div>` : ''}

        ${hasFlightNumber ? `
        <div class="flight-track-links">
          <a href="https://www.google.com/search?q=${encodeURIComponent(fn + ' flight status ' + date)}" target="_blank" rel="noopener" class="flight-track-btn flight-track-primary">
            <span class="flight-track-icon">\uD83D\uDD0D</span> Google Flight Status
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

  if (hasFlightNumber) {
    fetchFlightStatus(fn);
  }
}

async function fetchFlightStatus(flightNumber) {
  const liveSection = document.getElementById('flightLiveData');
  if (!liveSection) return;

  const apiKey = localStorage.getItem('flightApiKey');

  if (!apiKey) {
    liveSection.innerHTML = `
      <div class="flight-live-setup">
        <div class="flight-live-setup-text">\u05DC\u05D4\u05E6\u05D2\u05EA \u05D8\u05E8\u05DE\u05D9\u05E0\u05DC, \u05E9\u05E2\u05E8 \u05D5\u05E2\u05D9\u05DB\u05D5\u05D1\u05D9\u05DD \u2014 \u05D4\u05D5\u05E1\u05D9\u05E4\u05D5 \u05DE\u05E4\u05EA\u05D7 API:</div>
        <div class="flight-api-row">
          <input type="text" class="expense-input" id="flightApiKeyInput" placeholder="Airlabs API Key" dir="ltr" style="flex:1">
          <button class="expense-add-btn" data-action="saveFlightApiKey" style="width:auto;padding:8px 14px;font-size:0.8rem">\u05E9\u05DE\u05D5\u05E8</button>
        </div>
        <a href="https://airlabs.co/" target="_blank" rel="noopener" class="flight-api-link">\u05E7\u05D1\u05DC\u05D5 \u05DE\u05E4\u05EA\u05D7 \u05D7\u05D9\u05E0\u05DE\u05D9 \u05D1-airlabs.co \u2192</a>
      </div>
    `;
    return;
  }

  try {
    const iata = flightNumber.replace(/\s/g, '');

    // Try real-time flight endpoint first
    const r = await fetch(`https://airlabs.co/api/v9/flight?api_key=${encodeURIComponent(apiKey)}&flight_iata=${encodeURIComponent(iata)}`);
    if (!r.ok) throw new Error('API error');
    const data = await r.json();

    if (data.response && Object.keys(data.response).length > 0) {
      liveSection.innerHTML = renderLiveData(data.response);
      return;
    }

    // Fallback: schedules endpoint
    const r2 = await fetch(`https://airlabs.co/api/v9/schedules?api_key=${encodeURIComponent(apiKey)}&flight_iata=${encodeURIComponent(iata)}`);
    if (!r2.ok) throw new Error('Schedule API error');
    const data2 = await r2.json();

    if (data2.response && data2.response.length > 0) {
      liveSection.innerHTML = renderLiveData(data2.response[0]);
    } else {
      liveSection.innerHTML = '<div class="flight-live-unavailable">\u05D0\u05D9\u05DF \u05DE\u05D9\u05D3\u05E2 \u05D7\u05D9 \u05D6\u05DE\u05D9\u05DF \u05DB\u05E8\u05D2\u05E2 \u2014 \u05D4\u05E9\u05EA\u05DE\u05E9\u05D5 \u05D1\u05DC\u05D9\u05E0\u05E7\u05D9\u05DD \u05DC\u05DE\u05D8\u05D4</div>';
    }
  } catch {
    liveSection.innerHTML = '<div class="flight-live-unavailable">\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05D8\u05E2\u05D5\u05DF \u05DE\u05D9\u05D3\u05E2 \u05D7\u05D9 \u2014 \u05D4\u05E9\u05EA\u05DE\u05E9\u05D5 \u05D1\u05DC\u05D9\u05E0\u05E7\u05D9\u05DD \u05DC\u05DE\u05D8\u05D4</div>';
  }
}

function renderLiveData(f) {
  const statusMap = {
    scheduled: '\u05DE\u05EA\u05D5\u05DB\u05E0\u05DF',
    active: '\u05D1\u05D0\u05D5\u05D5\u05D9\u05E8 \u2708\uFE0F',
    landed: '\u05E0\u05D7\u05EA \u2705',
    cancelled: '\u05D1\u05D5\u05D8\u05DC \u274C',
    diverted: '\u05D4\u05D5\u05E1\u05D8 \u26A0\uFE0F',
    en_route: '\u05D1\u05D3\u05E8\u05DA \u2708\uFE0F',
  };

  let html = '<div class="flight-live-data">';

  if (f.status) {
    const statusText = statusMap[f.status] || f.status;
    const isDelayed = f.delayed && f.delayed > 0;
    const statusClass = f.status === 'cancelled' ? 'cancelled' :
                        isDelayed ? 'delayed' :
                        (f.status === 'active' || f.status === 'en_route') ? 'active' : 'scheduled';
    html += `<div class="flight-status-row">`;
    html += `<span class="flight-status-badge flight-status-${statusClass}">${statusText}</span>`;
    if (isDelayed) html += `<span class="flight-delay-badge">\u05E2\u05D9\u05DB\u05D5\u05D1 ${f.delayed} \u05D3\u05E7\u05F3</span>`;
    html += '</div>';
  }

  html += '<div class="flight-live-grid">';

  const items = [];
  if (f.dep_terminal) items.push(['\u05D8\u05E8\u05DE\u05D9\u05E0\u05DC \u05D4\u05DE\u05E8\u05D0\u05D4', f.dep_terminal]);
  if (f.dep_gate) items.push(['\u05E9\u05E2\u05E8 \u05D4\u05DE\u05E8\u05D0\u05D4', f.dep_gate]);
  if (f.arr_terminal) items.push(['\u05D8\u05E8\u05DE\u05D9\u05E0\u05DC \u05E0\u05D7\u05D9\u05EA\u05D4', f.arr_terminal]);
  if (f.arr_gate) items.push(['\u05E9\u05E2\u05E8 \u05E0\u05D7\u05D9\u05EA\u05D4', f.arr_gate]);
  if (f.dep_time) {
    try {
      items.push(['\u05D4\u05DE\u05E8\u05D0\u05D4 \u05D1\u05E4\u05D5\u05E2\u05DC', new Date(f.dep_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })]);
    } catch { /* skip */ }
  }
  if (f.arr_time) {
    try {
      items.push(['\u05E0\u05D7\u05D9\u05EA\u05D4 \u05D1\u05E4\u05D5\u05E2\u05DC', new Date(f.arr_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })]);
    } catch { /* skip */ }
  }
  if (f.delayed && f.delayed > 0) items.push(['\u05E2\u05D9\u05DB\u05D5\u05D1', `${f.delayed} \u05D3\u05E7\u05F3`]);
  if (f.duration) items.push(['\u05DE\u05E9\u05DA \u05D8\u05D9\u05E1\u05D4', `${f.duration} \u05D3\u05E7\u05F3`]);

  items.forEach(([label, value]) => {
    html += `<div class="flight-live-item"><div class="flight-live-label">${label}</div><div class="flight-live-value">${value}</div></div>`;
  });

  html += '</div></div>';
  return html;
}

export function initFlightModule() {
  registerActions({
    openFlightDetail: ({ flightIdx }) => showFlightDetail(parseInt(flightIdx, 10)),
    closeFlightDetail: () => closeFlightDetail(),
    saveFlightApiKey: () => {
      const input = document.getElementById('flightApiKeyInput');
      if (input && input.value.trim()) {
        localStorage.setItem('flightApiKey', input.value.trim());
        showShareToast('\u05DE\u05E4\u05EA\u05D7 API \u05E0\u05E9\u05DE\u05E8!');
        closeFlightDetail();
      }
    },
  });
}
