# Drag and Drop Activities Between Days

**Date:** 2026-02-16
**Status:** Approved

## Summary

Add drag-and-drop support to move activities between days and reorder within a day. Changes are persistent (localStorage). A toast-style single undo appears after each action.

## Data Persistence

Original `TRIP_DATA.days` remains untouched as the default source of truth.

A new localStorage key `trip_activity_overrides` stores the current arrangement:

```json
{
  "2026-02-20": [
    { "originalDay": "2026-02-20", "index": 0 },
    { "originalDay": "2026-02-20", "index": 2 },
    { "originalDay": "2026-02-21", "index": 3 }
  ]
}
```

Each entry references an activity by its source day and original index in `TRIP_DATA`. Days without overrides fall back to the default.

A `getActivitiesForDay(date)` function resolves overrides, used by all rendering code instead of reading `day.activities` directly.

The key is added to `DATA_KEYS` for export/import backup support.

## Drag Interaction

### Trigger
- **Long-press (500ms)** on an activity item starts drag mode
- Works with both touch and mouse (mousedown + timeout)

### Visual Feedback
- Activity gets a "lifted" state: slight scale, shadow, reduced opacity at original position
- A drag ghost (DOM clone) follows the finger/cursor
- Body scrolling is disabled during drag
- Haptic vibration on mobile (`navigator.vibrate`) if available

### Reorder Within a Day
- As the ghost moves over other activities, they animate apart to show the drop position (gap/indicator line)
- Dropping places the activity at that position

### Move to Another Day
- Day pills in the header become drop zones during drag
- Hovering over a pill highlights/pulses it
- Dropping on a pill moves the activity to the end of that day's list

### Cancel
- Dragging back to original position or tapping elsewhere cancels
- Activity animates back to original position

## Undo

After each drop, a toast appears at the bottom for 5 seconds:
- Hebrew text describing the action (e.g., "הועבר ליום 3" or "סדר עודכן")
- An "ביטול" (undo) button
- Clicking undo restores the previous override state from a single `lastOverrideState` variable
- Toast auto-dismisses after 5 seconds

## File Structure

### New file: `drag.js`
All drag-and-drop logic:
- `getActivitiesForDay(date)` — resolve overrides or fall back to TRIP_DATA
- `saveActivityOverrides(overrides)` — persist to localStorage
- `initDragAndDrop()` — attach long-press listeners to `.activity-item`, set up drop zones on `.day-pill`
- `handleDrop(sourceDayDate, sourceIndex, targetDayDate, targetIndex)` — update overrides, save, re-render, show undo toast

### CSS additions in `style.css`
- `.activity-item.dragging` — lifted appearance
- `.activity-item.drag-over` — gap indicator
- `.day-pill.drop-target` — highlighted during drag
- `.drag-ghost` — floating clone
- `.undo-toast` — bottom toast with undo button

### Integration in `app.js`
- `renderActivities()` calls `getActivitiesForDay()` instead of `day.activities`
- After each `renderDay()`, call `initDragAndDrop()`
- `DATA_KEYS` gets `trip_activity_overrides`
- Summary chip count reflects overridden list

### No changes to `trip-data.js`
