# Thailand & Singapore 2026 - Trip PWA Design

## Overview

Offline-friendly PWA trip planner for a 16-day trip (Feb 20 - Mar 7, 2026) covering Phuket, Krabi, Singapore, and back to Phuket. Hebrew RTL interface, installable on iPhone via Safari.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Navigation | Day-by-day timeline | Most natural for on-the-ground use |
| Tech stack | Vanilla HTML/CSS/JS | No build step, trivial offline, instant deploy |
| Visual style | Warm tropical minimal | Readable in sunlight, premium feel |
| Language | Hebrew RTL | Primary users are Hebrew speakers |
| Data format | Single JS object | Easy to edit, one file for everything |
| Hosting | GitHub Pages | Free, simple, one-click deploy |

## File Structure

```
thailand2026/
├── index.html          # Single-page app
├── style.css           # RTL Hebrew styles, tropical theme
├── app.js              # App logic, rendering, navigation
├── trip-data.js        # All trip data as JS object
├── sw.js               # Service worker for offline
├── manifest.json       # PWA manifest
├── icons/              # App icons (192x192, 512x512)
└── assets/             # QR codes, boarding passes (later)
```

## UI Design

### Layout
- Fixed header: trip title + current location context
- Sticky day-picker strip: horizontally scrollable date pills, color-coded by segment
- Scrollable day content area with cards

### Color Palette
- Background: #FFF8F0 (cream)
- Text: #2D2D2D
- Phuket arrival: #D4A853 (gold)
- Krabi: #5B8C5A (green)
- Singapore: #E76F51 (coral)
- Phuket return: #2A9D8F (teal)

### Day Card Contents
1. Date & location banner
2. Flight card (boarding pass style)
3. Hotel card with booking link
4. Activities timeline with icons
5. Notes section
6. Documents slot (QR codes, passes)

## Data Structure

See `trip-data.js` - single `TRIP_DATA` object with:
- `segments[]` - destination color coding
- `days[]` - each day contains flights, hotel, activities, notes, documents
- Activities support: time, duration, location (lat/lng), icon, notes

## Offline Strategy

- Service worker caches all files on first visit (cache-first)
- No API calls - all data in trip-data.js
- Version bump in sw.js triggers cache refresh
- Apple-specific meta tags for iPhone PWA support

## Future Additions

- **QR codes/boarding passes**: images in assets/, referenced in documents[]
- **Notifications**: Notification API + permission request
- **Hour-by-hour planning**: fill in granular activities with sunrise/sunset data
- **Map integration**: lat/lng in activity data, embed map view
