// === Share / Export ===

import { formatDate, showShareToast } from './utils.js';
import { registerActions } from './actions.js';

/**
 * Generates a plain-text summary of the trip itinerary.
 * @param {import('./trip-data.js').TripDay[]} days - Trip days array
 * @returns {string} Formatted text summary
 */
function generateShareText(days) {
  let text = `${TRIP_DATA.title}\n`;
  text += `${TRIP_DATA.travelers.join(' & ')}\n`;
  text += '━'.repeat(30) + '\n\n';

  days.forEach((day, i) => {
    text += `יום ${i + 1} — ${day.dayOfWeek} ${formatDate(day.date)}\n`;
    text += `${day.label}\n`;

    if (day.flights && day.flights.length > 0) {
      day.flights.forEach(f => {
        text += `  ✈️ ${f.airline || ''}: ${f.from} ${f.fromTime} → ${f.to} ${f.toTime}\n`;
      });
    }

    if (day.hotel) {
      text += `  🏨 ${day.hotel.name} (${day.hotel.cost})\n`;
    }

    if (day.activities && day.activities.length > 0) {
      day.activities.forEach(a => {
        text += `  ${a.icon || '📍'} ${a.title}${a.time ? ' (' + a.time + ')' : ''}\n`;
      });
    }

    text += '\n';
  });

  return text;
}

/**
 * Generates an HTML version of the trip itinerary for printing/sharing.
 * @param {import('./trip-data.js').TripDay[]} days - Trip days array
 * @param {Object<string, string>} segmentColors - Segment ID to color map
 * @param {Object<string, string>} segmentNames - Segment ID to name map
 * @returns {string} HTML string
 */
function generateShareHTML(days, segmentColors, segmentNames) {
  let html = `
    <div style="direction:rtl;text-align:right;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#FFF8F0;color:#2D2D2D;">
      <h1 style="text-align:center;font-size:1.5rem;margin-bottom:4px;">${TRIP_DATA.title}</h1>
      <p style="text-align:center;color:#6B6B6B;margin-bottom:20px;">${TRIP_DATA.travelers.join(' & ')} · ${formatDate(days[0].date)}–${formatDate(days[days.length-1].date)}</p>
  `;

  days.forEach((day, i) => {
    const color = segmentColors[day.segment];
    html += `
      <div style="margin-bottom:16px;border-radius:12px;overflow:hidden;background:#fff;box-shadow:0 1px 6px rgba(0,0,0,0.08);">
        <div style="background:${color};color:#fff;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <strong>יום ${i + 1} — ${day.dayOfWeek} ${formatDate(day.date)}</strong>
            <div style="font-size:0.85rem;opacity:0.9;">${day.label}</div>
          </div>
          <span style="font-size:0.8rem;">${segmentNames[day.segment]}</span>
        </div>
        <div style="padding:12px 16px;font-size:0.88rem;">
    `;

    if (day.flights && day.flights.length > 0) {
      day.flights.forEach(f => {
        html += `<div style="margin-bottom:6px;">✈️ <strong>${f.airline || ''}</strong>: ${f.from} ${f.fromTime} → ${f.to} ${f.toTime}${f.note ? ' <span style="color:#6B6B6B;">(' + f.note + ')</span>' : ''}</div>`;
      });
    }

    if (day.hotel) {
      html += `<div style="margin-bottom:6px;">🏨 ${day.hotel.name} · ${day.hotel.room} · ${day.hotel.cost}</div>`;
    }

    if (day.activities && day.activities.length > 0) {
      day.activities.forEach(a => {
        if (a.section) {
          html += `<div style="font-size:0.75rem;font-weight:700;color:#6B6B6B;text-transform:uppercase;margin-top:8px;padding-top:6px;border-top:1px dashed #ddd;">${a.section}</div>`;
        }
        html += `<div style="margin-bottom:4px;">${a.icon || '📍'} ${a.title}${a.time ? ' <span style="color:#6B6B6B;">(' + a.time + ')</span>' : ''}${a.note ? ' <span style="color:#6B6B6B;">— ' + a.note + '</span>' : ''}</div>`;
      });
    }

    if (day.notes && day.notes.length > 0) {
      html += `<div style="margin-top:8px;padding:8px 10px;background:#FFF9E6;border-radius:8px;border-right:3px solid ${color};font-size:0.82rem;">`;
      day.notes.forEach(n => { html += `<div>• ${n}</div>`; });
      html += `</div>`;
    }

    html += `</div></div>`;
  });

  html += `</div>`;
  return html;
}

function openPrintView(days, segmentColors, segmentNames) {
  const html = generateShareHTML(days, segmentColors, segmentNames);
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    copyToClipboardInner(days);
    return;
  }

  printWindow.document.write(`<!DOCTYPE html>
    <html lang="he" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${TRIP_DATA.title}</title>
      <style>
        body { margin: 0; padding: 0; background: #FFF8F0; }
        @media print {
          body { background: #fff; }
          .no-print { display: none !important; }
          @page { margin: 12mm; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="text-align:center;padding:12px;background:#fff;border-bottom:1px solid #eee;direction:rtl;">
        <button onclick="window.print()" style="padding:8px 20px;border-radius:8px;border:none;background:#D4A853;color:#fff;font-weight:600;cursor:pointer;font-size:0.9rem;">הדפסה / PDF</button>
        <button onclick="window.close()" style="padding:8px 20px;border-radius:8px;border:1px solid #ddd;background:#fff;cursor:pointer;font-size:0.9rem;margin-right:8px;">סגור</button>
      </div>
      ${html}
    </body>
    </html>`);
  printWindow.document.close();
}

async function copyToClipboardInner(days) {
  const text = generateShareText(days);
  try {
    await navigator.clipboard.writeText(text);
    showShareToast('הועתק ללוח!');
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showShareToast('הועתק ללוח!');
  }
}

/**
 * Initializes window-level event bindings for share/export functionality.
 * @param {() => import('./expenses.js').CoreContext} getCtx - Getter returning the core context
 * @returns {void}
 */
export function initShareBindings(getCtx) {
  registerActions({
    shareTrip: async () => {
      const { days, segmentColors, segmentNames } = getCtx();
      const shareText = generateShareText(days);

      if (navigator.share) {
        try {
          await navigator.share({
            title: TRIP_DATA.title,
            text: shareText,
          });
          return;
        } catch (e) {
          if (e.name === 'AbortError') return;
        }
      }

      openPrintView(days, segmentColors, segmentNames);
    },

    copyToClipboard: async () => {
      const { days } = getCtx();
      await copyToClipboardInner(days);
    },
  });
}
