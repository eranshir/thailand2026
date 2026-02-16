// === Centralized Event Delegation ===

const actionHandlers = {};

export function registerAction(name, handler) {
  actionHandlers[name] = handler;
}

export function registerActions(map) {
  Object.assign(actionHandlers, map);
}

function findActionTarget(element, skipFormElements) {
  let el = element;
  while (el && el !== document.body) {
    if (el.dataset && el.dataset.action) {
      // Skip form elements in click handler — they use change delegation instead
      if (skipFormElements && (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA')) {
        el = el.parentElement;
        continue;
      }
      return el;
    }
    el = el.parentElement;
  }
  return null;
}

const RESERVED_KEYS = new Set(['action', 'enterAction', 'inputAction', 'blurAction']);

function getActionArgs(el) {
  const args = {};
  for (const [key, value] of Object.entries(el.dataset)) {
    if (!RESERVED_KEYS.has(key)) args[key] = value;
  }
  return args;
}

function handleAction(event, actionEl) {
  const action = actionEl.dataset.action;
  const handler = actionHandlers[action];
  if (!handler) return;

  handler(getActionArgs(actionEl), event, actionEl);
}

// Click delegation (skips form elements — they use change delegation)
document.body.addEventListener('click', (e) => {
  const actionEl = findActionTarget(e.target, true);
  if (actionEl) {
    handleAction(e, actionEl);
  }
});

// Change delegation (for inputs/selects with data-action)
document.body.addEventListener('change', (e) => {
  const el = e.target;
  if (el.dataset && el.dataset.action) {
    const handler = actionHandlers[el.dataset.action];
    if (handler) {
      handler(getActionArgs(el), e, el);
    }
  }
});

// Keydown delegation (for Enter key on inputs with data-enter-action)
document.body.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const el = e.target;
    if (el.dataset && el.dataset.enterAction) {
      const handler = actionHandlers[el.dataset.enterAction];
      if (handler) {
        handler(getActionArgs(el), e, el);
      }
    }
  }
});

// Input delegation (for oninput handlers with data-input-action)
document.body.addEventListener('input', (e) => {
  const el = e.target;
  if (el.dataset && el.dataset.inputAction) {
    const handler = actionHandlers[el.dataset.inputAction];
    if (handler) {
      handler(getActionArgs(el), e, el);
    }
  }
});

// Blur delegation (for onblur handlers with data-blur-action)
document.body.addEventListener('blur', (e) => {
  const el = e.target;
  if (el.dataset && el.dataset.blurAction) {
    const handler = actionHandlers[el.dataset.blurAction];
    if (handler) {
      handler(getActionArgs(el), e, el);
    }
  }
}, true); // blur doesn't bubble, use capture
