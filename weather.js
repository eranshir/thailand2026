// === Weather Forecast ===

import { showShareToast, safeSetItem, WEATHER_CACHE_KEY } from './utils.js';
import { registerActions } from './actions.js';

/**
 * @typedef {Object} WeatherData
 * @property {number} tempMax - Maximum temperature in °C
 * @property {number} tempMin - Minimum temperature in °C
 * @property {number} humidity - Relative humidity percentage
 * @property {number} rainProb - Precipitation probability percentage
 * @property {number} code - WMO weather code
 */

/**
 * @typedef {Object} WeatherLocation
 * @property {number} lat - Latitude
 * @property {number} lon - Longitude
 * @property {string} name - Hebrew location name
 */

/** @type {Object<string, WeatherLocation>} */
const WEATHER_LOCATIONS = {
  'phuket-arrival': { lat: 7.88, lon: 98.39, name: 'פוקט' },
  'krabi':          { lat: 8.09, lon: 98.91, name: 'קראבי' },
  'singapore':      { lat: 1.35, lon: 103.82, name: 'סינגפור' },
  'phuket-return':  { lat: 7.88, lon: 98.39, name: 'פוקט' },
};

const WEATHER_CACHE_TTL = 3 * 60 * 60 * 1000;

function getWeatherCache() {
  try { return JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY)) || {}; }
  catch { return {}; }
}

function saveWeatherCache(c) {
  safeSetItem(WEATHER_CACHE_KEY, JSON.stringify(c));
}

function getWeatherForDate(date, seg) {
  const c = getWeatherCache();
  return (c[seg + '_' + date] && c.fetchedAt) ? c[seg + '_' + date] : null;
}

function getWeatherLastUpdated() {
  return getWeatherCache().fetchedAt || null;
}

function isWeatherStale() {
  const c = getWeatherCache();
  return !c.fetchedAt || Date.now() - c.fetchedAt > WEATHER_CACHE_TTL;
}

async function fetchWeatherForLocation(lat, lon) {
  // Use current date range: from today up to 16 days ahead (Open-Meteo max forecast range)
  const today = new Date();
  const start = new Date(Math.max(today.getTime(), new Date('2026-02-20').getTime()));
  const end = new Date('2026-03-07');
  const startStr = start.toISOString().split('T')[0];
  const endStr = end.toISOString().split('T')[0];
  const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&timezone=auto&start_date=${startStr}&end_date=${endStr}`);
  if (!r.ok) throw new Error('Weather fetch failed');
  return r.json();
}

/**
 * Fetches weather forecasts for all locations and caches the results.
 * @param {boolean} force - Whether to bypass cache staleness check
 * @param {(() => void)|undefined} onUpdate - Callback to invoke after successful fetch
 * @returns {Promise<void>}
 */
export async function fetchAllWeather(force, onUpdate) {
  if (!force && !isWeatherStale()) return;
  const cache = { fetchedAt: Date.now() };
  const fetched = {};
  const uniq = [];
  const seen = new Set();
  for (const [sid, loc] of Object.entries(WEATHER_LOCATIONS)) {
    const k = loc.lat + ',' + loc.lon;
    if (!seen.has(k)) { seen.add(k); uniq.push({ sid, loc, key: k }); }
  }
  try {
    const results = await Promise.all(uniq.map(u => fetchWeatherForLocation(u.loc.lat, u.loc.lon)));
    uniq.forEach((u, i) => { fetched[u.key] = results[i]; });
    for (const [sid, loc] of Object.entries(WEATHER_LOCATIONS)) {
      const data = fetched[loc.lat + ',' + loc.lon];
      if (!data || !data.daily) continue;
      const weatherCodes = data.daily.weather_code || data.daily.weathercode || [];
      data.daily.time.forEach((d, i) => {
        cache[sid + '_' + d] = {
          tempMax: Math.round(data.daily.temperature_2m_max[i]),
          tempMin: Math.round(data.daily.temperature_2m_min[i]),
          humidity: 0,
          rainProb: data.daily.precipitation_probability_max[i] || 0,
          code: weatherCodes[i] || 0,
        };
      });
    }
    saveWeatherCache(cache);
    if (onUpdate) onUpdate();
  } catch (e) { /* offline or API down — use cache */ }
}

function weatherCodeToIcon(code) {
  if (code === 0) return '☀️';
  if (code <= 3) return '⛅';
  if (code <= 48) return '🌫️';
  if (code <= 57) return '🌦️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '🌨️';
  if (code <= 82) return '🌧️';
  if (code <= 86) return '🌨️';
  if (code >= 95) return '⛈️';
  return '🌤️';
}

function getTimeAgo(ts) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return 'עכשיו';
  if (m < 60) return `לפני ${m} דק׳`;
  const h = Math.floor(m / 60);
  if (h < 24) return `לפני ${h} שע׳`;
  return `לפני ${Math.floor(h / 24)} ימים`;
}

/**
 * Renders the weather widget HTML for a specific day and segment.
 * @param {string} date - Date string (YYYY-MM-DD)
 * @param {string} segment - Segment identifier
 * @returns {string} HTML string for the weather widget
 */
export function renderWeatherWidget(date, segment) {
  const w = getWeatherForDate(date, segment);
  const lu = getWeatherLastUpdated();
  const loc = WEATHER_LOCATIONS[segment];
  let h = `<div class="weather-widget"><div class="weather-header"><span class="weather-title">🌤️ מזג אוויר — ${loc ? loc.name : ''}</span><button class="weather-refresh-btn" data-action="refreshWeather" title="רענן">↻</button></div>`;
  if (w) {
    h += `<div class="weather-data"><div class="weather-temp"><span class="weather-icon">${weatherCodeToIcon(w.code)}</span><span class="weather-temp-range">${w.tempMin}\u00B0\u2013${w.tempMax}\u00B0C</span></div><div class="weather-detail"><span>\uD83C\uDF27\uFE0F \u05D2\u05E9\u05DD ${w.rainProb}%</span></div></div>`;
  } else {
    h += `<div class="weather-no-data">אין נתונים — לחצו ↻ לרענן</div>`;
  }
  if (lu) h += `<div class="weather-updated">עודכן ${getTimeAgo(lu)}</div>`;
  h += `</div>`;
  return h;
}

import { subscribe, publish } from './event-bus.js';

export function initWeatherModule() {
  subscribe('appInitialized', () => {
    fetchAllWeather(false, () => {
      publish('renderRequested', { type: 'day' });
    });
  });

  registerActions({
    refreshWeather: () => {
      fetchAllWeather(true, () => {
        publish('renderRequested', { type: 'day' });
      });
      showShareToast('מעדכן מזג אוויר...');
    },
  });
}
